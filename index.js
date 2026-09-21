import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './src/app/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and also ensures the environment is set up for Expo.
registerRootComponent(App);