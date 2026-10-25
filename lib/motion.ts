/** Whether the purple background should keep moving. */
export function shouldAnimate(input: {
  prefersReducedMotion: boolean;
  userReducedMotion: boolean;
  hardwareConcurrency: number;
}): boolean {
  if (input.prefersReducedMotion || input.userReducedMotion) return false;
  if (input.hardwareConcurrency > 0 && input.hardwareConcurrency <= 4) return false;
  return true;
}

export function readMotionSnapshot(): {
  prefersReducedMotion: boolean;
  userReducedMotion: boolean;
  hardwareConcurrency: number;
} {
  if (typeof window === "undefined") {
    return {
      prefersReducedMotion: false,
      userReducedMotion: false,
      hardwareConcurrency: 8,
    };
  }
  let userReducedMotion = false;
  try {
    const raw = window.localStorage.getItem("gbth_settings");
    if (raw) {
      const parsed = JSON.parse(raw) as { reduce_motion?: boolean };
      userReducedMotion = parsed.reduce_motion === true;
    }
  } catch {
    userReducedMotion = false;
  }
  return {
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    userReducedMotion,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 8,
  };
}
