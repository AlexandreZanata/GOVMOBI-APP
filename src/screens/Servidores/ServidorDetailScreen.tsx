/**
 * @fileoverview Detail view for a single servidor.
 */
import React, {useMemo} from 'react';
import {ScrollView, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {Avatar, Skeleton, Text} from '../../components/atoms';
import {AppHeader} from '../../components/organisms';
import {type ServidoresStackParamList} from '../../navigation/types';
import {type Papel} from '../../models';
import {useServidorDetail} from './useServidorDetail';
import {createServidoresStyles} from './ServidoresScreens.styles';

type DetailRoute = RouteProp<ServidoresStackParamList, 'ServidorDetail'>;

const formatCpf = (cpf: string): string =>
  cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

/**
 * Displays full details for a single servidor.
 */
export const ServidorDetailScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createServidoresStyles(theme), [theme]);
  const {params} = useRoute<DetailRoute>();
  const {servidor, isLoading, isError} = useServidorDetail(params.servidorId);

  if (isLoading) {
    return (
      <View style={styles.background}>
        <AppHeader title={t('servidores.detail.title')} showBack />
        <View style={styles.avatarSection}>
          <Skeleton width={80} height={80} borderRadius={40} />
          <Skeleton width={180} height={18} />
        </View>
        <View style={styles.detailSection}>
          {Array.from({length: 4}).map((_, i) => (
            <Skeleton key={i} width="100%" height={14} />
          ))}
        </View>
      </View>
    );
  }

  if (isError || !servidor) {
    return (
      <View style={styles.background}>
        <AppHeader title={t('servidores.detail.title')} showBack />
        <View style={styles.emptyState} testID="detail-error">
          <Text variant="body" color="textMuted">{t('errors.unknownError')}</Text>
        </View>
      </View>
    );
  }

  const papelLabel = (p: Papel): string =>
    t(`servidores.papeis.${p}`, {defaultValue: p});

  return (
    <View style={styles.background}>
      <AppHeader title={t('servidores.detail.title')} showBack />
      <ScrollView testID="servidor-detail-scroll">
        <View style={styles.avatarSection}>
          <Avatar name={servidor.nome} size="xl" testID="detail-avatar" />
          <Text variant="heading">{servidor.nome}</Text>
          <Text variant="caption" color="textMuted">
            {servidor.ativo
              ? t('servidores.status.active')
              : t('servidores.status.inactive')}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <Text variant="caption" color="textMuted">{t('servidores.detail.cpf')}</Text>
            <Text variant="body">{formatCpf(servidor.cpf)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="caption" color="textMuted">{t('servidores.detail.email')}</Text>
            <Text variant="body">{servidor.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="caption" color="textMuted">{t('servidores.detail.telefone')}</Text>
            <Text variant="body">{servidor.telefone}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text variant="label" color="textMuted">{t('servidores.detail.papeis')}</Text>
          <View style={styles.papeisBadgeRow}>
            {servidor.papeis.map(p => (
              <View key={p} style={styles.papelBadge}>
                <Text variant="caption">{papelLabel(p)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

ServidorDetailScreen.displayName = 'ServidorDetailScreen';
