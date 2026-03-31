/**
 * Haptic feedback utilities using the Web Vibration API.
 * Safe to import in any component — all calls guard against SSR and
 * browsers that do not support navigator.vibrate (e.g. iOS Safari).
 */

/** Vibration pattern (ms) that simulates a heartbeat: two short pulses. */
export const HEARTBEAT_PATTERN: number[] = [200, 100, 200];

/** Quick tactile acknowledgement for taps. */
export const TAP_PATTERN: number[] = [14];

/** Slightly deeper press feedback for long presses or hold states. */
export const PRESS_PATTERN: number[] = [26];

/** Positive confirmation (send, save, complete). */
export const SUCCESS_PATTERN: number[] = [20, 30, 40];

/** Warm "hug" envelope for intimate interactions. */
export const HUG_PATTERN: number[] = [30, 40, 60, 40, 30];

/** Celebration pulse train for game wins and key moments. */
export const CELEBRATE_PATTERN: number[] = [18, 24, 18, 24, 32];

/** Soft failure pattern for recoverable errors. */
export const SOFT_ERROR_PATTERN: number[] = [50, 35, 50];

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Trigger any vibration pattern in a single safe call. */
export function triggerHaptic(pattern: number[] | number): void {
  if (!canVibrate()) return;
  navigator.vibrate(pattern);
}

/**
 * Trigger a heartbeat vibration on the device.
 * No-op when called on the server or in unsupported browsers.
 */
export function vibrateHeartbeat(): void {
  triggerHaptic(HEARTBEAT_PATTERN);
}

export function vibrateTap(): void {
  triggerHaptic(TAP_PATTERN);
}

export function vibratePress(): void {
  triggerHaptic(PRESS_PATTERN);
}

export function vibrateSuccess(): void {
  triggerHaptic(SUCCESS_PATTERN);
}

export function vibrateCelebrate(): void {
  triggerHaptic(CELEBRATE_PATTERN);
}

export function vibrateHug(): void {
  triggerHaptic(HUG_PATTERN);
}

export function vibrateSoftError(): void {
  triggerHaptic(SOFT_ERROR_PATTERN);
}
