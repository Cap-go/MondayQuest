#!/usr/bin/env bash
# Applies Monday Quest's native configuration on top of `cap add ios|android`.
# Safe to re-run. Usage: bun run native:setup
set -euo pipefail
cd "$(dirname "$0")/.."

PB=/usr/libexec/PlistBuddy

plist_set() { # file key type value
  "$PB" -c "Delete :$2" "$1" >/dev/null 2>&1 || true
  "$PB" -c "Add :$2 $3 $4" "$1"
}

if [ -d ios/App ]; then
  INFO=ios/App/App/Info.plist
  plist_set "$INFO" NSMotionUsageDescription string "Monday Quest counts your steps and floors during the walking and stairs challenges."
  plist_set "$INFO" NSCameraUsageDescription string "For the Reflection challenge: someone takes your photo every day."
  plist_set "$INFO" NSPhotoLibraryUsageDescription string "Pick the photo of the day for the Reflection challenge."
  plist_set "$INFO" NSMicrophoneUsageDescription string "Dictate your three good things for the Gratitude challenge."
  plist_set "$INFO" NSSpeechRecognitionUsageDescription string "Turn your voice into text in your journal."
  plist_set "$INFO" NSHealthShareUsageDescription string "Read your steps and floors to tick your challenges automatically."
  plist_set "$INFO" NSHealthUpdateUsageDescription string "Save your meditation minutes to Health."
  plist_set "$INFO" NSLocationWhenInUseUsageDescription string "Your approximate location is used on this phone only to work out the next sunrise for the Rising sun alarm."
  # @capacitor/geolocation links a background-location API. App Store Connect
  # (ITMS-90683) requires this key even though the app only reads location while in use.
  plist_set "$INFO" NSLocationAlwaysAndWhenInUseUsageDescription string "Your approximate location is used on this phone only to work out the next sunrise for the Rising sun alarm."
  plist_set "$INFO" NSAlarmKitUsageDescription string "Set a real wake-up alarm for the Sunrise challenge, even in silent mode."
  plist_set "$INFO" NSSupportsLiveActivities bool true
  plist_set "$INFO" CapgoWidgetKitAppGroup string group.ee.forgr.mondayquest.widgetkit
  plist_set "$INFO" UIRequiresFullScreen bool true
  plist_set "$INFO" ITSAppUsesNonExemptEncryption bool false
  # Paper-and-ink design only: keep native chrome (tab bar, sheets) light in dark mode too.
  plist_set "$INFO" UIUserInterfaceStyle string Light
  "$PB" -c "Delete :UIRequiredDeviceCapabilities" "$INFO" >/dev/null 2>&1 || true
  "$PB" -c "Add :UIRequiredDeviceCapabilities array" "$INFO"
  "$PB" -c "Add :UIRequiredDeviceCapabilities:0 string arm64" "$INFO"
  "$PB" -c "Delete :UISupportedInterfaceOrientations" "$INFO" >/dev/null 2>&1 || true
  "$PB" -c "Add :UISupportedInterfaceOrientations array" "$INFO"
  "$PB" -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$INFO"
  "$PB" -c "Delete :CFBundleURLTypes" "$INFO" >/dev/null 2>&1 || true
  "$PB" -c "Add :CFBundleURLTypes array" "$INFO"
  "$PB" -c "Add :CFBundleURLTypes:0 dict" "$INFO"
  "$PB" -c "Add :CFBundleURLTypes:0:CFBundleURLName string ee.forgr.mondayquest" "$INFO"
  "$PB" -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO"
  "$PB" -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string mondayquest" "$INFO"

  cp native/ios/App/App.entitlements ios/App/App/App.entitlements
  mkdir -p ios/App/MondayQuestWidget
  cp native/ios/MondayQuestWidget/* ios/App/MondayQuestWidget/

  # xcodeproj ships with CocoaPods; reuse its gem path.
  GEMS=$(ls -d /opt/homebrew/Cellar/cocoapods/*/libexec 2>/dev/null | tail -1 || true)
  if [ -n "$GEMS" ]; then
    GEM_HOME="$GEMS" /opt/homebrew/opt/ruby/bin/ruby scripts/ios-widget-target.rb
  else
    ruby -e 'require "xcodeproj"' 2>/dev/null && ruby scripts/ios-widget-target.rb || echo "⚠ install the xcodeproj gem to add the widget target"
  fi
  echo "✓ iOS configured"
