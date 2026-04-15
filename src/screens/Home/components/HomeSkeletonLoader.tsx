import React from 'react';
import {View} from 'react-native';
import {useTheme} from '@theme/index';
import {Skeleton} from '@components/atoms';
import {createHomeStyles} from '../HomeScreen.styles';

/**
 * Full-page skeleton loader shown while the Home screen data is loading.
 * Mirrors the layout of the real content to prevent layout shift.
 *
 * @returns The rendered skeleton layout.
 */
export const HomeSkeletonLoader = (): React.JSX.Element => {
  const theme = useTheme();
  const styles = createHomeStyles(theme);

  return (
    <>
      {/* Quick actions skeleton */}
      <View style={styles.skeletonSection} testID="skeleton-quick-actions">
        <Skeleton height={theme.spacing.lg} width="40%" />
        <View style={styles.skeletonRow}>
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['5xl']} width="47%" />
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['5xl']} width="47%" />
        </View>
        <View style={styles.skeletonRow}>
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['5xl']} width="47%" />
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['5xl']} width="47%" />
        </View>
        <View style={styles.skeletonRow}>
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['5xl']} width="47%" />
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['5xl']} width="47%" />
        </View>
      </View>

      {/* Recent activity skeleton */}
      <View style={styles.skeletonSection} testID="skeleton-recent-activity">
        <Skeleton height={theme.spacing.lg} width="50%" />
        {[1, 2, 3].map(i => (
          <Skeleton
            height={theme.spacing['6xl'] + theme.spacing['3xl']}
            key={i}
            width="100%"
          />
        ))}
      </View>

      {/* Announcements skeleton */}
      <View style={styles.skeletonSection} testID="skeleton-announcements">
        <Skeleton height={theme.spacing.lg} width="45%" />
        <View style={styles.skeletonRow}>
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['4xl']} width={260} />
          <Skeleton height={theme.spacing['6xl'] + theme.spacing['4xl']} width={260} />
        </View>
      </View>
    </>
  );
};

HomeSkeletonLoader.displayName = 'HomeSkeletonLoader';
