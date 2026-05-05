/**
 * @fileoverview UI organism module for GlobalToast.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from '../atoms';
import {useTheme, type Theme} from '../../theme';
import {useAppDispatch, useAppSelector} from '../../store';
import {removeToast, type Toast} from '@store/slices/uiSlice';
import {useTranslation} from 'react-i18next';

type ToastColorTokens = {
  background: keyof Theme['colors'];
  text: keyof Theme['colors'];
};

const TOAST_TOKENS: Record<Toast['type'], ToastColorTokens> = {
  success: {background: 'success', text: 'white'},
  error: {background: 'error', text: 'white'},
  warning: {background: 'warning', text: 'white'},
  info: {background: 'info', text: 'white'},
};

/**
 * Global toast queue renderer.
 * Renders only the first toast and auto-dismisses after configured duration.
 *
 * @returns Overlay toast organism.
 */
export const GlobalToast = (): React.JSX.Element | null => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const activeToast = useAppSelector(state => state.ui.toasts[0] ?? null);

  useEffect(() => {
    if (!activeToast) {
      return;
    }

    const timer = setTimeout(() => {
      dispatch(removeToast(activeToast.id));
    }, activeToast.duration ?? 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [activeToast, dispatch]);

  const styles = useMemo(
    () => createStyles(theme, insets.top),
    [insets.top, theme],
  );

  if (!activeToast) {
    return null;
  }

  const tokens = TOAST_TOKENS[activeToast.type];

  return (
    <View pointerEvents="box-none" style={styles.overlay} testID="global-toast">
      <View
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors[tokens.background],
          },
        ]}>
        <Text color={tokens.text} numberOfLines={3} style={styles.message}>
          {activeToast.message}
        </Text>
        <Pressable
          accessibilityLabel={t('ui.toast.dismiss')}
          accessibilityRole="button"
          hitSlop={theme.spacing.sm}
          onPress={() => dispatch(removeToast(activeToast.id))}
          testID="global-toast-dismiss">
          <Text color={tokens.text} variant="label">
            {t('common.clear')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

GlobalToast.displayName = 'GlobalToast';

/**
 * Creates GlobalToast stylesheet values from theme tokens.
 *
 * @param theme Active GovMobile theme.
 * @param topInset Device top safe area inset.
 * @returns React Native stylesheet for GlobalToast.
 */
const createStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    message: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    overlay: {
      left: 0,
      position: 'absolute',
      right: 0,
      top: topInset + theme.spacing.md,
      zIndex: theme.zIndex.toast,
    },
    toast: {
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row',
      marginHorizontal: theme.spacing.lg,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...theme.shadows.md,
    },
  });
