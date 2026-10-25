"use client";

import { useEffect } from "react";
import { readMotionSnapshot, shouldAnimate } from "@/lib/motion";

/** Mirrors reduced-motion into a document attribute so CSS can stop transitions. */
export function MotionRoot() {
  useEffect(() => {
    const apply = () => {
      const animate = shouldAnimate(readMotionSnapshot());
      document.documentElement.dataset.reduceMotion = animate ? "false" : "true";
    };
    apply();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", apply);
    window.addEventListener("gbth-settings-updated", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("gbth-settings-updated", apply);
    };
  }, []);
  return null;
}
