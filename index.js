/**
 * @fileoverview JavaScript entry — must register the root component as "main"
 * (see android MainActivity.getMainComponentName()).
 *
 * Do not use `import { name } from './app.json'` for registration: Expo's
 * app.json nests the display name under `expo`, so `name` is undefined and
 * AppRegistry would not register "main".
 */
import {registerRootComponent} from 'expo';
import App from './src/App';

registerRootComponent(App);
