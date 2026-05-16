# 🛠 Resido App Build Instructions

This document explains how to build the Resido mobile application and generate the Android APK.

## 📦 Automated Build (Recommended)

To build the APK and have it automatically copied to your Windows Downloads folder, simply run the build script from the project root:

```bash
./build_apk.sh
```

This script will:
1. Run Expo prebuild to generate native files.
2. Clean the previous build.
3. Assemble the release APK.
4. Copy the generated APKs directly to your Windows Downloads folder.

---

## ⚡ Manual Build (Faster for JS-only changes)

If you only made changes to the Javascript/Typescript files (like styling or logic) and didn't add any new native modules, you can build much faster by skipping the clean step:

### 1. Bundle JS
Package all your React Native code into a single file that the app can read offline:

```bash
npx react-native bundle --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
```

### 2. Build APK
Navigate to the `android` folder and run the Gradle build:

```bash
cd android
./gradlew assembleRelease
```

### 3. Copy to Windows Downloads
To copy the modern version (arm64) to your Windows Downloads folder manually:

```bash
cp android/app/build/outputs/apk/release/app-arm64-v8a-release.apk "/mnt/c/Users/VISHNU/Downloads/resido_v16_arm64.apk"
```
