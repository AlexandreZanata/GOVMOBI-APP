/**
 * @fileoverview AdminAvaliacoesScreen — ADMIN-only screen listing all ride ratings.
 *
 * Calls GET /admin/avaliacoes via AvaliacoesFacade and renders a FlatList of
 * Avaliacao items. Handles loading, error (with retry), and empty states.
 */
import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {useAdminAvaliacoes} from './useAdminAvaliacoes';
import {createAdminAvaliacoesStyles} from './AdminAvaliacoes.styles';
import type {Avaliacao} from '@models/Avaliacao';

const STAR_COUNT = 5;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AvaliacaoCardProps {
  item: Avaliacao;
  isLast: boolean;
}

const AvaliacaoCard = ({item, isLast}: AvaliacaoCardProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const s = useMemo(() => createAdminAvaliacoesStyles(theme), [theme]);

  const formattedDate = useMemo(() => {
    try {
      return new Date(item.createdAt).toLocaleDateString();
    } catch {
      return item.createdAt;
    }
  }, [item.createdAt]);

  return (
    <View
      style={[s.card, isLast && s.cardLast]}
      testID={`avaliacao-card-${item.id}`}>
      {/* Stars row */}
      <View style={s.starsRow}>
        <Text style={s.notaLabel}>{t('avaliacoes.admin.notaLabel')}</Text>
        {Array.from({length: STAR_COUNT}).map((_, i) => (
          <MaterialIcons
            key={i}
            name={i < item.nota ? 'star' : 'star-border'}
            size={20}
            color={
              i < item.nota
                ? theme.design.warning
                : theme.design.surface400
            }
          />
        ))}
      </View>

      {/* Optional comment */}
      {item.comentario ? (
        <Text style={s.comentario} testID={`comentario-${item.id}`}>
          {item.comentario}
        </Text>
      ) : null}

      {/* Date */}
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>{t('avaliacoes.admin.createdAtLabel')}</Text>
        <Text style={s.metaValue}>{formattedDate}</Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Admin screen that lists all ride ratings in the system.
 *
 * @returns JSX element for the AdminAvaliacoesScreen.
 */
export const AdminAvaliacoesScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const s = useMemo(() => createAdminAvaliacoesStyles(theme), [theme]);

  const {avaliacoes, isLoading, error, retry} = useAdminAvaliacoes();

  const renderItem: ListRenderItem<Avaliacao> = useCallback(
    ({item, index}) => (
      <AvaliacaoCard
        item={item}
        isLast={index === avaliacoes.length - 1}
      />
    ),
    [avaliacoes.length],
  );

  const keyExtractor = useCallback((item: Avaliacao) => item.id, []);

  const ListEmpty = useCallback(
    () => (
      <View style={s.centeredFill} testID="avaliacoes-empty">
        <MaterialIcons
          name="star-border"
          size={56}
          color={theme.design.textTertiary}
        />
        <Text style={s.emptyText}>{t('avaliacoes.admin.empty')}</Text>
      </View>
    ),
    [s, t, theme],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[s.root, {backgroundColor: theme.design.navy800}]}
      testID="admin-avaliacoes-screen">
      <StatusBar barStyle="light-content" backgroundColor={theme.design.navy800} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('avaliacoes.admin.title')}</Text>
      </View>

      {/* Content */}
      <View style={[s.root]}>
        {isLoading ? (
          <View style={s.centeredFill} testID="loading-indicator">
            <ActivityIndicator color={theme.design.blue500} size="large" />
          </View>
        ) : error ? (
          <View style={s.centeredFill} testID="error-state">
            <MaterialIcons
              name="error-outline"
              size={48}
              color={theme.design.danger}
            />
            <Text style={s.errorText}>{t('avaliacoes.admin.errorMessage')}</Text>
            <Pressable
              accessibilityLabel={t('avaliacoes.admin.retry')}
              accessibilityRole="button"
              onPress={retry}
              style={s.retryButton}
              testID="retry-button">
              <Text style={s.retryButtonText}>{t('avaliacoes.admin.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              s.listContent,
              avaliacoes.length === 0 && s.centeredFill,
            ]}
            data={avaliacoes}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmpty}
            removeClippedSubviews
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            testID="avaliacoes-list"
            windowSize={5}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

AdminAvaliacoesScreen.displayName = 'AdminAvaliacoesScreen';
