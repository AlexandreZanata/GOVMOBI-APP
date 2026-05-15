/**
 * @fileoverview Normalizes image URIs from the picker for multipart upload on Android release builds.
 *
 * Content URIs (`content://`) are not always readable by React Native's fetch/FormData on
 * release builds. Copying into the app cache as `file://` avoids "Could not upload photo" failures.
 */
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Returns a `file://` URI suitable for FormData upload.
 *
 * @param uri - URI from expo-image-picker (`content://`, `file://`, or `ph://` on iOS).
 * @param fileName - Suggested file name for the cache copy.
 * @returns Local file URI ready for multipart upload.
 */
export async function prepareImageForUpload(uri: string, fileName: string): Promise<string> {
  if (uri.startsWith('file://')) {
    return uri;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return uri;
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const destination = `${cacheDir}upload-${Date.now()}-${safeName}`;

  try {
    await FileSystem.copyAsync({from: uri, to: destination});
    return destination;
  } catch (err) {
    console.warn('[prepareImageForUpload] copyAsync failed, using original uri', err);
    return uri;
  }
}
