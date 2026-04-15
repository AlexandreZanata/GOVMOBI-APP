import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * GovMobile - Public Administration Mobile App
 * 
 * Main application entry point
 */
const App = () => {
  return (
    <View style={styles.container}>
      <Text>GovMobile App</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
