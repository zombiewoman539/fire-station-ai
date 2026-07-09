#!/bin/bash
set -e

IDENTITY="Developer ID Application: Adian-Scott Ee Chew Veroff (W5ZA4GK2AT)"
KEY_FILE="$HOME/Downloads/AuthKey_H38D4YWJV7.p8"
KEY_ID="H38D4YWJV7"
ISSUER_ID="735708d9-3cd7-4134-9271-a18ba3e8f7b8"
APP_NAME="FireStation"
BUNDLE_ID="com.firestation.app"
VERSION="1.0.0"

echo "→ Building React app..."
npm run build

echo "→ Building server..."
npm run build:server

echo "→ Generating app icon..."
rm -rf /tmp/FireStation.iconset
mkdir -p /tmp/FireStation.iconset
qlmanage -t -s 1024 -o /tmp/ scripts/app-icon.svg 2>/dev/null
mv /tmp/app-icon.svg.png /tmp/icon-1024.png
for size in 16 32 64 128 256 512; do
  sips -z $size $size /tmp/icon-1024.png --out /tmp/FireStation.iconset/icon_${size}x${size}.png >/dev/null
done
sips -z 32 32    /tmp/icon-1024.png --out /tmp/FireStation.iconset/icon_16x16@2x.png   >/dev/null
sips -z 64 64    /tmp/icon-1024.png --out /tmp/FireStation.iconset/icon_32x32@2x.png   >/dev/null
sips -z 256 256  /tmp/icon-1024.png --out /tmp/FireStation.iconset/icon_128x128@2x.png >/dev/null
sips -z 512 512  /tmp/icon-1024.png --out /tmp/FireStation.iconset/icon_256x256@2x.png >/dev/null
cp /tmp/icon-1024.png /tmp/FireStation.iconset/icon_512x512@2x.png
iconutil -c icns /tmp/FireStation.iconset -o scripts/AppIcon.icns

echo "→ Creating .app bundle structure..."
rm -rf "${APP_NAME}.app"
mkdir -p "${APP_NAME}.app/Contents/MacOS"
mkdir -p "${APP_NAME}.app/Contents/Resources"

echo "→ Packaging binary..."
npx pkg dist-server/index.js --targets node18-macos-x64 --output "${APP_NAME}.app/Contents/MacOS/${APP_NAME}"

echo "→ Copying React build and icon..."
cp -r build "${APP_NAME}.app/Contents/MacOS/build"
cp scripts/AppIcon.icns "${APP_NAME}.app/Contents/Resources/AppIcon.icns"

echo "→ Writing Info.plist..."
cat > "${APP_NAME}.app/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleName</key>
    <string>FIRE Station</string>
    <key>CFBundleDisplayName</key>
    <string>FIRE Station</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
</dict>
</plist>
EOF

printf 'APPL????' > "${APP_NAME}.app/Contents/PkgInfo"

echo "→ Signing .app bundle..."
codesign --deep --force --sign "${IDENTITY}" --options runtime \
  --entitlements scripts/entitlements.plist "${APP_NAME}.app"

echo "→ Creating DMG with drag-to-Applications UI..."
rm -rf dmg-staging
mkdir dmg-staging
cp -r "${APP_NAME}.app" dmg-staging/
ln -s /Applications dmg-staging/Applications
rm -f "${APP_NAME}.dmg"
hdiutil create -volname "FIRE Station" -srcfolder dmg-staging -ov -format UDZO -o "${APP_NAME}.dmg"
rm -rf dmg-staging

echo "→ Signing DMG..."
codesign --sign "${IDENTITY}" "${APP_NAME}.dmg"

echo "→ Notarizing (this takes a few minutes)..."
xcrun notarytool submit "${APP_NAME}.dmg" \
  --key "${KEY_FILE}" \
  --key-id "${KEY_ID}" \
  --issuer "${ISSUER_ID}" \
  --wait

echo "→ Stapling DMG..."
xcrun stapler staple "${APP_NAME}.dmg"

echo "→ Stapling .app..."
xcrun stapler staple "${APP_NAME}.app"

echo ""
echo "✓ Done! ${APP_NAME}.dmg is ready to distribute."
