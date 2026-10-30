# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---- IFB release shrinking rules (minifyEnabled true) ----
# Capacitor bridge resolves plugins and @PluginMethod handlers via reflection.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Stripe Terminal SDK (Tap to Pay)
-keep class com.stripe.** { *; }

# App code (MainActivity, MainApplication, StripeTerminalPlugin)
-keep class org.infinitefuturebank.** { *; }

# Cordova plugins bundled via capacitor-cordova-android-plugins
-keep class org.apache.cordova.** { *; }

# Keep line numbers for crash reports, hide source file names
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
