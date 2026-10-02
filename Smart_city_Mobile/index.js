import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundNotificationHandler } from './src/services/pushNotifications';

enableScreens();
registerBackgroundNotificationHandler();

// React Native expects the root component to be registered synchronously.
// Waiting for the first font-cache load can make Android report that the app
// is not registered on a cold launch, while a second launch appears to work.
AppRegistry.registerComponent(appName, () => App);
Ionicons.loadFont().catch(() => null);
