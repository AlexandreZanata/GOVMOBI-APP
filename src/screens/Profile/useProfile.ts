/**
 * @fileoverview Hook for the ProfileScreen.
 *
 * Manages profile edit state, save/logout actions, and the change-password flow.
 * Feedback is surfaced via inline state (no global toasts).
 */
import {useCallback, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../store';
import {logout, setUser} from '@store/slices/authSlice';
import {useFacades} from '@services/facades';
import {useTranslation} from 'react-i18next';

/** Inline feedback for the change-password form. */
export type PasswordFeedback =
  | {type: 'success'; messageKey: string}
  | {type: 'error'; messageKey: string}
  | null;

export interface ProfileState {
  /** Current display name (may be in edit mode). */
  displayName: string;
  setDisplayName: (name: string) => void;
  isEditing: boolean;
  isSaving: boolean;
  toggleEdit: () => void;
  saveProfile: () => Promise<void>;
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
 * Manages profile edit state, save/logout actions, and the change-password flow.
 * All feedback is returned as inline state — no global toast banners are dispatched.
 *
 * @returns {@link ProfileState}
 */
export const useProfile = (): ProfileState => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {authFacade} = useFacades();
  const user = useAppSelector(state => state.auth.user);

  const [displayName, setDisplayName] = useState(user?.fullName ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Change-password form
  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback>(null);

  const toggleEdit = useCallback(() => {
    if (isEditing) {
      setDisplayName(user?.fullName ?? '');
    }
    setIsEditing(prev => !prev);
  }, [isEditing, user?.fullName]);

  const saveProfile = useCallback(async (): Promise<void> => {
    if (!user) return;
    setIsSaving(true);

    const extendedFacade = authFacade as typeof authFacade & {
      updateProfile?: (input: {fullName: string}) => Promise<{error: unknown} | null>;
    };
    const result = await extendedFacade.updateProfile?.({fullName: displayName});
    setIsSaving(false);

    if (result?.error) return;

    dispatch(setUser({...user, fullName: displayName}));
    setIsEditing(false);
  }, [authFacade, dispatch, displayName, user]);

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

  // Keep t in scope for the interface but avoid unused-var lint
  void t;

  const signOut = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return {
    displayName,
    setDisplayName,
    isEditing,
    isSaving,
    toggleEdit,
    saveProfile,
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
