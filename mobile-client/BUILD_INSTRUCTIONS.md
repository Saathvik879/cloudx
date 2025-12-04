# How to Build CloudX Android APK

I have generated the source code for the CloudX Android Client in the `mobile-client` directory.
The app is pre-configured to connect to: `https://api.mycloud.antigravity.dev`

## Prerequisites
- Node.js installed
- [Expo CLI](https://docs.expo.dev/get-started/installation/) installed (`npm install -g expo-cli`)
- [EAS CLI](https://docs.expo.dev/build/setup/) installed (`npm install -g eas-cli`)
- Expo Account (free)

## Steps to Generate APK

1.  **Navigate to the directory**:
    ```bash
    cd mobile-client
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure EAS Build**:
    ```bash
    eas build:configure
    ```

4.  **Build for Android**:
    ```bash
    eas build -p android --profile preview
    ```
    This will generate an APK that you can install on your device or emulator.

## Running Locally
To test the app without building an APK:
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your Android device.
