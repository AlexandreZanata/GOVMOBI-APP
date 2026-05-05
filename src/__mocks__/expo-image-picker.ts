/**
 * @fileoverview Manual mock for expo-image-picker.
 */
export const MediaTypeOptions = {
  Images: 'Images',
  Videos: 'Videos',
  All: 'All',
};

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never',
}));

export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: true,
  assets: [],
}));

export default {
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
};
