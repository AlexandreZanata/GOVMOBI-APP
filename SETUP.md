# GovMobile Setup Instructions

## Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Android SDK (run once after cloning):
```bash
bash setup-android.sh
```
> Requires `ANDROID_HOME` to be set on your machine pointing to your Android SDK path.

3. Android notification icon:
   Replace `assets/ic_stat_notification.png` with a **white, transparent, 96×96px** PNG
   that matches your brand. This icon appears in the Android status bar and notification drawer.
   See [OneSignal icon docs](https://documentation.onesignal.com/docs/android-notification-icons).

2. Install iOS dependencies (macOS only):
```bash
cd ios && pod install && cd ..
```

## Development Commands

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## Project Structure

```
src/
components/           # Atomic Design System
  atoms/             # Smallest UI elements
  molecules/         # Combinations of atoms
  organisms/         # Complex UI sections
  templates/         # Page layouts
screens/             # Feature screens
navigation/          # React Navigation setup
services/            # API and external services
  facades/           # Service abstractions
  api/               # REST clients
  websocket/         # Real-time connections
models/              # TypeScript interfaces
store/               # Redux state management
hooks/               # Custom React hooks
i18n/                # Internationalization
theme/               # Design tokens and styling
utils/               # Helper functions
```

## Next Steps

Follow the README.md for the step-by-step build process starting with:
1. Theme & Design Tokens
2. i18n Internationalization
3. Models & TypeScript Interfaces

Each step includes POC tests to validate the implementation.