fi

if [ -d android/app ]; then
  # Paper-and-ink design only: no DayNight theme so native chrome stays light.
  sed -i '' 's/Theme.AppCompat.DayNight.NoActionBar/Theme.AppCompat.Light.NoActionBar/' android/app/src/main/res/values/styles.xml
  # Health Connect (capacitor-health) requires API 26+
  sed -i '' 's/minSdkVersion = 2[0-5]/minSdkVersion = 26/' android/variables.gradle
  MANIFEST=android/app/src/main/AndroidManifest.xml
  python3 - "$MANIFEST" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
perms = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'com.android.alarm.permission.SET_ALARM',
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
  'android.permission.HIGH_SAMPLING_RATE_SENSORS',
  'android.permission.health.WRITE_MINDFULNESS',
  'android.permission.ACCESS_COARSE_LOCATION',
]
for perm in perms:
    tag = f'<uses-permission android:name="{perm}" />'
    if tag not in s:
        s = s.replace('</manifest>', f'    {tag}\n</manifest>')
deeplink = '''            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="mondayquest" />
            </intent-filter>
'''
if 'android:scheme="mondayquest"' not in s:
    s = s.replace('        </activity>', deeplink + '        </activity>', 1)
if 'android:screenOrientation' not in s:
    s = s.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"', 1)
# Plugins declare far more than we use; Play then demands a justification for each.
# Keep Health Connect WRITE_MINDFULNESS only; photos use the system picker (no media permission).
removed = [f'android.permission.health.{k}' for k in (
  'READ_ACTIVE_CALORIES_BURNED READ_BASAL_BODY_TEMPERATURE READ_BASAL_METABOLIC_RATE READ_BLOOD_GLUCOSE READ_BLOOD_PRESSURE '
  'READ_BODY_FAT READ_BODY_TEMPERATURE READ_DISTANCE READ_EXERCISE READ_FLOORS_CLIMBED READ_HEART_RATE READ_HEART_RATE_VARIABILITY '
  'READ_HEIGHT READ_HYDRATION READ_MINDFULNESS READ_NUTRITION READ_OXYGEN_SATURATION READ_RESPIRATORY_RATE READ_RESTING_HEART_RATE '
  'READ_SLEEP READ_STEPS READ_TOTAL_CALORIES_BURNED READ_VO2_MAX READ_WEIGHT WRITE_ACTIVE_CALORIES_BURNED WRITE_BASAL_BODY_TEMPERATURE '
  'WRITE_BASAL_METABOLIC_RATE WRITE_BLOOD_GLUCOSE WRITE_BLOOD_PRESSURE WRITE_BODY_FAT WRITE_BODY_TEMPERATURE WRITE_DISTANCE '
  'WRITE_FLOORS_CLIMBED WRITE_HEART_RATE WRITE_HEART_RATE_VARIABILITY WRITE_HEIGHT WRITE_HYDRATION WRITE_NUTRITION '
  'WRITE_OXYGEN_SATURATION WRITE_RESPIRATORY_RATE WRITE_RESTING_HEART_RATE WRITE_SLEEP WRITE_STEPS WRITE_TOTAL_CALORIES_BURNED '
  'WRITE_VO2_MAX WRITE_WEIGHT READ_HEALTH_DATA_IN_BACKGROUND READ_HEALTH_DATA_HISTORY').split()] + [
  'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO', 'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE', 'com.android.vending.BILLING', 'android.permission.health.READ_STEPS']
s = s.replace('    <uses-permission android:name="android.permission.health.READ_STEPS" />\n', '')
if 'xmlns:tools=' not in s:
    s = s.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"', 1)
for perm in removed:
    tag = f'<uses-permission android:name="{perm}" tools:node="remove" />'
    if tag not in s:
        s = s.replace('</manifest>', f'    {tag}\n</manifest>')
open(p, 'w').write(s)
PY
  echo "✓ Android configured"
fi
