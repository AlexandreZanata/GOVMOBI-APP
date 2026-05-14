/**
 * @fileoverview Styles for AcompanharCorridaScreen.
 *
 * Design language aligned with the Sorrimobi dashboard and profile pages:
 *   - Dark navy hero header (navy800) with curved bottom radius
 *   - surface200 body background
 *   - White cards with shadow tokens
 *   - Floating message FAB matching PassageiroScreen location FAB
 *
 * All values use theme design tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for AcompanharCorridaScreen.
 *
 * @param theme - The current Sorrimobi theme object.
 * @returns StyleSheet scoped to the AcompanharCorrida feature.
 */
export const createAcompanharStyles = (theme: Theme) => {
  const {design, spacing, borderRadius, shadows, typography: typo} = theme;

  return StyleSheet.create({
    // ── Root ──────────────────────────────────────────────────────────────────
    root: {
      flex: 1,
      backgroundColor: design.surface200,
    },

    // ── Hero header — mirrors ProfileScreen hero ───────────────────────────────
    hero: {
      backgroundColor: design.navy800,
      borderBottomLeftRadius: borderRadius.radius.xl,
      borderBottomRightRadius: borderRadius.radius.xl,
      paddingHorizontal: spacing[5],
      paddingBottom: spacing[6],
      gap: spacing[2],
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[1],
    },
    heroTitle: {
      ...typo.scale.displayMd,
      color: design.textOnDark,
    },
    heroSubtitle: {
      ...typo.scale.bodyMd,
      color: design.textOnDarkMuted,
    },

    // ── Status pill ────────────────────────────────────────────────────────────
    statusPill: {
      borderRadius: borderRadius.radius.full,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },
    statusPillText: {
      ...typo.scale.labelMd,
      color: design.textOnDark,
    },

    // ── Body ──────────────────────────────────────────────────────────────────
    body: {
      flex: 1,
      backgroundColor: design.surface200,
    },
    bodyContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
    },

    // ── Card — mirrors ProfileScreen section cards ─────────────────────────────
    card: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      padding: spacing[4],
      marginBottom: spacing[3],
      overflow: 'hidden',
      ...shadows.card,
    },
    cardTitle: {
      ...typo.scale.headingSm,
      color: design.textPrimary,
      marginBottom: spacing[3],
    },

    // ── Info rows — mirrors ProfileScreen row layout ───────────────────────────
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing[2],
    },
    infoIconWrap: {
      width: spacing[5],
      alignItems: 'center',
      marginRight: spacing[3],
      marginTop: 2,
    },
    infoTextBlock: {
      flex: 1,
    },
    infoLabel: {
      ...typo.scale.caption,
      color: design.textTertiary,
      marginBottom: 2,
    },
    infoValue: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: design.surface300,
      marginVertical: spacing[1],
    },

    // ── Section toggle row ─────────────────────────────────────────────────────
    sectionToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    // ── Empty text ─────────────────────────────────────────────────────────────
    emptyText: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      marginTop: spacing[2],
    },

    // ── Route row (compact, used in route card) ───────────────────────────────
    routeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginBottom: spacing[2],
    },

    // ── Messages section wrapper ───────────────────────────────────────────────
    messagesSection: {
      flex: 1,
      marginHorizontal: spacing[4],
    },

    // ── Cancel input ───────────────────────────────────────────────────────────
    cancelInput: {
      ...typo.scale.bodyMd,
      borderWidth: 1,
      borderColor: design.surface400,
      borderRadius: borderRadius.radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      color: design.textPrimary,
      marginBottom: spacing[3],
    },

    // ── Danger button ──────────────────────────────────────────────────────────
    dangerBtn: {
      backgroundColor: design.danger,
      borderRadius: borderRadius.radius.md,
      paddingVertical: spacing[3],
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerBtnDisabled: {
      opacity: 0.5,
    },
    dangerBtnText: {
      ...typo.scale.labelLg,
      color: design.textOnDark,
    },

    // ── Floating message FAB — mirrors PassageiroScreen fabLocation ────────────
    messageFab: {
      position: 'absolute',
      right: spacing[4],
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: design.blue500,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
    },
    fabBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: design.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    fabBadgeText: {
      ...typo.scale.labelSm,
      color: design.textOnDark,
    },

    // ── Chat FAB ───────────────────────────────────────────────────────────────
    fab: {
      position: 'absolute',
      bottom: 80,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: theme.colors.black,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
};
