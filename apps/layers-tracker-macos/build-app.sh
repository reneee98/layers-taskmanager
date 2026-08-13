#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=${0:A:h}
BUILD_CONFIGURATION=${BUILD_CONFIGURATION:-release}
APP_NAME="Layers Tracker"
BUNDLE_ID="sk.layersstudio.tracker"
API_BASE_URL=${LAYERS_API_BASE_URL:-https://layers-studio.vercel.app}
OUTPUT_DIR="$SCRIPT_DIR/dist"
APP_DIR="$OUTPUT_DIR/$APP_NAME.app"

cd "$SCRIPT_DIR"
swift build -c "$BUILD_CONFIGURATION"

BIN_DIR=$(swift build -c "$BUILD_CONFIGURATION" --show-bin-path)

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
cp "$BIN_DIR/LayersTracker" "$APP_DIR/Contents/MacOS/LayersTracker"

cat > "$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>$APP_NAME</string>
    <key>CFBundleExecutable</key>
    <string>LayersTracker</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>LayersAPIBaseURL</key>
    <string>$API_BASE_URL</string>
    <key>NSHumanReadableCopyright</key>
    <string>Layers Studio</string>
</dict>
</plist>
PLIST

xattr -cr "$APP_DIR"
codesign --force --deep --sign - "$APP_DIR"
codesign --verify --deep "$APP_DIR"
echo "$APP_DIR"
