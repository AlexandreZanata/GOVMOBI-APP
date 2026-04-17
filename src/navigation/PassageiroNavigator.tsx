/**
 * @fileoverview PassageiroNavigator — bottom-tab navigator for the passenger experience.
 *
 * Tabs: Início (map), Corridas, Pagamentos, Perfil
 * Uses a custom tab bar matching the dark-navy-on-white design from the screenshots.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useTheme, type Theme} from '../theme';
import {PassageiroScreen} from '@screens/Passageiro/PassageiroScreen';
import {ProfileNavigator} from './ProfileNavigator';
import {NotificationsScreen} from '@screens/Notifications/NotificationsScreen';
import {PassageiroCorridasNavigator} from './PassageiroCorridasNavigator';

type PassageiroTabParamList = {
  PassageiroHome: undefined;
  PassageiroCorridas: undefined;
  PassageiroNotificacoes: undefined;
  PassageiroProfile: undefined;
};

const Tab = createBottomTabNavigator<PassageiroTabParamList>();

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TAB_ICONS: Record<
  keyof PassageiroTabParamList,
  {active: TabIconName; inactive: TabIconName}
> = {
  PassageiroHome:          {active: 'home',           inactive: 'home'},
  PassageiroCorridas:      {active: 'directions-car', inactive: 'directions-car'},
  PassageiroNotificacoes:  {active: 'notifications',  inactive: 'notifications-none'},
  PassageiroProfile:       {active: 'person',         inactive: 'person-outline'},
};

const TAB_LABEL_KEYS: Record<keyof PassageiroTabParamList, string> = {
  PassageiroHome:         'passageiro.tabs.home',
  PassageiroCorridas:     'passageiro.tabs.corridas',
  PassageiroNotificacoes: 'passageiro.tabs.notificacoes',
  PassageiroProfile:      'passageiro.tabs.perfil',
};

/**
 * Custom tab bar for the passenger experience.
 * White background, blue active state, gray inactive.
 *
 * @param props - BottomTabBarProps from React Navigation.
 * @returns JSX element for the passenger tab bar.
 */
const PassageiroTabBar = ({
  state,
  navigation,
}: BottomTabBarProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createTabBarStyles(theme, insets.bottom);

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const routeName = route.name as keyof PassageiroTabParamList;
        const icons = TAB_ICONS[routeName] ?? {active: 'circle', inactive: 'circle'};
        const labelKey = TAB_LABEL_KEYS[routeName];
        const label = labelKey ? t(labelKey) : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{selected: isFocused}}
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            testID={`passageiro-tab-${route.name}`}>
            {isFocused && <View style={styles.activeIndicator} />}
            <MaterialIcons
              color={isFocused ? INTERACTIVE : TEXT_MUTED}
              name={isFocused ? icons.active : icons.inactive}
              size={24}
            />
            <Text
              style={[styles.label, {color: isFocused ? INTERACTIVE : TEXT_MUTED}]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

PassageiroTabBar.displayName = 'PassageiroTabBar';

const INTERACTIVE = '#FFFFFF';
const TEXT_MUTED  = 'rgba(255,255,255,0.45)';
const NAV_BG      = '#0D1B2A';

// eslint-disable-next-line react-native/no-unused-styles
const createTabBarStyles = (_theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    container: {
      backgroundColor: NAV_BG,
      borderTopWidth: 0,
      flexDirection: 'row',
      height: 64 + (bottomInset > 0 ? bottomInset : 0),
      paddingBottom: bottomInset > 0 ? bottomInset : 0,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: -2},
      shadowOpacity: 0.20,
      shadowRadius: 10,
      elevation: 12,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 3,
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingTop: 8,
    },
    activeIndicator: {
      width: 20,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: INTERACTIVE,
      position: 'absolute',
      top: 0,
    },
  });

// Placeholder screens for tabs not yet implemented
const NotificacoesPlaceholder  = (): React.JSX.Element => <NotificationsScreen />;

/**
 * Bottom-tab navigator for the passenger (USUARIO/ADMIN) experience.
 *
 * @returns JSX element for the passenger navigator.
 */
export const PassageiroNavigator = (): React.JSX.Element => {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={props => <PassageiroTabBar {...props} />}>
      <Tab.Screen component={PassageiroScreen}               name="PassageiroHome" />
      <Tab.Screen component={PassageiroCorridasNavigator}    name="PassageiroCorridas" />
      <Tab.Screen component={NotificacoesPlaceholder}        name="PassageiroNotificacoes" />
      <Tab.Screen component={ProfileNavigator}        name="PassageiroProfile" />
    </Tab.Navigator>
  );
};

PassageiroNavigator.displayName = 'PassageiroNavigator';
