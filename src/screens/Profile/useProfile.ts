/**
 * @fileoverview Hook for the ProfileScreen.
 */
import {useCallback, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../store';
import {logout, setUser} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {useFacades} from '@services/facades';
import {useTranslation} from 'react-i18next';

export interface ProfileState {
  /** Current display name (may be in edit mode). */
  displayName: string;
  setDisplayName: (name: string) => void;
  isEditing: boolean;
  isSaving: boolean;
  toggleEdit: () => void;
  saveProfile: () => Promise<void>;
  signOut: () => void;
}

/**
 * Manages profile edit state and save/logout actions.
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

  const toggleEdit = useCallback(() => {
    if (isEditing) {
      // Cancel — reset to original
      setDisplayName(user?.fullName ?? '');
    }
    setIsEditing(prev => !prev);
  }, [isEditing, user?.fullName]);

  const saveProfile = useCallback(async (): Promise<void> => {
    if (!user) return;
    setIsSaving(true);

    // updateProfile is an optional extension — gracefully skip if not implemented
    const extendedFacade = authFacade as typeof authFacade & {
      updateProfile?: (input: {fullName: string}) => Promise<{error: unknown} | null>;
    };
    const result = await extendedFacade.updateProfile?.({fullName: displayName});
    setIsSaving(false);

    if (result?.error) {
      dispatch(
        addToast({
          id: `profile-error-${Date.now()}`,
          message: t('profile.toast.updateFailed'),
          type: 'error',
        }),
      );
      return;
    }

    dispatch(setUser({...user, fullName: displayName}));
    dispatch(
      addToast({
        id: `profile-saved-${Date.now()}`,
        message: t('profile.toast.updated'),
        type: 'success',
      }),
    );
    setIsEditing(false);
  }, [authFacade, dispatch, displayName, t, user]);

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
  };
};
