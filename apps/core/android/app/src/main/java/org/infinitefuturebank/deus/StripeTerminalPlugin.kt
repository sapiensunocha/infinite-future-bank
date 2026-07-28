package org.infinitefuturebank.deus

import android.app.Application
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

import com.stripe.stripeterminal.Terminal
import com.stripe.stripeterminal.TerminalApplicationDelegate
import com.stripe.stripeterminal.external.callable.Callback
import com.stripe.stripeterminal.external.callable.Cancelable
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider
import com.stripe.stripeterminal.external.callable.DiscoveryListener
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback
import com.stripe.stripeterminal.external.callable.ReaderCallback
import com.stripe.stripeterminal.external.callable.TerminalListener
import com.stripe.stripeterminal.external.models.ConnectionConfiguration
import com.stripe.stripeterminal.external.models.ConnectionTokenException
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration
import com.stripe.stripeterminal.external.models.PaymentIntent
import com.stripe.stripeterminal.log.LogLevel
import com.stripe.stripeterminal.external.models.Reader
import com.stripe.stripeterminal.external.models.TerminalException

@CapacitorPlugin(name = "StripeTerminal")
class StripeTerminalPlugin : Plugin() {

    @Volatile private var connectionToken: String = ""
    @Volatile private var collectCancelable: Cancelable? = null
    @Volatile private var discoveryCancelable: Cancelable? = null

    private val tokenProvider = object : ConnectionTokenProvider {
        override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
            val token = connectionToken
            if (token.isNotEmpty()) callback.onSuccess(token)
            else callback.onFailure(ConnectionTokenException("No connection token"))
        }
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        val token = call.getString("connectionToken") ?: return call.reject("connectionToken required")
        connectionToken = token
        activity.runOnUiThread {
            try {
                TerminalApplicationDelegate.onCreate(activity.application as Application)
                if (!Terminal.isInitialized()) {
                    Terminal.initTerminal(activity, LogLevel.VERBOSE, tokenProvider, object : TerminalListener {
                        override fun onUnexpectedReaderDisconnect(reader: Reader) {}
                    })
                }
                call.resolve(JSObject().put("success", true))
            } catch (e: Exception) {
                call.reject(e.message ?: "Init failed")
            }
        }
    }

    @PluginMethod
    fun discoverAndConnect(call: PluginCall) {
        call.setKeepAlive(true)
        val config = DiscoveryConfiguration.LocalMobileDiscoveryConfiguration(isSimulated = false)
        discoveryCancelable = Terminal.getInstance().discoverReaders(config, object : DiscoveryListener {
            override fun onUpdateDiscoveredReaders(readers: List<Reader>) {
                val reader = readers.firstOrNull() ?: return
                discoveryCancelable?.cancel(object : Callback {
                    override fun onSuccess() {}
                    override fun onFailure(e: TerminalException) {}
                })
                val connConfig = ConnectionConfiguration.LocalMobileConnectionConfiguration("tml_local")
                Terminal.getInstance().connectLocalMobileReader(reader, connConfig, object : ReaderCallback {
                    override fun onSuccess(r: Reader) {
                        call.resolve(JSObject().put("readerId", r.serialNumber ?: "local").put("label", r.label ?: "Tap to Pay"))
                    }
                    override fun onFailure(e: TerminalException) { call.reject(e.message ?: "Connect failed") }
                })
            }
        }, object : Callback {
            override fun onSuccess() {}
            override fun onFailure(e: TerminalException) { call.reject(e.message ?: "Discovery failed") }
        })
    }

    @PluginMethod
    fun collectPayment(call: PluginCall) {
        call.setKeepAlive(true)
        val clientSecret = call.getString("clientSecret") ?: return call.reject("clientSecret required")
        Terminal.getInstance().retrievePaymentIntent(clientSecret, object : PaymentIntentCallback {
            override fun onSuccess(pi: PaymentIntent) {
                collectCancelable = Terminal.getInstance().collectPaymentMethod(pi, object : PaymentIntentCallback {
                    override fun onSuccess(collected: PaymentIntent) {
                        Terminal.getInstance().confirmPaymentIntent(collected, object : PaymentIntentCallback {
                            override fun onSuccess(processed: PaymentIntent) {
                                call.resolve(JSObject().put("paymentIntentId", processed.id).put("status", processed.status?.name ?: "succeeded"))
                            }
                            override fun onFailure(e: TerminalException) { call.reject(e.message ?: "Confirm failed") }
                        })
                    }
                    override fun onFailure(e: TerminalException) { call.reject(e.message ?: "Collect failed") }
                })
            }
            override fun onFailure(e: TerminalException) { call.reject(e.message ?: "Retrieve failed") }
        })
    }

    @PluginMethod
    fun cancelCollection(call: PluginCall) {
        collectCancelable?.cancel(object : Callback {
            override fun onSuccess() { call.resolve(JSObject().put("success", true)) }
            override fun onFailure(e: TerminalException) { call.resolve(JSObject().put("success", false)) }
        }) ?: call.resolve(JSObject().put("success", true))
        collectCancelable = null
    }
}
