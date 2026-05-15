/**
 * @fileoverview Hook for the ProfileScreen.
 *
 * Manages profile state, logout action, change-password flow, and photo upload.
 * Feedback is surfaced via inline state (no global toasts).
 * Name editing is not supported by the backend — display name is read-only.
 */
import {useCallback, useState} from 'react';
import {Alert, Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../store';
import {logout, setAvatarUrl} from '@store/slices/authSlice';
import {useFacades} from '@services/facades';
import {prepareImageForUpload} from '@utils/prepareImageForUpload';

/** Inline feedback for the change-password form. */
export type PasswordFeedback =
  | {type: 'success'; messageKey: string}
  | {type: 'error'; messageKey: string}
  | null;

/** Inline feedback for the photo upload flow. */
export type PhotoFeedback =
  | {type: 'success'; messageKey: string}
  | {type: 'error'; messageKey: string}
  | null;

type PhotoSource = 'camera' | 'library';

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

export interface ProfileState {
  /** Current display name (read-only, sourced from auth state). */
  displayName: string;
  /** Current avatar URL, or null if no photo has been set. */
  avatarUrl: string | null;
  /** Whether a photo upload is in progress. */
  isUploadingPhoto: boolean;
  /** Inline feedback after a photo upload attempt. */
  photoFeedback: PhotoFeedback;
  /** Opens camera or gallery and uploads the selected photo. */
  pickAndUploadPhoto: () => Promise<void>;
  signOut: () => void;
  /** Change-password form state. */
  senhaAntiga: string;
  setSenhaAntiga: (v: string) => void;
  novaSenha: string;
  setNovaSenha: (v: string) => void;
  confirmarSenha: string;
  setConfirmarSenha: (v: string) => void;
  isChangingPassword: boolean;
  /** Inline feedback — null when idle, set after submit attempt. */
  passwordFeedback: PasswordFeedback;
  changePassword: () => Promise<void>;
}

/**
 * Manages profile state, logout action, photo upload, and the change-password flow.
 *
 * @returns {@link ProfileState}
 */
export const useProfile = (): ProfileState => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {authFacade, servidoresFacade} = useFacades();
  const user = useAppSelector(state => state.auth.user);

  const displayName = user?.fullName ?? '';
  const avatarUrl = user?.avatarUrl ?? null;

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<PhotoFeedback>(null);

  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback>(null);

  const uploadPickedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<void> => {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileName = asset.fileName ?? `foto-${Date.now()}.jpg`;
      const uploadUri = await prepareImageForUpload(asset.uri, fileName);

      setIsUploadingPhoto(true);
      const uploadResult = await servidoresFacade.uploadFotoPerfil({
        uri: uploadUri,
        mimeType,
        fileName,
      });
      setIsUploadingPhoto(false);

      if (uploadResult.error) {
        const messageKey =
          uploadResult.error.code === 'FILE_TOO_LARGE'
            ? 'profile.photo.tooLarge'
            : uploadResult.error.code === 'INVALID_FILE'
              ? 'profile.photo.invalidFile'
              : 'profile.photo.uploadFailed';
        setPhotoFeedback({type: 'error', messageKey});
        return;
      }

      dispatch(setAvatarUrl(uploadResult.data.fotoPerfilUrl));
      setPhotoFeedback({type: 'success', messageKey: 'profile.photo.uploadSuccess'});
      setTimeout(() => setPhotoFeedback(null), 4000);
    },
    [dispatch, servidoresFacade],
  );

  const pickFromSource = useCallback(
    async (source: PhotoSource): Promise<void> => {
      setPhotoFeedback(null);

      if (source === 'camera') {
        const {status} = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setPhotoFeedback({type: 'error', messageKey: 'profile.photo.cameraPermissionDenied'});
          return;
        }

        const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
        if (result.canceled || result.assets.length === 0) {
          return;
        }
        await uploadPickedAsset(result.assets[0]);
        return;
      }

      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPhotoFeedback({type: 'error', messageKey: 'profile.photo.permissionDenied'});
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      await uploadPickedAsset(result.assets[0]);
    },
    [uploadPickedAsset],
  );

  /**
   * Shows camera / gallery chooser (native) and uploads the selected image.
   */
  const pickAndUploadPhoto = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      await pickFromSource('library');
      return;
    }

    Alert.alert(t('profile.photo.changeLabel'), undefined, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('profile.photo.takePhoto'),
        onPress: () => {
          void pickFromSource('camera');
        },
      },
      {
        text: t('profile.photo.chooseFromLibrary'),
        onPress: () => {
          void pickFromSource('library');
        },
      },
    ]);
  }, [pickFromSource, t]);

  const changePassword = useCallback(async (): Promise<void> => {
    setPasswordFeedback(null);

    if (!senhaAntiga.trim() || !novaSenha.trim() || !confirmarSenha.trim()) {
      setPasswordFeedback({type: 'error', messageKey: 'profile.changePassword.required'});
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setPasswordFeedback({type: 'error', messageKey: 'profile.changePassword.mismatch'});
      return;
    }

    setIsChangingPassword(true);
    const result = await authFacade.changePassword(senhaAntiga, novaSenha);
    setIsChangingPassword(false);

    if (result.error) {
      const messageKey = result.error.code === 'UNAUTHORIZED'
        ? 'profile.changePassword.wrongPassword'
        : 'profile.changePassword.failed';
      setPasswordFeedback({type: 'error', messageKey});
      return;
    }

    setSenhaAntiga('');
    setNovaSenha('');
    setConfirmarSenha('');
    setPasswordFeedback({type: 'success', messageKey: 'profile.changePassword.success'});
    setTimeout(() => setPasswordFeedback(null), 4000);
  }, [authFacade, confirmarSenha, novaSenha, senhaAntiga]);

  const signOut = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return {
    displayName,
    avatarUrl,
    isUploadingPhoto,
    photoFeedback,
    pickAndUploadPhoto,
    signOut,
    senhaAntiga,
    setSenhaAntiga,
    novaSenha,
    setNovaSenha,
    confirmarSenha,
    setConfirmarSenha,
    isChangingPassword,
    passwordFeedback,
    changePassword,
  };
};
