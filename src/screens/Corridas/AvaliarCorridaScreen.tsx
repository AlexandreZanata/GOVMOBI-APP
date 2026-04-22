/**
 * @fileoverview AvaliarCorridaScreen — passenger ride rating screen.
 *
 * Shown after a ride reaches FINALIZADA status.
 * Allows the passenger to rate 1-5 stars and optionally add a comment.
 * Skips automatically if the rating deadline (3 days) has passed.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme, type Theme} from '../../theme';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {setRatingSubmitted} from '@store/slices/corridaSlice';
import type {PassageiroCorridasStackParamList} from '@navigation/types';

type RouteProps = RouteProp<PassageiroCorridasStackParamList, 'AvaliarCorrida'>;
type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

const MAX_COMMENT_LENGTH = 500;
const RATING_DEADLINE_DAYS = 3;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (theme: Theme, paddingTop: number) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.design.surface200,
      paddingTop,
    },
    content: {
      padding: theme.spacing[5],
      gap: theme.spacing[5],
    },
    title: {
      ...theme.typography.scale.displayMd,
      color: theme.design.textPrimary,
      textAlign: 'center',
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing[3],
    },
    label: {
      ...theme.typography.scale.labelMd,
      color: theme.design.textSecondary,
    },
    input: {
      ...theme.typography.scale.bodyMd,
      borderWidth: 1,
      borderColor: theme.design.surface400,
      borderRadius: theme.borderRadius.radius.md,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[3],
      color: theme.design.textPrimary,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    counter: {
      ...theme.typography.scale.caption,
      color: theme.design.textTertiary,
      textAlign: 'right',
    },
    submitBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.radius.md,
      paddingVertical: theme.spacing[4],
      alignItems: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.4,
    },
    submitBtnText: {
      ...theme.typography.scale.labelLg,
      color: theme.design.textOnDark,
    },
    skipBtn: {
      alignItems: 'center',
      paddingVertical: theme.spacing[2],
    },
    skipBtnText: {
      ...theme.typography.scale.bodyMd,
      color: theme.design.textTertiary,
    },
  });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AvaliarCorridaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params;
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);

  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = useMemo(
    () => createStyles(theme, insets.top),
    [theme, insets.top],
  );

  // Check 3-day deadline on mount
  useEffect(() => {
    if (!activeCorrida?.updatedAt) return;
    const updatedAt = new Date(activeCorrida.updatedAt).getTime();
    const now = Date.now();
    const daysDiff = (now - updatedAt) / (1000 * 60 * 60 * 24);
    if (daysDiff > RATING_DEADLINE_DAYS) {
      navigation.replace('PassageiroCorridasList');
    }
  }, [activeCorrida?.updatedAt, navigation]);

  const handleSubmit = useCallback(async () => {
    if (nota === 0) return;
    setIsSubmitting(true);
    try {
      const result = await corridaFacade.avaliarCorrida(corridaId, {
        nota,
        comentario: comentario.trim() || undefined,
      });
      if (result.error) {
        if (result.error.code === 'CONFLICT') {
          Alert.alert(t('corridas.avaliar.alreadyRated'));
        } else {
          Alert.alert(t('errors.unknownError'));
        }
        navigation.replace('PassageiroCorridasList');
        return;
      }
      dispatch(setRatingSubmitted(true));
      navigation.replace('PassageiroCorridasList');
    } finally {
      setIsSubmitting(false);
    }
  }, [nota, comentario, corridaId, corridaFacade, dispatch, navigation, t]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="avaliar-screen">
      <Text style={styles.title}>{t('corridas.avaliar.title')}</Text>

      {/* Star rating */}
      <Text style={styles.label}>{t('corridas.avaliar.notaLabel')}</Text>
      <View style={styles.starsRow} testID="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <Pressable
            accessibilityLabel={`${star} star`}
            accessibilityRole="button"
            key={star}
            onPress={() => setNota(star)}
            testID={`star-${star}`}>
            <MaterialIcons
              color={
                star <= nota
                  ? theme.design.warning ?? '#F59E0B'
                  : theme.design.surface400
              }
              name={star <= nota ? 'star' : 'star-border'}
              size={40}
            />
          </Pressable>
        ))}
      </View>

      {/* Comment */}
      <Text style={styles.label}>{t('corridas.avaliar.comentarioLabel')}</Text>
      <TextInput
        accessibilityLabel={t('corridas.avaliar.comentarioLabel')}
        maxLength={MAX_COMMENT_LENGTH}
        multiline
        onChangeText={setComentario}
        placeholder={t('corridas.avaliar.comentarioPlaceholder')}
        placeholderTextColor={theme.design.textTertiary}
        style={styles.input}
        testID="comentario-input"
        value={comentario}
      />
      <Text style={styles.counter}>{`${comentario.length}/${MAX_COMMENT_LENGTH}`}</Text>

      {/* Submit */}
      <Pressable
        accessibilityLabel={t('corridas.avaliar.submit')}
        accessibilityRole="button"
        disabled={nota === 0 || isSubmitting}
        onPress={() => void handleSubmit()}
        style={[
          styles.submitBtn,
          (nota === 0 || isSubmitting) && styles.submitBtnDisabled,
        ]}
        testID="submit-btn">
        {isSubmitting ? (
          <ActivityIndicator color={theme.design.textOnDark} size="small" />
        ) : (
          <Text style={styles.submitBtnText}>{t('corridas.avaliar.submit')}</Text>
        )}
      </Pressable>

      {/* Skip */}
      <Pressable
        accessibilityLabel={t('corridas.avaliar.skipLabel')}
        accessibilityRole="button"
        onPress={() => navigation.replace('PassageiroCorridasList')}
        style={styles.skipBtn}
        testID="skip-btn">
        <Text style={styles.skipBtnText}>{t('corridas.avaliar.skipLabel')}</Text>
      </Pressable>
    </ScrollView>
  );
};

AvaliarCorridaScreen.displayName = 'AvaliarCorridaScreen';
