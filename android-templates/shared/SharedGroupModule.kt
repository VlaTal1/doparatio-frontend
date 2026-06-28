package com.doparatio.app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class SharedGroupModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SharedGroup"
    }

    @ReactMethod
    fun setString(key: String, value: String, suiteName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(suiteName, Context.MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
            
            // Reload android widgets immediately when data changes
            reloadWidgets(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun getString(key: String, suiteName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(suiteName, Context.MODE_PRIVATE)
            val value = prefs.getString(key, "") ?: ""
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun reloadAllTimelines(promise: Promise) {
        try {
            val context = reactApplicationContext
            reloadWidgets(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun isBlockerEnabled(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
            val isEnabled = prefs.getBoolean("app_blocker_enabled", false)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun setBlockerEnabled(enabled: Boolean, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("app_blocker_enabled", enabled).apply()

            val serviceIntent = Intent(context, AppBlockerService::class.java)
            if (enabled) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } else {
                context.stopService(serviceIntent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun hasUsageStatsPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.noteOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            promise.resolve(mode == android.app.AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun requestUsageStatsPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(android.provider.Settings.canDrawOverlays(context))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FAIL", e.message, e)
        }
    }

    private fun reloadWidgets(context: Context) {
        val intent = Intent(context, HabitWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val ids = appWidgetManager.getAppWidgetIds(
            ComponentName(context, HabitWidgetProvider::class.java)
        )
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}
