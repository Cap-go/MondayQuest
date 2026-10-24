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

# R8 release build. Capacitor's consumer rules already keep @CapacitorPlugin
# classes, Plugin subclasses, and @PluginMethod methods, so the JS bridge
# still finds them after obfuscation.

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

-keep class ee.forgr.mondayquest.MainActivity { *; }
