import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

/**
 * GovMobile - Public Administration Mobile App
 * 
 * Main application entry point with all providers
 */
const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        {/* App content will be added here */}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
