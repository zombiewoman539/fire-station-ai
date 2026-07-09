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

echo "→ Creating .app bundle structure..."
rm -rf "${APP_NAME}.app"
mkdir -p "${APP_NAME}.app/Contents/MacOS"
mkdir -p "${APP_NAME}.app/Contents/Resources"

echo "→ Packaging binary..."
npx pkg dist-server/index.js --targets node18-macos-x64 --output "${APP_NAME}.app/Contents/MacOS/${APP_NAME}"

echo "→ Copying React build..."
cp -r build "${APP_NAME}.app/Contents/MacOS/build"

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
