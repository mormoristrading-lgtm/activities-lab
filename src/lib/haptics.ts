/** Short haptic buzz on supported devices (Android Chrome); no-op on iOS Safari. */
export const buzz = (ms = 10): void => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
}
