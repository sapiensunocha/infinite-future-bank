package org.infinitefuturebank.deus

import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(StripeTerminalPlugin::class.java)
        super.onCreate(savedInstanceState)
        // Block screenshots, screen recording and recents-thumbnail capture of balances / PII.
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }
}
