import React, {useMemo} from 'react';
import {Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Avatar, Text} from '@components/atoms';
import {useActiveCall} from './useActiveCall';
import {createCallsStyles} from './CallsScreens.styles';

interface ControlButtonProps {
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * Renders a single call control toggle button (mute, speaker, hold, video).
 */
const ControlButton = ({iconName, label, isActive, onPress, testID}: ControlButtonProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useMemo(() => createCallsStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.controlButton, isActive ? styles.controlButtonActive : styles.controlButtonInactive]}
      testID={testID}>
      <MaterialIcons
        color={isActive ? theme.colors.accent : theme.colors.textInverse}
        name={iconName}
        size={theme.typography.fontSize.xl}
      />
      <Text color="textInverse" variant="caption">{label}</Text>
    </Pressable>
  );
};

/**
 * Active call screen with duration timer, call controls, and end-call button.
 */
export const ActiveCallScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createCallsStyles(theme), [theme]);
  const navigation = useNavigation();

  const {
    callerName,
    callerDepartment,
    durationLabel,
    isMuted,
    isSpeakerOn,
    isOnHold,
    isVideoOn,
    onToggleMute,
    onToggleSpeaker,
    onToggleHold,
    onToggleVideo,
    onEndCall,
  } = useActiveCall();

  const handleEndCall = () => {
    onEndCall();
    navigation.goBack();
  };

  return (
    <View style={styles.activeRoot} testID="active-call-screen">
      {/* Caller info */}
      <View style={styles.activeCallerSection}>
        <Avatar name={callerName} size="xl" testID="active-caller-avatar" />
        <Text color="textInverse" variant="subheading">{callerName}</Text>
        <Text color="textInverse" style={styles.incomingLabel} variant="caption">
          {callerDepartment}
        </Text>
        <Text color="textInverse" style={styles.timerText} variant="subheading" testID="call-timer">
          {durationLabel}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.activeControls}>
        <ControlButton
          iconName={isMuted ? 'mic-off' : 'mic'}
          isActive={isMuted}
          label={t('calls.active')}
          onPress={onToggleMute}
          testID="control-mute"
        />
        <ControlButton
          iconName="volume-up"
          isActive={isSpeakerOn}
          label={t('calls.active')}
          onPress={onToggleSpeaker}
          testID="control-speaker"
        />
        <ControlButton
          iconName="pause"
          isActive={isOnHold}
          label={t('calls.active')}
          onPress={onToggleHold}
          testID="control-hold"
        />
        <ControlButton
          iconName={isVideoOn ? 'videocam' : 'videocam-off'}
          isActive={isVideoOn}
          label={t('calls.active')}
          onPress={onToggleVideo}
          testID="control-video"
        />
      </View>

      {/* End call */}
      <Pressable
        accessibilityLabel={t('calls.endCall')}
        accessibilityRole="button"
        onPress={handleEndCall}
        style={styles.endCallButton}
        testID="end-call-button">
        <MaterialIcons
          color={theme.colors.white}
          name="call-end"
          size={theme.typography.fontSize['2xl']}
        />
      </Pressable>
    </View>
  );
};

ActiveCallScreen.displayName = 'ActiveCallScreen';
