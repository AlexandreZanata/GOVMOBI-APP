/**
 * Formats a duration in seconds into a zero-padded MM:SS string.
 *
 * @param totalSeconds - Total duration in seconds (must be >= 0).
 * @returns Zero-padded MM:SS string (e.g. "03:07").
 *
 * @example
 * formatDuration(187) // "03:07"
 * formatDuration(0)   // "00:00"
 */
export const formatDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};
