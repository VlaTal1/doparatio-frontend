package com.doparatio.app

import android.content.Context
import android.content.Intent
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
