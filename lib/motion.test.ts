import { describe, expect, it } from "vitest";
import { shouldAnimate } from "./motion";

describe("shouldAnimate", () => {
  it("moves only when the user, the system, and the device all allow it", () => {
    expect(
      shouldAnimate({
        prefersReducedMotion: false,
        userReducedMotion: false,
        hardwareConcurrency: 8,
      }),
    ).toBe(true);
  });

  it("stops for reduced motion, the settings toggle, or a low-end device", () => {
    expect(
      shouldAnimate({
        prefersReducedMotion: true,
        userReducedMotion: false,
        hardwareConcurrency: 8,
      }),
    ).toBe(false);
    expect(
      shouldAnimate({
        prefersReducedMotion: false,
        userReducedMotion: true,
        hardwareConcurrency: 8,
      }),
    ).toBe(false);
    expect(
      shouldAnimate({
        prefersReducedMotion: false,
        userReducedMotion: false,
        hardwareConcurrency: 4,
      }),
    ).toBe(false);
  });
});
