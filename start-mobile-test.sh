#!/bin/bash
# Quick-start script for mobile app testing with Android emulator
# Run: bash start-mobile-test.sh

export ANDROID_HOME="/c/Users/nbhandary/AppData/Local/Android/Sdk"
export JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.18.8-hotspot"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

echo "=== Step 1: Checking Docker (MongoDB + Redis) ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "ERROR: Docker is not running. Please start Docker Desktop first."
  exit 1
fi

echo ""
echo "=== Step 2: Starting Android Emulator ==="
"$ANDROID_HOME/emulator/emulator.exe" -avd LoadNBehold_Test -gpu auto -no-snapshot-load &
EMULATOR_PID=$!
echo "Emulator starting (PID: $EMULATOR_PID)..."

echo ""
echo "=== Step 3: Waiting for emulator to boot ==="
"$ANDROID_HOME/platform-tools/adb.exe" wait-for-device
echo "Emulator connected!"

echo ""
echo "=== Step 4: Starting backend server ==="
cd "C:/Users/nbhandary/Desktop/loadnbehold"
pnpm --filter @loadnbehold/server dev &
SERVER_PID=$!
echo "Server starting (PID: $SERVER_PID)..."
sleep 5

echo ""
echo "=== Step 5: Starting Expo (mobile app) ==="
cd "C:/Users/nbhandary/Desktop/loadnbehold/apps/mobile"
npx expo start --android

echo ""
echo "Done! Press Ctrl+C to stop everything."
