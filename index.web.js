import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('KeepUpMobile', () => App);

AppRegistry.runApplication('KeepUpMobile', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
