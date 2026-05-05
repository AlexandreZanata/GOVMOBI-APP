import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@theme/index';
import {Text} from '@components/atoms';
import {createChatStyles} from '../ChatScreens.styles';

export interface TypingIndicatorProps {
  /** Whether to show the typing indicator. */
  visible: boolean;
  testID?: string;
}

/** Number of animated dots in the indicator. */
const DOT_COUNT = 3;
/** Stagger delay between each dot animation in ms. */
const DOT_STAGGER_MS = 160;

/**
 * Animated three-dot typing indicator shown when a remote participant is typing.
 *
 * Each dot pulses with a staggered opacity animation using the native driver.
 * The component renders nothing when `visible` is false.
 *
 * @param props - {@link TypingIndicatorProps}
 * @returns The rendered typing indicator or null.
 */
export const TypingIndicator = ({
  visible,
  testID,
}: TypingIndicatorProps): React.JSX.Element | null => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createChatStyles(theme), [theme]);

  const dotAnims = useRef(
    Array.from({length: DOT_COUNT}, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (!visible) return;

    const animations = dotAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * DOT_STAGGER_MS),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    const parallel = Animated.parallel(animations);
    parallel.start();

    return () => {
      parallel.stop();
      dotAnims.forEach(a => a.setValue(0.3));
    };
  }, [visible, dotAnims]);

  if (!visible) return null;

  return (
    <View style={styles.typingContainer} testID={testID}>
      {dotAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, {opacity: anim}]}
          testID={`typing-dot-${i}`}
        />
      ))}
      <Text color="textMuted" variant="caption">
        {t('chat.typing')}
      </Text>
    </View>
  );
};

TypingIndicator.displayName = 'TypingIndicator';
