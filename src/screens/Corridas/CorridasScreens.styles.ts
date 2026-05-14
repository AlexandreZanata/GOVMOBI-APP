/**
 * @fileoverview Shared styles for all Corridas screens.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates shared styles for Corridas screens using design tokens.
 *
 * @param theme - Sorrimobi theme object.
 * @returns StyleSheet for Corridas screens.
 */
export const createCorridasStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing[4],
      paddingBottom: theme.spacing[10],
    },
    // ── Status badge ──────────────────────────────────────────────────────────
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[1],
      marginBottom: theme.spacing[4],
    },
    statusText: {
      ...theme.typography.scale.labelMd,
      color: theme.colors.textInverse,
    },
    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.radius.lg,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      ...theme.shadows.card,
    },
    cardTitle: {
      ...theme.typography.scale.headingSm,
      color: theme.colors.text,
      marginBottom: theme.spacing[2],
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    cardRowIcon: {
      marginRight: theme.spacing[2],
    },
    cardLabel: {
      ...theme.typography.scale.labelMd,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing[1],
    },
    cardValue: {
      ...theme.typography.scale.bodyMd,
      color: theme.colors.text,
    },
    // ── Action buttons ────────────────────────────────────────────────────────
    actionButton: {
      borderRadius: theme.borderRadius.radius.md,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[3],
    },
    actionButtonText: {
      ...theme.typography.scale.labelLg,
      color: theme.colors.textInverse,
    },
    actionButtonPrimary: {
      backgroundColor: theme.colors.primary,
    },
    actionButtonSuccess: {
      backgroundColor: theme.colors.success,
    },
    actionButtonDanger: {
      backgroundColor: theme.colors.error,
    },
    actionButtonWarning: {
      backgroundColor: theme.colors.warning,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    // ── Section header ────────────────────────────────────────────────────────
    sectionHeader: {
      ...theme.typography.scale.headingMd,
      color: theme.colors.text,
      marginBottom: theme.spacing[3],
      marginTop: theme.spacing[2],
    },
    // ── Empty state ───────────────────────────────────────────────────────────
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing[8],
    },
    emptyTitle: {
      ...theme.typography.scale.headingMd,
      color: theme.colors.text,
      marginTop: theme.spacing[4],
      textAlign: 'center',
    },
    emptySubtitle: {
      ...theme.typography.scale.bodyMd,
      color: theme.colors.textMuted,
      marginTop: theme.spacing[2],
      textAlign: 'center',
    },
    // ── Message item ──────────────────────────────────────────────────────────
    messageItem: {
      marginBottom: theme.spacing[3],
    },
    messageBubble: {
      borderRadius: theme.borderRadius.radius.md,
      padding: theme.spacing[3],
      maxWidth: '80%',
    },
    messageBubbleSelf: {
      backgroundColor: theme.colors.primary,
      alignSelf: 'flex-end',
    },
    messageBubbleOther: {
      backgroundColor: theme.colors.surfaceAlt,
      alignSelf: 'flex-start',
    },
    messageText: {
      ...theme.typography.scale.bodyMd,
      color: theme.colors.textInverse,
    },
    messageTextOther: {
      color: theme.colors.text,
    },
    messageTime: {
      ...theme.typography.scale.caption,
      color: theme.colors.textMuted,
      marginTop: theme.spacing[1],
      alignSelf: 'flex-end',
    },
    // ── Form inputs ───────────────────────────────────────────────────────────
    formInput: {
      borderWidth: 1,
      borderRadius: theme.borderRadius.radius.sm,
      padding: theme.spacing[3],
      color: theme.colors.text,
    },
    formInputMultiline: {
      borderWidth: 1,
      borderRadius: theme.borderRadius.radius.sm,
      padding: theme.spacing[3],
      minHeight: 80,
      textAlignVertical: 'top' as const,
      color: theme.colors.text,
    },
    formInputShort: {
      borderWidth: 1,
      borderRadius: theme.borderRadius.radius.sm,
      padding: theme.spacing[3],
      minHeight: 60,
      textAlignVertical: 'top' as const,
      color: theme.colors.text,
    },
    terminalContainer: {
      flex: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: theme.spacing[8],
    },
    // ── List screen helpers ───────────────────────────────────────────────────
    cardRowLast: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 0,
    },
    chevronRight: {
      marginLeft: 'auto' as const,
    },
    fullWidthButton: {
      width: '100%' as const,
    },
    // ── Loading overlay ───────────────────────────────────────────────────────
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: theme.zIndex.overlay,
    },
  });

// ---------------------------------------------------------------------------
// Status color map
// ---------------------------------------------------------------------------

/**
 * Returns the background color for a corrida status badge.
 *
 * @param status - CorridaStatus value.
 * @param theme - Sorrimobi theme.
 * @returns Hex color string.
 */
export const statusColor = (status: string, theme: Theme): string => {
  const map: Record<string, string> = {
    SOLICITADA: theme.colors.info,
    ACEITA: theme.colors.success,
    RECUSADA: theme.colors.error,
    EM_DESLOCAMENTO: theme.colors.warning,
    PASSAGEIRO_EMBARCADO: theme.colors.accent,
    FINALIZADA: theme.colors.success,
    CANCELADA: theme.colors.error,
  };
  return map[status] ?? theme.colors.textMuted;
};
