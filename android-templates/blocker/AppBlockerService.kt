package com.doparatio.app

import android.app.*
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class AppBlockerService : Service() {

    private val CHANNEL_ID = "AppBlockerServiceChannel"
    private val NOTIFICATION_ID = 9912

    private val monitoringHandler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    private var accumulatedSeconds = 0
    private var lastActiveApp: String? = null

    private val DEFAULT_BLOCKED_PACKAGES = setOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically",
        "com.google.android.youtube",
        "com.facebook.katana",
        "com.twitter.android",
        "com.twitter.android.lite",
        "com.snapchat.android",
        "com.reddit.frontpage",
        "com.netflix.mediaclient"
    )

    private val monitorRunnable = object : Runnable {
        override fun run() {
            checkForegroundApp()
            monitoringHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate() {
        super.onCreate()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notificationIntent = Intent(this, MainActivity::class.java)
        
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, pendingIntentFlags
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val notification = builder
            .setContentTitle("Doparatio Блокировщик")
            .setContentText("Мониторинг использования приложений...")
            .setSmallIcon(android.R.drawable.ic_secure)
            .setContentIntent(pendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        startMonitoring()

        return START_STICKY
    }

    override fun onDestroy() {
        stopMonitoring()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun startMonitoring() {
        monitoringHandler.removeCallbacks(monitorRunnable)
        monitoringHandler.post(monitorRunnable)
    }

    private fun stopMonitoring() {
        monitoringHandler.removeCallbacks(monitorRunnable)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "App Blocker Service Channel",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Runs background monitoring for blocked apps"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun getForegroundPackageName(): String? {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 10000 // 10 seconds ago
        val usageStatsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
        if (usageStatsList.isNullOrEmpty()) return null

        var recentStats: UsageStats? = null
        for (stats in usageStatsList) {
            if (recentStats == null || stats.lastTimeUsed > recentStats.lastTimeUsed) {
                recentStats = stats
            }
        }
        return recentStats?.packageName
    }

    private fun checkForegroundApp() {
        val currentApp = getForegroundPackageName() ?: return
        if (currentApp == packageName) {
            lastActiveApp = null
            return
        }

        val prefs = getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("app_blocker_enabled", false)
        if (!isEnabled) {
            accumulatedSeconds = 0
            lastActiveApp = null
            return
        }

        val blockedApps = prefs.getStringSet("blocked_packages", DEFAULT_BLOCKED_PACKAGES) ?: DEFAULT_BLOCKED_PACKAGES

        if (blockedApps.contains(currentApp)) {
            val balanceStr = prefs.getString("time_balance", "0") ?: "0"
            var balance = balanceStr.toIntOrNull() ?: 0

            if (balance <= 0) {
                accumulatedSeconds = 0
                lastActiveApp = null
                
                // Show blocking screen
                val lockIntent = Intent(this, LockActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    putExtra("blocked_package", currentApp)
                }
                startActivity(lockIntent)
            } else {
                // User is in a blocked app, increment elapsed seconds (without resetting if switching/entering)
                accumulatedSeconds++
                lastActiveApp = currentApp
                
                if (accumulatedSeconds >= 10) {
                    // Subtract 10 seconds
                    balance = Math.max(0, balance - 10)
                    prefs.edit().putString("time_balance", balance.toString()).apply()
                    accumulatedSeconds = 0
                    
                    // Sync subtraction with the server
                    syncSubtractSeconds(10)
                }
            }
        } else {
            // User is not in a blocked app, we pause the counter (do not reset accumulatedSeconds to 0)
            lastActiveApp = null
        }
    }

    private fun syncSubtractSeconds(seconds: Int) {
        executor.execute {
            val prefs = getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
            val apiUrl = prefs.getString("api_url", "http://localhost:8080") ?: "http://localhost:8080"
            val token = prefs.getString("auth_token", "") ?: ""
            if (token.isEmpty()) return@execute

            var connection: HttpURLConnection? = null
            try {
                val url = URL("$apiUrl/api/balance/subtract?seconds=$seconds")
                connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val stream = connection.inputStream
                    val reader = BufferedReader(InputStreamReader(stream))
                    val response = reader.use { it.readText() }
                    
                    val obj = JSONObject(response)
                    val newBalance = obj.optInt("balance", -1)
                    if (newBalance != -1) {
                        prefs.edit().putString("time_balance", newBalance.toString()).apply()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                connection?.disconnect()
            }
        }
    }
}
