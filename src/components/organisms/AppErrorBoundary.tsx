/**
 * @fileoverview Application-level React error boundary.
 *
 * Catches unhandled render errors that would otherwise leave the app on a
 * blank/frozen screen. Renders a recoverable fallback UI with a "Retry" button
 * that resets the boundary and re-mounts the subtree.
 *
 * Usage: wrap the root navigator (or any critical subtree) with this component.
 * It intentionally does NOT use hooks so it can be a class component — React
 * error boundaries must be class components.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {designColors, spacing, typography} from '../../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  /** Subtree to protect. */
  children: React.ReactNode;
  /**
   * Optional custom fallback renderer.
   * Receives `resetError` so the caller can wire up its own retry button.
   */
  fallback?: (resetError: () => void) => React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Catches render-phase errors in the subtree and shows a recoverable fallback.
 *
 * @example
 * ```tsx
 * <AppErrorBoundary>
 *   <RootNavigator />
 * </AppErrorBoundary>
 * ```
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  static displayName = 'AppErrorBoundary';

  constructor(props: Props) {
    super(props);
    this.state = {hasError: false, errorMessage: ''};
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return {hasError: true, errorMessage: message};
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    // Log to Metro / Logcat so the error is visible during development.
    console.error('[AppErrorBoundary] Caught render error:', error, info);
  }

  private readonly resetError = (): void => {
    this.setState({hasError: false, errorMessage: ''});
  };

  render(): React.ReactNode {
    const {hasError, errorMessage} = this.state;
    const {children, fallback} = this.props;

    if (!hasError) return children;

    if (fallback) return fallback(this.resetError);

    return (
      <View style={styles.container} testID="error-boundary-fallback">
        <Text style={styles.title}>{'Algo deu errado'}</Text>
        <Text style={styles.message} numberOfLines={4}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.resetError}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente">
          <Text style={styles.buttonText}>{'Tentar novamente'}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// ---------------------------------------------------------------------------
// Styles — no hardcoded values, all from design tokens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  title: {
    ...typography.scale.headingLg,
    color: designColors.textOnDark,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  message: {
    ...typography.scale.bodyMd,
    color: designColors.textOnDarkMuted,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  button: {
    backgroundColor: designColors.blue500,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 10,
  },
  buttonText: {
    ...typography.scale.labelLg,
    color: designColors.textOnDark,
  },
});
