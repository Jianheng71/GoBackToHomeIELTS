"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { readMotionSnapshot, shouldAnimate } from "@/lib/motion";

const DEEP = "rgba(61, 42, 92, 0.5)";
const MID = "rgba(110, 74, 158, 0.28)";
const SOFT = "rgba(167, 139, 250, 0.16)";
const DOT = "rgba(196, 181, 253, 0.45)";

type Blob = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  color: string;
};

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

/**
 * Original study-desk lighting: slow purple blobs on the void color.
 * Practice uses the slowest drift. Reduced motion draws one static frame.
 */
export function PurpleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const quiet = pathname === "/practice";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let lastDraw = 0;
    let blobs: Blob[] = [];
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let running = true;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mobile = width < 768;
      const dotCount = mobile ? (quiet ? 16 : 32) : quiet ? 24 : 48;
      blobs = [
        { x: width * 0.2, y: height * 0.15, radius: Math.max(width, height) * 0.42, phase: 0.4, color: DEEP },
        { x: width * 0.82, y: height * 0.72, radius: Math.max(width, height) * 0.36, phase: 1.7, color: MID },
        { x: width * 0.5, y: height * 0.45, radius: Math.max(width, height) * 0.22, phase: 2.6, color: SOFT },
      ];
      dots = Array.from({ length: dotCount }, (_, index) => ({
        x: ((index * 97) % 100) / 100 * width,
        y: ((index * 53) % 100) / 100 * height,
        vx: ((index % 5) - 2) * 0.06,
        vy: ((index % 7) - 3) * 0.05,
        radius: index % 4 === 0 ? 1.6 : 1,
      }));
    };

    const paint = (time: number, animate: boolean) => {
      context.clearRect(0, 0, width, height);
      const speed = quiet ? 0.5 : 1;
      const drift = animate ? time * 0.00005 * speed : 0;
      for (const blob of blobs) {
        const x = blob.x + Math.cos(drift + blob.phase) * (animate ? width * 0.025 : 0);
        const y = blob.y + Math.sin(drift * 0.8 + blob.phase) * (animate ? height * 0.02 : 0);
        const gradient = context.createRadialGradient(x, y, 0, x, y, blob.radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, "rgba(14, 11, 20, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, blob.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = DOT;
      for (const dot of dots) {
        if (animate) {
          dot.x += dot.vx * speed;
          dot.y += dot.vy * speed;
          if (dot.x < 0) dot.x = width;
          if (dot.x > width) dot.x = 0;
          if (dot.y < 0) dot.y = height;
          if (dot.y > height) dot.y = 0;
        }
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const start = () => {
      stop();
      const animate = shouldAnimate(readMotionSnapshot());
      canvas.dataset.animating = animate ? "true" : "false";
      canvas.dataset.motion = quiet ? "quiet" : "calm";
      if (!animate || !running || document.hidden) {
        paint(0, false);
        return;
      }
      const loop = (time: number) => {
        if (!running || document.hidden) return;
        if (time - lastDraw >= 33) {
          paint(time, true);
          lastDraw = time;
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      start();
    };

    const observer = new IntersectionObserver((entries) => {
      running = entries.some((entry) => entry.isIntersecting);
      if (!running) stop();
      else start();
    });

    const onResize = () => {
      layout();
      start();
    };

    layout();
    start();
    observer.observe(canvas);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("gbth-settings-updated", start);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", start);

    return () => {
      running = false;
      stop();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("gbth-settings-updated", start);
      media.removeEventListener("change", start);
    };
  }, [quiet]);

  return (
    <div className="purple-bg" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
