/**
 * @fileoverview Module implementation for navigation/MainTabNavigator.
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {type MainTabParamList} from './types';
import {BottomTabBar, AppHeader} from '../components/organisms';
import {ChatNavigator} from './ChatNavigator';
import {CallsNavigator} from './CallsNavigator';
import {HomeScreen, NotificationsScreen, ProfileScreen} from './placeholders';

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
      tabBar={props => <BottomTabBar {...props} />}>
      <Tab.Screen
        component={HomeScreen}
        name="HomeTab"
        options={{
          header: () => <AppHeader />,
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
          header: () => <AppHeader />,
          headerShown: true,
        }}
      />
      <Tab.Screen
        component={ProfileScreen}
        name="ProfileTab"
        options={{
          header: () => <AppHeader />,
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
};

MainTabNavigator.displayName = 'MainTabNavigator';
