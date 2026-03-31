/**
 * Haptic feedback utilities using the Web Vibration API.
 * Safe to import in any component — all calls guard against SSR and
 * browsers that do not support navigator.vibrate (e.g. iOS Safari).
 */

/** Vibration pattern (ms) that simulates a heartbeat: two short pulses. */
export const HEARTBEAT_PATTERN: number[] = [200, 100, 200];

/**
 * Trigger a heartbeat vibration on the device.
 * No-op when called on the server or in unsupported browsers.
 */
export function vibrateHeartbeat(): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(HEARTBEAT_PATTERN);
  }
}
