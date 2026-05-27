#!/bin/bash
set -e
echo "Starting Android manual build script"
export ANDROID_HOME=$HOME/Android/sdk/
echo "ANDROID_HOME is $ANDROID_HOME"
mkdir -p $ANDROID_HOME/cmdline-tools
if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Downloading Android command line tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip
    rm -rf $ANDROID_HOME/cmdline-tools/cmdline-tools
    unzip -q /tmp/cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools
    mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest
    rm /tmp/cmdline-tools.zip
fi
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
echo "Accepting licenses..."
yes | sdkmanager --licenses > /dev/null || true
echo "Installing platforms and build-tools..."
sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools" || true

cd /home/vishnu/socwhiz/resido/mobile/resido-app
echo "Running expo prebuild..."
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 # Try setting default, but sdkmanager will use whatever is available
yes | npx expo prebuild --platform android --clean
cd android
echo "Cleaning build..."
./gradlew clean
echo "Assembling Release APK..."
./gradlew assembleRelease

cp app/build/outputs/apk/release/app-arm64-v8a-release.apk "/mnt/c/Users/VISHNU/Downloads/resido_v123_arm64.apk" || true
cp app/build/outputs/apk/release/app-armeabi-v7a-release.apk "/mnt/c/Users/VISHNU/Downloads/resido_v123_arm.apk" || true
cp app/build/outputs/apk/release/app-universal-release.apk "/mnt/c/Users/VISHNU/Downloads/resido_v123.apk" || true
cp app/build/outputs/apk/release/app-release.apk "/mnt/c/Users/VISHNU/Downloads/resido_v123.apk" || true

echo "DONE! APKs copied to Windows Downloads folder."


