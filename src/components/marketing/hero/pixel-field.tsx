"use client";

import * as React from "react";
import { createRng } from "@/lib/utils";

/**
 * "Payment pulse" — a field of game-like blocks. Every lit block is a payment
 * somewhere on the platform. A purchase in the hero sandbox triggers a burst.
 * Canvas-based, paused off-screen, static under prefers-reduced-motion.
 */
export const PURCHASE_EVENT = "paymc:purchase";

interface Cell {
  x: number;
  y: number;
  life: number; // 1 → 0
  decay: number;
  ice: boolean;
}

export function PixelField({ className, burstOrigin = { x: 0.72, y: 0.48 } }: { className?: string; burstOrigin?: { x: number; y: number } }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rng = createRng(20261106);
    const PITCH = 16;
    const SIZE = 12;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let raf = 0;
    let running = false;
    let last = 0;
    let spawnAcc = 0;
    const cells: Cell[] = [];
    let base: HTMLCanvasElement | null = null;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      cols = Math.ceil(w / PITCH);
      rows = Math.ceil(h / PITCH);
      // pre-render the faint static grid once
      base = document.createElement("canvas");
      base.width = canvas!.width;
      base.height = canvas!.height;
      const b = base.getContext("2d");
      if (b) {
        b.scale(dpr, dpr);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const n = rng();
            b.fillStyle = n > 0.985 ? "rgba(92,152,255,0.10)" : "rgba(148,166,204,0.05)";
            b.fillRect(x * PITCH, y * PITCH, SIZE, SIZE);
          }
        }
      }
      draw();
    }

    function spawn(x: number, y: number, strong = false) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      cells.push({ x, y, life: 1, decay: (strong ? 0.55 : 0.35) + rng() * 0.5, ice: rng() > 0.62 });
    }

    function burst() {
      const cx = Math.floor(cols * burstOrigin.x);
      const cy = Math.floor(rows * burstOrigin.y);
      for (let i = 0; i < 46; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.pow(rng(), 0.6) * 11;
        spawn(cx + Math.round(Math.cos(a) * r * 1.6), cy + Math.round(Math.sin(a) * r), true);
      }
      if (!running && !reduce) start();
    }

    function draw() {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      if (base) ctx!.drawImage(base, 0, 0);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const c of cells) {
        const a = Math.max(0, c.life);
        ctx!.fillStyle = c.ice ? `rgba(85,207,255,${(a * 0.55).toFixed(3)})` : `rgba(51,119,255,${(a * 0.6).toFixed(3)})`;
        ctx!.fillRect(c.x * PITCH, c.y * PITCH, SIZE, SIZE);
        if (a > 0.7) {
          ctx!.fillStyle = `rgba(237,241,248,${((a - 0.7) * 0.5).toFixed(3)})`;
          ctx!.fillRect(c.x * PITCH + 4, c.y * PITCH + 4, 4, 4);
        }
      }
    }

    function tick(t: number) {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      spawnAcc += dt * 5.5; // ambient payments per second
      while (spawnAcc > 1) {
        spawnAcc -= 1;
        spawn(Math.floor(rng() * cols), Math.floor(rng() * rows));
      }
      for (let i = cells.length - 1; i >= 0; i--) {
        cells[i].life -= cells[i].decay * dt;
        if (cells[i].life <= 0) cells.splice(i, 1);
      }
      draw();
      if (running) raf = requestAnimationFrame(tick);
    }

    function start() {
      if (running || reduce) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(PURCHASE_EVENT, burst);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(PURCHASE_EVENT, burst);
    };
  }, [burstOrigin.x, burstOrigin.y]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
