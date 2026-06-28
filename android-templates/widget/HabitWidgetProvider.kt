package com.doparatio.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors

class HeatmapCell(
    val dateStr: String,
    val progress: Double,
    val isToday: Boolean,
    val isFuture: Boolean
)

class HabitDTO(
    val id: Int,
    val name: String,
    val icon: String,
    val color: String,
    val logType: String,
    val targetValue: Int,
    val logs: List<HabitLogDTO>
)

class HabitLogDTO(
    val id: Int?,
    val logDate: String,
    val currentValue: Int?
)

class HabitWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
        val edit = prefs.edit()
        for (appWidgetId in appWidgetIds) {
            edit.remove("widget_habit_id_$appWidgetId")
        }
        edit.apply()
    }

    companion object {
        private val executor = Executors.newSingleThreadExecutor()
        private val mainHandler = Handler(Looper.getMainLooper())

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            executor.execute {
                val prefs = context.getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
                
                var habitId = prefs.getString("widget_habit_id_$appWidgetId", null)
                if (habitId == null) {
                    habitId = prefs.getString("widget_habit_id", null)
                }
                
                val apiUrl = prefs.getString("api_url", "http://localhost:8080") ?: "http://localhost:8080"
                val token = prefs.getString("auth_token", "") ?: ""
                
                val views = RemoteViews(context.packageName, R.layout.habit_widget_layout)
                val isNightMode = (context.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES

                if (habitId.isNullOrEmpty() || token.isEmpty()) {
                    mainHandler.post {
                        views.setViewVisibility(R.id.widget_placeholder_container, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_habit_container, View.GONE)
                        views.setTextViewText(R.id.widget_placeholder_subtitle, "Tap widget to choose a habit to display")
                        
                        val titleColor = if (isNightMode) Color.WHITE else Color.parseColor("#111827")
                        val subtitleColor = if (isNightMode) Color.parseColor("#8A9F95") else Color.parseColor("#4B5563")
                        views.setTextColor(R.id.widget_placeholder_title, titleColor)
                        views.setTextColor(R.id.widget_placeholder_subtitle, subtitleColor)

                        // Open config activity when tapped
                        val intent = Intent(context, HabitWidgetConfigureActivity::class.java).apply {
                            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                        }
                        val pendingIntent = PendingIntent.getActivity(
                            context,
                            appWidgetId,
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(R.id.widget_placeholder_container, pendingIntent)
                        
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                    return@execute
                }
                
                val habit = fetchHabit(apiUrl, token, habitId)
                
                mainHandler.post {
                    if (habit != null) {
                        views.setViewVisibility(R.id.widget_placeholder_container, View.GONE)
                        views.setViewVisibility(R.id.widget_habit_container, View.VISIBLE)
                        
                        views.setTextViewText(R.id.widget_habit_name, habit.name)
                        
                        val nameColor = if (isNightMode) Color.WHITE else Color.parseColor("#111827")
                        val streakColor = Color.parseColor("#F97316") // Vibrant orange
                        views.setTextColor(R.id.widget_habit_name, nameColor)
                        views.setTextColor(R.id.widget_habit_streak, streakColor)

                        val streak = calculateStreak(habit.logs)
                        views.setTextViewText(R.id.widget_habit_streak, "🔥 $streak days")
                        
                        // Draw habit icon (emoji with tinted background)
                        val iconBitmap = drawIcon(habit.icon, habit.color)
                        views.setImageViewBitmap(R.id.widget_habit_icon, iconBitmap)
                        
                        // Draw heatmap
                        val cells = getHeatmapCells(habit.logs, habit.color, habit.logType, habit.targetValue)
                        val heatmapBitmap = drawHeatmap(context, cells, habit.color)
                        views.setImageViewBitmap(R.id.widget_heatmap_image, heatmapBitmap)
                        
                        // Intent to open deep link doparatio://habit/<id>
                        val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("doparatio://habit/${habit.id}")).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        val pendingIntent = PendingIntent.getActivity(
                            context,
                            appWidgetId,
                            openIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(R.id.widget_habit_container, pendingIntent)
                    } else {
                        views.setViewVisibility(R.id.widget_placeholder_container, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_habit_container, View.GONE)
                        views.setTextViewText(R.id.widget_placeholder_subtitle, "Failed to load habit. Tap to retry.")
                        
                        val titleColor = if (isNightMode) Color.WHITE else Color.parseColor("#111827")
                        val errorColor = Color.parseColor("#EF4444")
                        views.setTextColor(R.id.widget_placeholder_title, titleColor)
                        views.setTextColor(R.id.widget_placeholder_subtitle, errorColor)

                        // Retry loading
                        val intent = Intent(context, HabitWidgetProvider::class.java).apply {
                            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                        }
                        val pendingIntent = PendingIntent.getBroadcast(
                            context,
                            appWidgetId,
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(R.id.widget_placeholder_container, pendingIntent)
                    }
                    
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            }
        }

        private fun fetchHabit(apiUrl: String, token: String, habitId: String): HabitDTO? {
            var connection: HttpURLConnection? = null
            return try {
                val url = URL("$apiUrl/api/habit/$habitId")
                connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val stream = connection.inputStream
                    val reader = BufferedReader(InputStreamReader(stream))
                    val sb = StringBuilder()
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        sb.append(line)
                    }
                    
                    val obj = JSONObject(sb.toString())
                    val id = obj.getInt("id")
                    val name = obj.optString("name", "")
                    val icon = obj.optString("icon", "")
                    val color = obj.optString("color", "E5A93C")
                    val logType = obj.optString("logType", "BINARY")
                    val targetValue = obj.optInt("targetValue", 1)
                    
                    val logsList = ArrayList<HabitLogDTO>()
                    val logsArray = obj.optJSONArray("logs")
                    if (logsArray != null) {
                        for (i in 0 until logsArray.length()) {
                            val logObj = logsArray.getJSONObject(i)
                            val logId = if (logObj.isNull("id")) null else logObj.getInt("id")
                            val logDate = logObj.optString("logDate", "")
                            val currentValue = if (logObj.isNull("currentValue")) null else logObj.getInt("currentValue")
                            logsList.add(HabitLogDTO(logId, logDate, currentValue))
                        }
                    }
                    HabitDTO(id, name, icon, color, logType, targetValue, logsList)
                } else {
                    null
                }
            } catch (e: Exception) {
                e.printStackTrace()
                null
            } finally {
                connection?.disconnect()
            }
        }

        private fun getHeatmapCells(
            logs: List<HabitLogDTO>,
            colorHex: String,
            logType: String,
            targetValue: Int
        ): List<List<HeatmapCell>> {
            val cal = Calendar.getInstance()
            cal.firstDayOfWeek = Calendar.MONDAY
            
            // Rewind to Monday of the current week
            while (cal.get(Calendar.DAY_OF_WEEK) != Calendar.MONDAY) {
                cal.add(Calendar.DAY_OF_YEAR, -1)
            }
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val currentMonday = cal.time

            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val todayCal = Calendar.getInstance()
            todayCal.set(Calendar.HOUR_OF_DAY, 0)
            todayCal.set(Calendar.MINUTE, 0)
            todayCal.set(Calendar.SECOND, 0)
            todayCal.set(Calendar.MILLISECOND, 0)
            val todayDate = todayCal.time

            val numWeeks = 28
            val columns = ArrayList<List<HeatmapCell>>()

            for (w in 0 until numWeeks) {
                val weekCells = ArrayList<HeatmapCell>()
                val offsetWeeks = w - (numWeeks - 1)
                for (d in 0 until 7) {
                    val cellCal = Calendar.getInstance()
                    cellCal.time = currentMonday
                    cellCal.add(Calendar.WEEK_OF_YEAR, offsetWeeks)
                    cellCal.add(Calendar.DAY_OF_YEAR, d)
                    val cellDate = cellCal.time
                    
                    val dateStr = sdf.format(cellDate)
                    val isToday = cellDate.time == todayDate.time
                    val isFuture = cellDate.after(todayDate)
                    
                    var progress = 0.0
                    val log = logs.find { it.logDate == dateStr }
                    if (log != null && !isFuture) {
                        if (logType == "BINARY") {
                            progress = 1.0
                        } else {
                            val target = if (targetValue > 0) targetValue else 1
                            progress = Math.min((log.currentValue ?: 0).toDouble() / target.toDouble(), 1.0)
                        }
                    }
                    
                    weekCells.add(HeatmapCell(dateStr, progress, isToday, isFuture))
                }
                columns.add(weekCells)
            }
            return columns
        }

        private fun calculateStreak(logs: List<HabitLogDTO>): Int {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val completedDates = logs.mapNotNull { log ->
                try {
                    sdf.parse(log.logDate)
                } catch (e: Exception) {
                    null
                }
            }.sorted()

            if (completedDates.isEmpty()) return 0

            var currentStreak = 0
            var lastDate: Date? = null
            val cal1 = Calendar.getInstance()
            val cal2 = Calendar.getInstance()

            for (date in completedDates) {
                if (lastDate != null) {
                    cal1.time = lastDate
                    cal2.time = date
                    
                    cal1.set(Calendar.HOUR_OF_DAY, 0)
                    cal1.set(Calendar.MINUTE, 0)
                    cal1.set(Calendar.SECOND, 0)
                    cal1.set(Calendar.MILLISECOND, 0)
                    
                    cal2.set(Calendar.HOUR_OF_DAY, 0)
                    cal2.set(Calendar.MINUTE, 0)
                    cal2.set(Calendar.SECOND, 0)
                    cal2.set(Calendar.MILLISECOND, 0)
                    
                    val diffMs = cal2.timeInMillis - cal1.timeInMillis
                    val diffDays = diffMs / (1000 * 60 * 60 * 24)
                    
                    if (diffDays == 1L) {
                        currentStreak += 1
                    } else if (diffDays > 1L) {
                        currentStreak = 1
                    }
                } else {
                    currentStreak = 1
                }
                lastDate = date
            }

            if (lastDate != null) {
                val today = Calendar.getInstance()
                today.set(Calendar.HOUR_OF_DAY, 0)
                today.set(Calendar.MINUTE, 0)
                today.set(Calendar.SECOND, 0)
                today.set(Calendar.MILLISECOND, 0)

                cal1.time = lastDate
                cal1.set(Calendar.HOUR_OF_DAY, 0)
                cal1.set(Calendar.MINUTE, 0)
                cal1.set(Calendar.SECOND, 0)
                cal1.set(Calendar.MILLISECOND, 0)

                val diffMs = today.timeInMillis - cal1.timeInMillis
                val diffDays = diffMs / (1000 * 60 * 60 * 24)
                if (diffDays > 1L) {
                    return 0
                }
            }

            return currentStreak
        }

        private fun drawHeatmap(context: Context, columns: List<List<HeatmapCell>>, habitColorStr: String): Bitmap {
            val cellSize = 26f
            val spacing = 3.5f
            val cornerRadius = 4f
            
            val width = (28 * cellSize + 27 * spacing).toInt()
            val height = (7 * cellSize + 6 * spacing).toInt()
            
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.TRANSPARENT)
            
            val habitColor = try {
                Color.parseColor("#$habitColorStr")
            } catch (e: Exception) {
                Color.parseColor("#E5A93C")
            }
            
            val emptyColor = context.getColor(R.color.widget_empty_cell_color)
            val isNightMode = (context.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
            
            val orangeBorderPaint = Paint().apply {
                color = Color.parseColor(if (isNightMode) "#FF9800" else "#F97316")
                style = Paint.Style.STROKE
                strokeWidth = 2.5f
                isAntiAlias = true
            }
            
            val fillPaint = Paint().apply {
                style = Paint.Style.FILL
                isAntiAlias = true
            }
            
            for (w in 0 until 28) {
                val week = columns[w]
                val x = w * (cellSize + spacing)
                for (d in 0 until 7) {
                    val cell = week[d]
                    if (cell.isFuture) {
                        continue
                    }
                    
                    val y = d * (cellSize + spacing)
                    
                    if (cell.progress > 0) {
                        val alpha = (0.15 + 0.85 * cell.progress) * 255
                        fillPaint.color = habitColor
                        fillPaint.alpha = alpha.toInt()
                    } else {
                        fillPaint.color = emptyColor
                        fillPaint.alpha = 255
                    }
                    
                    val rect = RectF(x, y, x + cellSize, y + cellSize)
                    canvas.drawRoundRect(rect, cornerRadius, cornerRadius, fillPaint)
                    
                    if (cell.isToday) {
                        canvas.drawRoundRect(rect, cornerRadius, cornerRadius, orangeBorderPaint)
                    }
                }
            }
            
            return bitmap
        }

        private fun drawIcon(emoji: String, colorHex: String): Bitmap {
            val size = 120
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            
            val color = try {
                Color.parseColor("#$colorHex")
            } catch (e: Exception) {
                Color.parseColor("#E5A93C")
            }
            
            val bgPaint = Paint().apply {
                this.color = color
                alpha = (0.15 * 255).toInt()
                style = Paint.Style.FILL
                isAntiAlias = true
            }
            val rect = RectF(0f, 0f, size.toFloat(), size.toFloat())
            val cornerRadius = 30f
            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, bgPaint)
            
            val textPaint = Paint().apply {
                textSize = 56f
                isAntiAlias = true
                textAlign = Paint.Align.CENTER
            }
            
            val fontMetrics = textPaint.fontMetrics
            val y = (size / 2) - (fontMetrics.ascent + fontMetrics.descent) / 2
            canvas.drawText(emoji, (size / 2).toFloat(), y, textPaint)
            
            return bitmap
        }
    }
}
