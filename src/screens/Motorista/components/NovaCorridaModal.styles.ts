/**
 * @fileoverview Styles for NovaCorridaModal.
 */
import {StyleSheet} from 'react-native';
import type {Theme} from '@theme/index';

/**
 * Creates themed styles for NovaCorridaModal.
 *
 * @param theme - Current GovMobile theme.
 * @returns StyleSheet object.
 */
export const createNovaCorridaModalStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
    },
    card: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[5],
      gap: theme.spacing[4],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    timerRing: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '700',
    },
    timerLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textMuted,
      flex: 1,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[1],
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      alignSelf: 'flex-start',
    },
    priorityText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600',
      color: theme.colors.textInverse,
    },
    progressTrack: {
      height: 4,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing[3],
    },
    btn: {
      flex: 1,
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnRefuse: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    btnAccept: {
      backgroundColor: theme.colors.primary,
    },
    btnText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    btnRefuseText: {
      color: theme.colors.textMuted,
    },
    btnAcceptText: {
      color: theme.colors.textInverse,
    },
  });
