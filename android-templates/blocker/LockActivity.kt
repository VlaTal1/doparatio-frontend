package com.doparatio.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button

class LockActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Use R.layout.activity_lock
        setContentView(R.layout.activity_lock)

        val btnOpenApp = findViewById<Button>(R.id.btn_open_app)
        val btnGoHome = findViewById<Button>(R.id.btn_go_home)

        btnOpenApp.setOnClickListener {
            // Open Doparatio app launcher
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                startActivity(launchIntent)
            }
            finish()
        }

        btnGoHome.setOnClickListener {
            goHome()
        }
    }

    override fun onBackPressed() {
        // Prevent going back to the blocked application
        goHome()
    }

    private fun goHome() {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
        finish()
    }
}
