package org.infinitefuturebank.deus

import android.app.Application
import com.stripe.stripeterminal.TerminalApplicationDelegate

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            TerminalApplicationDelegate.onCreate(this)
        } catch (e: Exception) {
            // Gracefully catch if Stripe Terminal native delegates cannot initialize in test/simulated environment
            e.printStackTrace()
        }
    }
}
