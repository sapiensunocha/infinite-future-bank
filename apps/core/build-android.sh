#!/usr/bin/env bash
# build-android.sh — lean DEUS APK builder
# Strips web-only assets before syncing to Android so the APK stays small.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "▶ Building web assets..."
npm run build

echo "▶ Stripping Android-irrelevant files from dist..."
# 1. The APK itself — never bundle inside the APK
rm -f dist/DEUS-latest.apk

# 2. Face-api.js models — not needed on native (Android uses NativeBiometric)
rm -rf dist/models

# 3. Admin-only HTML — not part of the DEUS user app
rm -f dist/kyc-admin.html dist/kyc-admin.html.br dist/kyc-admin.html.gz

# 4. Server-compressed variants — Android WebView serves from file:// not HTTP
find dist/assets -name "*.br" -delete
find dist/assets -name "*.gz" -delete
find dist -maxdepth 1 -name "*.br" -delete
find dist -maxdepth 1 -name "*.gz" -delete

# 5. serve.json — Netlify/CDN config, meaningless in APK
rm -f dist/serve.json

echo "▶ Syncing to Android..."
npx @capacitor/cli sync android

echo "▶ Building release APK and AAB (for Google Play)..."
cd android

# Auto-detect Android SDK if not already set
if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  elif [ -n "$LOCALAPPDATA" ] && [ -d "$LOCALAPPDATA/Android/Sdk" ]; then
    export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
  elif [ -d "/c/Users/$USER/AppData/Local/Android/Sdk" ]; then
    export ANDROID_HOME="/c/Users/$USER/AppData/Local/Android/Sdk"
  fi
fi

if ! command -v java >/dev/null 2>&1; then
  echo "⚠️  Java (JDK 17+) is not installed or not in PATH."
  echo "    To build Android binaries locally on this PC, install JDK and Android Studio,"
  echo "    or use GitHub Actions to build the .aab automatically."
  exit 1
fi

GRADLE_CMD="./gradlew"
if [ ! -x "./gradlew" ] && [ -f "./gradlew.bat" ]; then
  GRADLE_CMD="./gradlew.bat"
fi

$GRADLE_CMD assembleRelease bundleRelease
cd ..

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
AAB_SRC="android/app/build/outputs/bundle/release/app-release.aab"
APK_DST="public/DEUS-latest.apk"
AAB_DST="public/DEUS-latest.aab"

echo "▶ Copying APK and AAB → public/"
cp "$APK_SRC" "$APK_DST"
if [ -f "$AAB_SRC" ]; then
  cp "$AAB_SRC" "$AAB_DST"
fi

SIZE=$(du -sh "$APK_DST" | cut -f1)
echo "✅ Done — DEUS-latest.apk ($SIZE) & DEUS-latest.aab (Play Store)"
