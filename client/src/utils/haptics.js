/**
 * BUDO Mobile Haptic Feedback Helper
 */
export function triggerHaptic(type = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'light') {
        navigator.vibrate(15);
      } else if (type === 'medium') {
        navigator.vibrate(35);
      } else if (type === 'heavy') {
        navigator.vibrate([40, 30, 60]);
      } else if (type === 'victory') {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    } catch (e) {
      // Haptics not allowed or blocked
    }
  }
}
