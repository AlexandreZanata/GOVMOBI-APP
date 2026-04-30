import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createNotificationsStyles = (theme: Theme) => {
  const {design, spacing, typography: typo} = theme;

  return StyleSheet.create({
    // ── Root — navy top matches the header ────────────────────────────────────
    safeArea: {
      flex: 1,
      backgroundColor: design.navy800,
    },

    // ── Header — identical to PassageiroCorridasListScreen ────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
      backgroundColor: design.navy800,
    },
    headerTitle: {
      ...typo.scale.headingLg,
      color: design.textOnDark,
      textAlign: 'center',
    },

    // ── Content area — light surface below the header ─────────────────────────
    contentArea: {
      flex: 1,
      backgroundColor: design.surface200,
    },
    listContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[10],
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[8],
      paddingVertical: spacing[12],
    },
    emptySubtitle: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      marginTop: spacing[2],
      textAlign: 'center',
    },

    // ── Skeleton ──────────────────────────────────────────────────────────────
    skeletonItem: {
      backgroundColor: design.surface100,
      flexDirection: 'row',
      gap: spacing[4],
      padding: spacing[4],
    },
    skeletonContent: {
      flex: 1,
      gap: spacing[2],
    },
  });
};
