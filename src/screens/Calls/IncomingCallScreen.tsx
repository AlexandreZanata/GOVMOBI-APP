import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Avatar, Text} from '@components/atoms';
import {type CallsStackParamList} from '@navigation/types';
import {useIncomingCall} from './useIncomingCall';
import {createCallsStyles} from './CallsScreens.styles';

const AVATAR_SIZE = 96;
const RING_COUNT = 3;

/**
 * Full-screen incoming call overlay.
 *
 * Renders a pulsing ring animation around the caller avatar, caller info,
 * and answer/decline action buttons. Haptic feedback fires on mount.
 * Navigates to ActiveCallScreen on answer, or pops on decline.
 */
export const IncomingCallScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createCallsStyles(theme), [theme]);
  const navigation = useNavigation<NativeStackNavigationProp<CallsStackParamList>>();

  const {incomingCall, callerName, callerDepartment, onAnswer, onDecline} =
    useIncomingCall();

  // Pulsing ring animations
  const ringAnims = useRef(
    Array.from({length: RING_COUNT}, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = ringAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const parallel = Animated.parallel(animations);
    parallel.start();
    return () => parallel.stop();
  }, [ringAnims]);

  const handleAnswer = () => {
    onAnswer();
    if (incomingCall) {
      navigation.replace('ActiveCall', {callId: incomingCall.id});
    }
  };

  const handleDecline = () => {
    onDecline();
    navigation.goBack();
  };

  return (
    <View style={styles.incomingRoot} testID="incoming-call-screen">
      {/* Caller section */}
      <View style={styles.incomingCallerSection}>
        <Text color="textInverse" style={styles.incomingLabel} variant="label">
          {t('calls.incomingCall')}
        </Text>

        {/* Avatar with pulsing rings */}
        <View style={{alignItems: 'center', justifyContent: 'center', height: AVATAR_SIZE + 80, width: AVATAR_SIZE + 80}}>
          {ringAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.pulseRing,
                {
                  height: AVATAR_SIZE + 20 + i * 24,
                  width: AVATAR_SIZE + 20 + i * 24,
                  opacity: anim.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 0]}),
                  transform: [{scale: anim.interpolate({inputRange: [0, 1], outputRange: [0.8, 1.2]})}],
                },
              ]}
            />
          ))}
          <Avatar name={callerName} size="xl" testID="incoming-caller-avatar" />
        </View>

        <Text color="textInverse" variant="subheading">
          {callerName}
        </Text>
        <Text color="textInverse" style={styles.incomingLabel} variant="caption">
          {callerDepartment}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.incomingActions}>
        <View style={{alignItems: 'center', gap: theme.spacing.sm}}>
          <Pressable
            accessibilityLabel={t('calls.decline')}
            accessibilityRole="button"
            onPress={handleDecline}
            style={[styles.callActionButton, styles.declineButton]}
            testID="decline-button">
            <MaterialIcons
              color={theme.colors.white}
              name="call-end"
              size={theme.typography.fontSize['2xl']}
            />
          </Pressable>
          <Text color="textInverse" variant="caption">
            {t('calls.decline')}
          </Text>
        </View>

        <View style={{alignItems: 'center', gap: theme.spacing.sm}}>
          <Pressable
            accessibilityLabel={t('calls.answer')}
            accessibilityRole="button"
            onPress={handleAnswer}
            style={[styles.callActionButton, styles.answerButton]}
            testID="answer-button">
            <MaterialIcons
              color={theme.colors.white}
              name="call"
              size={theme.typography.fontSize['2xl']}
            />
          </Pressable>
          <Text color="textInverse" variant="caption">
            {t('calls.answer')}
          </Text>
        </View>
      </View>
    </View>
  );
};

IncomingCallScreen.displayName = 'IncomingCallScreen';
