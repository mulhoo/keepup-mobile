# KeepUp Mobile

React Native 0.82 (bare, no Expo) — iOS and Android. The primary surface for students, parents, and coaches in the KeepUp sports communication platform.

## Prerequisites

- Node.js >= 20
- For iOS: Xcode, CocoaPods, Ruby + Bundler (`gem install bundler`)
- For Android: Android Studio, Android SDK, JDK 17+

Full environment setup: https://reactnative.dev/docs/set-up-your-environment

## Local setup

### 1. Start the backend

The app talks to [keepup-backend](../keepup-backend), which must be running first.

```sh
cd ../keepup-backend
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server   # runs on localhost:3000
```

The seed builds the full demo scenario — schools, sports, seasons, users, and roles.

### 2. Configure the mobile app

```sh
cp .env.example .env
```

Edit `.env`:

```
API_BASE_URL=http://localhost:3000
API_TIMEOUT=10000
```

> On a physical device, replace `localhost` with your machine's local IP (e.g. `192.168.1.x`).

### 3. Install dependencies

```sh
npm install
```

iOS only — install pods:

```sh
bundle install
cd ios && bundle exec pod install && cd ..
```

### 4. Run the app

Start Metro in one terminal:

```sh
npm start
```

Then in another terminal:

```sh
npm run ios      # opens iOS Simulator
npm run android  # requires emulator or connected device
```

You can also open `ios/KeepUpMobile.xcworkspace` in Xcode and press Run, or open the `android/` folder in Android Studio.

## Demo flow

1. **Role Select** — pick a role (Student, Student Captain, Head Coach, Parent). Hits `POST /demo/session`.
2. **Channel List** — shows your channels for the current season. Tap a channel to open chat.
3. **Chat** — send messages. Student messages run through on-device Gemma moderation before being sent; coach/parent messages are moderated server-side.

## Project structure

```
src/
├── navigation/
│   └── AppNavigator.tsx      # RoleSelect → ChannelList → Chat
├── screens/
│   ├── RoleSelectScreen.tsx  # demo login
│   ├── ChannelListScreen.tsx # channel picker
│   └── ChatScreen.tsx        # messaging + moderation UI
└── services/
    ├── api.ts                # axios instance with Bearer auth
    ├── auth.ts               # login, logout, fetchChannels
    └── messages.ts           # fetchMessages, sendMessage
```

## Troubleshooting

**Metro cache issues:**
```sh
npm start -- --reset-cache
```

**iOS pod errors:**
```sh
cd ios && bundle exec pod install --repo-update && cd ..
```

**Android build fails:**
```sh
cd android && ./gradlew clean && cd ..
```

**"Unable to resolve module":** Run `npm install` and restart Metro.

**iOS pods still broken:** Delete `ios/Pods` and `ios/Podfile.lock`, then re-run `pod install`.
