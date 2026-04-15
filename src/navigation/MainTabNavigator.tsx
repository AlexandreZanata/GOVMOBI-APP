import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {type MainTabParamList} from './types';
import {TabBar} from './TabBar';
import {AppHeader} from './AppHeader';
import {ChatNavigator} from './ChatNavigator';
import {CallsNavigator} from './CallsNavigator';
import {
  HomeScreen,
  NotificationsScreen,
  ProfileScreen,
} from './placeholders';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main application tab navigator.
 * Uses the custom TabBar component for themed icons and badge counts.
 * Chat and Calls tabs host their own nested stack navigators.
 */
export const MainTabNavigator = (): React.JSX.Element => {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={props => <TabBar {...props} />}>
      <Tab.Screen
        component={HomeScreen}
        name="HomeTab"
        options={{
          header: () => <AppHeader title="GovMobile" />,
          headerShown: true,
        }}
      />
      <Tab.Screen
        component={ChatNavigator}
        name="ChatTab"
        options={{headerShown: false}}
      />
      <Tab.Screen
        component={CallsNavigator}
        name="CallsTab"
        options={{headerShown: false}}
      />
      <Tab.Screen
        component={NotificationsScreen}
        name="NotificationsTab"
        options={{
          header: () => <AppHeader title="Notifications" />,
          headerShown: true,
        }}
      />
      <Tab.Screen
        component={ProfileScreen}
        name="ProfileTab"
        options={{
          header: () => <AppHeader title="Profile" />,
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
};

MainTabNavigator.displayName = 'MainTabNavigator';
