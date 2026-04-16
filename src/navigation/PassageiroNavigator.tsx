/**
 * @fileoverview PassageiroNavigator — bottom-tab navigator for the passenger experience.
 *
 * Tabs: Início (map), Corridas, Pagamentos, Perfil
 * Uses a custom tab bar matching the dark-navy-on-white design from the screenshots.
 */
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useTheme, type Theme} from '../theme';
import {Text} from '../components/atoms/Text';
import {PassageiroScreen} from '../screens/Passageiro/PassageiroScreen';
import {ProfileNavigator} from './ProfileNavigator';
import {NotificationsScreen} from '../screens/Notifications/NotificationsScreen';
import type {PassageiroStackParamList} from './types';

type PassageiroTabParamList = {
  PassageiroHome: undefined;
  PassageiroCorridas: undefined;
  PassageiroPagamentos: undefined;
  PassageiroProfile: undefined;
};

const Tab = createBottomTabNavigator<PassageiroTabParamList>();

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TAB_ICONS: Record<
  keyof PassageiroTabParamList,
  {active: TabIconName; inactive: TabIconName}
> = {
  PassageiroHome: {active: 'home', inactive: 'home'},
  PassageiroCorridas: {active: 'directions-car', inactive: 'directions-car'},
  PassageiroPagamentos: {active: 'account-balance-wallet', inactive: 'account-balance-wallet'},
  PassageiroProfile: {active: 'person', inactive: 'person-outline'},
};

const TAB_LABEL_KEYS: Record<keyof PassageiroTabParamList, string> = {
  PassageiroHome: 'passageiro.tabs.home',
  PassageiroCorridas: 'passageiro.tabs.corridas',
  PassageiroPagamentos: 'passageiro.tabs.pagamentos',
  PassageiroProfile: 'passageiro.tabs.perfil',
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
            <MaterialIcons
              color={isFocused ? theme.colors.info : theme.colors.textMuted}
              name={isFocused ? icons.active : icons.inactive}
              size={24}
            />
            <Text
              color={isFocused ? 'info' : 'textMuted'}
              style={styles.label}
              variant="caption">
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

PassageiroTabBar.displayName = 'PassageiroTabBar';

const createTabBarStyles = (theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      paddingBottom: bottomInset > 0 ? bottomInset : theme.spacing.md,
      paddingTop: theme.spacing.sm,
      ...theme.shadows.tabBar,
    },
    label: {
      marginTop: 2,
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: theme.spacing.xs,
    },
  });

// Placeholder screens for tabs not yet implemented
const CorridasPlaceholder = (): React.JSX.Element => <NotificationsScreen />;
const PagamentosPlaceholder = (): React.JSX.Element => <NotificationsScreen />;

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
      <Tab.Screen component={PassageiroScreen} name="PassageiroHome" />
      <Tab.Screen component={CorridasPlaceholder} name="PassageiroCorridas" />
      <Tab.Screen component={PagamentosPlaceholder} name="PassageiroPagamentos" />
      <Tab.Screen component={ProfileNavigator} name="PassageiroProfile" />
    </Tab.Navigator>
  );
};

PassageiroNavigator.displayName = 'PassageiroNavigator';
