/**
 * @fileoverview Manual mock for expo-secure-store.
 * Prevents expo-modules-core native EventEmitter from crashing in Jest.
 */
export const getItemAsync = jest.fn().mockResolvedValue(null);
export const setItemAsync = jest.fn().mockResolvedValue(undefined);
export const deleteItemAsync = jest.fn().mockResolvedValue(undefined);
