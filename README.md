# KeepUp Mobile

A cross-platform mobile application built with React Native for iOS and Android, designed to work with an external backend API.

## Features

- Cross-platform support for iOS and Android
- Navigation with React Navigation
- API service layer with Axios for backend integration
- Environment configuration support
- TypeScript support
- Example screens demonstrating API integration

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- For iOS development:
  - Xcode (latest version)
  - CocoaPods
  - Ruby (bundler)
- For Android development:
  - Android Studio
  - Android SDK
  - Java Development Kit (JDK)

> **Note**: Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Backend Configuration

1. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```

2. Edit `.env` and update `API_BASE_URL` to point to your backend:
   ```
   API_BASE_URL=https://your-backend-api.com/api
   API_TIMEOUT=10000
   ```

## Installation

1. Install dependencies:
   ```sh
   npm install
   ```

2. For iOS, install CocoaPods dependencies:
   ```sh
   bundle install
   cd ios && bundle exec pod install && cd ..
   ```

## Running the App

### Start Metro

First, start the Metro bundler:

```sh
npm start
```

### Run on iOS

In a new terminal:

```sh
npm run ios
```

Or open `ios/KeepUpMobile.xcworkspace` in Xcode and press Run.

### Run on Android

Make sure you have an Android emulator running or a device connected, then:

```sh
npm run android
```

Or open the `android` folder in Android Studio and press Run.

## Project Structure

```
KeepUpMobile/
├── src/
│   ├── components/      # Reusable UI components
│   ├── navigation/      # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/         # Screen components
│   │   ├── HomeScreen.tsx
│   │   └── DetailsScreen.tsx
│   ├── services/        # API services and backend integration
│   │   ├── api.ts       # Main API client
│   │   └── exampleService.ts  # Example API service
│   ├── types/           # TypeScript type definitions
│   │   └── env.d.ts
│   └── utils/           # Utility functions
├── .env                 # Environment variables (not in git)
├── .env.example         # Example environment variables
└── App.tsx             # Main application component
```

## Working with Your Backend

### API Service Layer

The app includes a pre-configured API service layer in `src/services/api.ts`. It provides methods for all HTTP verbs:

- `api.get<T>(url, config?)`
- `api.post<T>(url, data?, config?)`
- `api.put<T>(url, data?, config?)`
- `api.patch<T>(url, data?, config?)`
- `api.delete<T>(url, config?)`

### Creating API Services

Create service files for different features. See `src/services/exampleService.ts` for reference:

```typescript
// src/services/userService.ts
import {api} from './api';

export const userService = {
  async getProfile() {
    return await api.get('/user/profile');
  },

  async updateProfile(data: any) {
    return await api.put('/user/profile', data);
  },
};
```

### Adding Authentication

To add authentication tokens, modify the request interceptor in `src/services/api.ts`:

```typescript
this.client.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('authToken'); // or your token storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

### Using Services in Components

Import and use services in your screens:

```typescript
import {exampleService} from '../services/exampleService';

const MyScreen = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await exampleService.fetchItems();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ... rest of component
};
```

## Development Tips

### Hot Reload

The app supports Fast Refresh. When you save changes, they will automatically update in the running app.

To force a reload:
- **Android**: Press <kbd>R</kbd> twice or <kbd>Ctrl</kbd>+<kbd>M</kbd> (Windows/Linux) / <kbd>Cmd</kbd>+<kbd>M</kbd> (macOS) for Dev Menu
- **iOS**: Press <kbd>R</kbd> in the simulator or <kbd>Cmd</kbd>+<kbd>D</kbd> for Dev Menu

### Debugging

- Open React Native debugger: Shake device or press <kbd>Cmd</kbd>+<kbd>D</kbd> (iOS) / <kbd>Cmd</kbd>+<kbd>M</kbd> (Android)
- View console logs in the Metro terminal
- Use React DevTools for component inspection

### Environment Variables

Environment variables are loaded from the `.env` file using `react-native-dotenv`. To add new variables:

1. Add to `.env`:
   ```
   NEW_VARIABLE=value
   ```

2. Add type definition in `src/types/env.d.ts`:
   ```typescript
   declare module '@env' {
     export const NEW_VARIABLE: string;
   }
   ```

3. Import and use:
   ```typescript
   import {NEW_VARIABLE} from '@env';
   ```

## Adding New Screens

1. Create a new screen component in `src/screens/`:
   ```typescript
   // src/screens/NewScreen.tsx
   export const NewScreen = ({navigation}: any) => {
     return (
       <View>
         <Text>New Screen</Text>
       </View>
     );
   };
   ```

2. Add the screen to the navigator in `src/navigation/AppNavigator.tsx`:
   ```typescript
   <Stack.Screen
     name="NewScreen"
     component={NewScreen}
     options={{title: 'New Screen'}}
   />
   ```

3. Navigate to it from other screens:
   ```typescript
   navigation.navigate('NewScreen');
   ```

## Troubleshooting

### iOS Build Issues

If you encounter build issues on iOS:
```sh
cd ios
bundle exec pod install --repo-update
cd ..
```

### Metro Bundler Issues

If Metro is not starting or has cache issues:
```sh
npm start -- --reset-cache
```

### Android Build Issues

If you encounter Android build issues:
```sh
cd android
./gradlew clean
cd ..
```

### Common Issues

- **"Unable to resolve module"**: Try `npm install` and restart Metro
- **iOS pods error**: Delete `ios/Pods` and `ios/Podfile.lock`, then run `pod install` again
- **Android build fails**: Check that `ANDROID_HOME` environment variable is set correctly

## Learn More

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## License

This project is open source and available under the [MIT License](LICENSE).
