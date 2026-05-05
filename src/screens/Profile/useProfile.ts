/**
 * @fileoverview Hook for the ProfileScreen.
 *
 * Manages profile state, logout action, change-password flow, and photo upload.
 * Feedback is surfaced via inline state (no global toasts).
 * Name editing is not supported by the backend — display name is read-only.
 */
import {useCallback, useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import {useAppDispatch, useAppSelector} from '../../store';
import {logout, setAvatarUrl} from '@store/slices/authSlice';
import {useFacades} from '@services/facades';

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

export interface ProfileState {
  /** Current display name (read-only, sourced from auth state). */
  displayName: string;
  /** Current avatar URL, or null if no photo has been set. */
  avatarUrl: string | null;
  /** Whether a photo upload is in progress. */
  isUploadingPhoto: boolean;
  /** Inline feedback after a photo upload attempt. */
  photoFeedback: PhotoFeedback;
  /** Opens the system image picker and uploads the selected photo. */
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
 * Name editing is not supported by the backend — the display name is read-only.
 * All feedback is returned as inline state — no global toast banners are dispatched.
 *
 * @returns {@link ProfileState}
 */
export const useProfile = (): ProfileState => {
  const dispatch = useAppDispatch();
  const {authFacade, servidoresFacade} = useFacades();
  const user = useAppSelector(state => state.auth.user);

  const displayName = user?.fullName ?? '';
  const avatarUrl = user?.avatarUrl ?? null;

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<PhotoFeedback>(null);

  // Change-password form
  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback>(null);

  /**
   * Requests media library permission, opens the image picker, and uploads
   * the selected image to PATCH /servidores/me/foto-perfil.
   * On success, updates the Redux user.avatarUrl immediately.
   * Auto-clears success feedback after 4 seconds.
   */
  const pickAndUploadPhoto = useCallback(async (): Promise<void> => {
    setPhotoFeedback(null);

    // Request permission
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPhotoFeedback({type: 'error', messageKey: 'profile.photo.permissionDenied'});
      return;
    }

    // Open picker — allow JPEG, PNG, WebP; no editing to keep it simple
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const fileName = asset.fileName ?? `foto-${Date.now()}.jpg`;

    setIsUploadingPhoto(true);

    const uploadResult = await servidoresFacade.uploadFotoPerfil({uri, mimeType, fileName});

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

    // Persist the new URL in Redux (facade rewrites loopback hosts for devices)
    dispatch(setAvatarUrl(uploadResult.data.fotoPerfilUrl));
    setPhotoFeedback({type: 'success', messageKey: 'profile.photo.uploadSuccess'});
    setTimeout(() => setPhotoFeedback(null), 4000);
  }, [dispatch, servidoresFacade]);

  /**
   * Calls POST /auth/change-password via the auth facade.
   * Validates locally before calling the API.
   * Sets `passwordFeedback` with the result — no global toasts.
   *
   * @returns Void.
   */
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
    // Auto-clear success feedback after 4 s
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
