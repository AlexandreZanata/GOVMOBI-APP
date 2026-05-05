/**
 * @fileoverview Deterministic network simulation utilities for mock services.
 */

export interface FailureConfig {
  minRate?: number;
  maxRate?: number;
  seed?: number;
}

const DEFAULT_MIN_FAILURE_RATE = 0.1;
const DEFAULT_MAX_FAILURE_RATE = 0.2;
const DEFAULT_SEED = 13;

let sequence = 0;

/**
 * Simulates backend response latency using a Promise timer.
 *
 * @param milliseconds Delay duration in milliseconds.
 * @returns Promise that resolves after the provided delay.
 */
export const delay = async (milliseconds: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });

/**
 * Produces a deterministic pseudo-random float between 0 and 1.
 *
 * @param seedNumber Seed value used by the pseudo-random generator.
 * @returns Deterministic random-like number from 0 (inclusive) to 1 (exclusive).
 */
const seededRandom = (seedNumber: number): number => {
  const sine = Math.sin(seedNumber) * 10000;
  return sine - Math.floor(sine);
};

/**
 * Determines whether a mock request should fail.
 *
 * Failure probability is deterministic between 10% and 20% by default.
 * This validates error boundaries and retry flows while keeping tests reproducible.
 *
 * @param key Stable key for an operation (for example, `chat.sendMessage`).
 * @param config Optional probability and seed overrides.
 * @returns True when the operation should fail, false otherwise.
 */
export const shouldFail = (
  key: string,
  config: FailureConfig = {},
): boolean => {
  const minRate = config.minRate ?? DEFAULT_MIN_FAILURE_RATE;
  const maxRate = config.maxRate ?? DEFAULT_MAX_FAILURE_RATE;
  const seed = config.seed ?? DEFAULT_SEED;

  const boundedMin = Math.max(0, Math.min(1, minRate));
  const boundedMax = Math.max(boundedMin, Math.min(1, maxRate));
  const dynamicRate = boundedMin + (boundedMax - boundedMin) / 2;

  sequence += 1;
  const keyHash = key
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const randomLike = seededRandom(seed + keyHash + sequence);

  return randomLike < dynamicRate;
};

/**
 * Generates a stable identifier for mock entities.
 *
 * @param prefix Entity prefix to improve debuggability.
 * @returns Deterministic unique-ish identifier string.
 */
export const mockId = (prefix: string): string => {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
};
