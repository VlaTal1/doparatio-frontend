package com.doparatio.app

import androidx.appcompat.app.AppCompatActivity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.ListView
import android.widget.TextView
import org.json.JSONArray
import java.util.ArrayList

class CachedHabit(
    val id: Int,
    val name: String,
    val icon: String
)

class HabitWidgetConfigureActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private val habitsList = ArrayList<CachedHabit>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        // Read appWidgetId from intent
        intent?.extras?.let {
            appWidgetId = it.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
        }

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        setContentView(R.layout.habit_widget_configure)

        // Read cached habits
        val prefs = getSharedPreferences("group.com.doparatio.app", Context.MODE_PRIVATE)
        val habitsJson = prefs.getString("widget_habits_cache", "[]") ?: "[]"

        try {
            val jsonArray = JSONArray(habitsJson)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val id = obj.getInt("id")
                val name = obj.getString("name")
                val icon = obj.getString("icon")
                habitsList.add(CachedHabit(id, name, icon))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val emptyText = findViewById<TextView>(R.id.configure_empty_text)
        val listView = findViewById<ListView>(R.id.configure_list)

        if (habitsList.isEmpty()) {
            emptyText.visibility = View.VISIBLE
            listView.visibility = View.GONE
        } else {
            emptyText.visibility = View.GONE
            listView.visibility = View.VISIBLE
            listView.adapter = HabitAdapter(this, habitsList)
            listView.setOnItemClickListener { _, _, position, _ ->
                val selectedHabit = habitsList[position]
                
                // Save selected habit ID for this specific appWidgetId
                prefs.edit().putString("widget_habit_id_$appWidgetId", selectedHabit.id.toString()).apply()

                // Trigger manual update of this widget
                val appWidgetManager = AppWidgetManager.getInstance(this)
                HabitWidgetProvider.updateWidget(this, appWidgetManager, appWidgetId)

                // Return result OK
                val resultValue = Intent().apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                setResult(RESULT_OK, resultValue)
                finish()
            }
        }
    }

    private class HabitAdapter(
        private val context: Context,
        private val habits: List<CachedHabit>
    ) : BaseAdapter() {

        override fun getCount(): Int = habits.size
        override fun getItem(position: Int): Any = habits[position]
        override fun getItemId(position: Int): Long = habits[position].id.toLong()

        override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
            val view = convertView ?: LayoutInflater.from(context).inflate(R.layout.habit_widget_configure_item, parent, false)
            val habit = habits[position]

            val iconText = view.findViewById<TextView>(R.id.item_icon)
            val nameText = view.findViewById<TextView>(R.id.item_name)

            iconText.text = habit.icon
            nameText.text = habit.name

            return view
        }
    }
}
