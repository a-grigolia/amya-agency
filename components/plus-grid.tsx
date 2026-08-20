"use client";

import { useEffect, useRef } from "react";

/*
 * Flickering plus-sign grid.
 *
 * Rewritten from the original Webflow embed for smoother motion: instead of
 * CSS transitions snapped by setTimeout, a single requestAnimationFrame loop
 * drives every cell. Twinkles are time-based sine envelopes, the hover halo
 * blends in and out through a smoothed hover amount, and per-cell opacity
 * eases toward its target each frame (exponential smoothing). Visual config
 * (grid shape, dim levels, glow, timing) matches the original.
 */

const CFG = {
  rows: 6,
  colsDesktop: 18,
  colsMobile: 12,
  breakpoint: 1080, // viewport px where the column count switches
  size: 24, // base px per plus (unscaled)
  gap: 14, // base px between cells (unscaled)
  minScale: 0.5, // clamp so gaps never collapse on tiny screens
  hoverRadiusCells: 3.0,
  baseDim: 0.33,
  hoverBaseDim: 0.18,
  twinkleRate: 0.04, // fraction of cells triggered per tick
  twinkleDurMin: 1000,
  twinkleDurMax: 2000,
  tickMin: 400,
  tickMax: 800,
  opacitySmoothing: 25, // ms time constant for per-cell opacity easing
  hoverSmoothing: 100, // ms time constant for halo fade in/out
} as const;

export const PLUS_PATH =
  "M24 10.2005H13.8004V0H10.2005V10.2005H0V13.8004H10.2005V24H13.8004V13.8004H24V10.2005Z";

type Cell = {
  wrap: HTMLDivElement;
  svg: SVGSVGElement;
  r: number;
  c: number;
  cx: number;
  cy: number;
  opacity: number;
  lastOpacity: number;
  lastGlow: number;
  twinkleStart: number; // -1 when idle
  twinkleDur: number;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth01 = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function PlusGrid() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Build cells imperatively so the rAF loop can write styles directly
    // without touching React state.
    const cells: Cell[] = [];
    for (let r = 0; r < CFG.rows; r++) {
      for (let c = 0; c < CFG.colsDesktop; c++) {
        const wrap = document.createElement("div");
        wrap.style.display = "grid";
        wrap.style.placeItems = "center";
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.opacity = String(CFG.baseDim);
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", PLUS_PATH);
        path.setAttribute("fill", "currentColor");
        svg.appendChild(path);
        wrap.appendChild(svg);
        root.appendChild(wrap);
        cells.push({
          wrap,
          svg,
          r,
          c,
          cx: 0,
          cy: 0,
          opacity: CFG.baseDim,
          lastOpacity: CFG.baseDim,
          lastGlow: 0,
          twinkleStart: -1,
          twinkleDur: 0,
        });
      }
    }

    let currentCols: number = CFG.colsDesktop;
    let pitch = CFG.size + CFG.gap;
    let hoverRadius = pitch * CFG.hoverRadiusCells;

    const activeCells = () => cells.filter((cell) => cell.c < currentCols);

    function layout() {
      const targetCols =
        window.innerWidth >= CFG.breakpoint ? CFG.colsDesktop : CFG.colsMobile;
      if (targetCols !== currentCols) {
        currentCols = targetCols;
        for (const cell of cells) {
          cell.wrap.style.display = cell.c < currentCols ? "grid" : "none";
        }
      }

      const avail = root!.clientWidth || root!.getBoundingClientRect().width;
      const baseWidth =
        currentCols * CFG.size + (currentCols - 1) * CFG.gap;
      const scale = Math.max(CFG.minScale, Math.min(1, avail / baseWidth));

      const size = Math.round(CFG.size * scale);
      const gap = Math.round(CFG.gap * scale);
      pitch = size + gap;
      hoverRadius = pitch * CFG.hoverRadiusCells;

      root!.style.gridTemplateColumns = `repeat(${currentCols}, ${size}px)`;
      root!.style.gridAutoRows = `${size}px`;
      root!.style.gap = `${gap}px`;

      // The tracks are narrower than the full-width root and centered by
      // `justify-center`, so cell centers have to start at that gutter or the
      // hover halo drifts right of the pointer.
      const trackWidth = currentCols * size + (currentCols - 1) * gap;
      const originX = Math.max(0, (avail - trackWidth) / 2);

      for (const cell of activeCells()) {
        cell.wrap.style.width = `${size}px`;
        cell.wrap.style.height = `${size}px`;
        cell.cx = originX + cell.c * pitch + size / 2;
        cell.cy = cell.r * pitch + size / 2;
      }
    }

    layout();

    if (reducedMotion) {
      const observer = new ResizeObserver(layout);
      observer.observe(root);
      return () => {
        observer.disconnect();
        root.replaceChildren();
      };
    }

    // ---- Animation state ----
    let hovering = false;
    let hoverAmount = 0; // smoothed 0..1
    let pointerX = 0;
    let pointerY = 0;
    let nextTickAt = performance.now() + 200;
    let rafId = 0;
    let lastTime = performance.now();

    function scheduleTwinkles(now: number) {
      const active = activeCells();
      const count = Math.max(1, Math.round(active.length * CFG.twinkleRate));
      for (let i = 0; i < count; i++) {
        const cell = active[Math.floor(Math.random() * active.length)];
        if (cell.twinkleStart < 0) {
          cell.twinkleStart = now;
          cell.twinkleDur = rand(CFG.twinkleDurMin, CFG.twinkleDurMax);
        }
      }
      nextTickAt = now + rand(CFG.tickMin, CFG.tickMax);
    }

    function frame(now: number) {
      const dt = Math.min(100, now - lastTime);
      lastTime = now;

      // Smooth the halo in/out instead of snapping on enter/leave
      const hoverTarget = hovering ? 1 : 0;
      hoverAmount +=
        (hoverTarget - hoverAmount) * (1 - Math.exp(-dt / CFG.hoverSmoothing));
      if (Math.abs(hoverTarget - hoverAmount) < 0.001) {
        hoverAmount = hoverTarget;
      }

      // Twinkles keep running unless the halo is meaningfully visible
      if (hoverAmount < 0.5 && now >= nextTickAt) scheduleTwinkles(now);

      const base =
        CFG.baseDim + (CFG.hoverBaseDim - CFG.baseDim) * hoverAmount;
      const radiusSq = hoverRadius * hoverRadius;

      for (const cell of activeCells()) {
        // Twinkle envelope: 0 -> 1 -> 0 sine over the twinkle duration
        let twinkle = 0;
        if (cell.twinkleStart >= 0) {
          const t = (now - cell.twinkleStart) / cell.twinkleDur;
          if (t >= 1) {
            cell.twinkleStart = -1;
          } else {
            twinkle = Math.sin(Math.PI * t);
          }
        }

        // Hover halo: eased falloff from the pointer, scaled by hoverAmount
        let halo = 0;
        if (hoverAmount > 0.001) {
          const dx = pointerX - cell.cx;
          const dy = pointerY - cell.cy;
          const d2 = dx * dx + dy * dy;
          if (d2 <= radiusSq) {
            halo = smooth01(1 - Math.sqrt(d2) / hoverRadius) * hoverAmount;
          }
        }

        const bright = Math.max(twinkle, halo);
        const target = base + (1 - base) * bright;
        cell.opacity +=
          (target - cell.opacity) *
          (1 - Math.exp(-dt / CFG.opacitySmoothing));

        const opacity = Math.round(cell.opacity * 500) / 500;
        if (opacity !== cell.lastOpacity) {
          cell.lastOpacity = opacity;
          cell.svg.style.opacity = String(opacity);
        }

        // Glow tracks the brightness boost; quantized to limit style writes
        const glow = Math.round(bright * 20) / 20;
        if (glow !== cell.lastGlow) {
          cell.lastGlow = glow;
          if (glow > 0) {
            cell.svg.style.filter = `drop-shadow(0 0 ${(10 * glow).toFixed(
              1
            )}px var(--pg-glow1)) drop-shadow(0 0 ${(16 * glow).toFixed(
              1
            )}px var(--pg-glow2))`;
            cell.svg.style.transform = `scale(${1 + 0.04 * glow})`;
          } else {
            cell.svg.style.filter = "";
            cell.svg.style.transform = "";
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    }

    function updatePointer(e: PointerEvent) {
      const rect = root!.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    }

    /*
     * Mouse: halo appears on enter and follows the cursor.
     * Touch: halo appears on finger-down, follows the drag, and fades on
     * lift (pointerup/cancel) so a tap never freezes the hover state.
     * The root has touch-action:none, so touches that start on the grid
     * drive the halo instead of scrolling/bouncing the page.
     */
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // touch starts on pointerdown
      hovering = true;
      updatePointer(e);
    };
    const onDown = (e: PointerEvent) => {
      hovering = true;
      updatePointer(e);
    };
    const onMove = (e: PointerEvent) => {
      hovering = true;
      updatePointer(e);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") hovering = false;
    };
    const onLeave = () => {
      hovering = false;
    };

    root.addEventListener("pointerenter", onEnter, { passive: true });
    root.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointercancel", onUp, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });

    const observer = new ResizeObserver(layout);
    observer.observe(root);
    window.addEventListener("resize", layout);

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", layout);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("pointerleave", onLeave);
      root.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="plus-grid mx-auto grid w-full touch-none justify-center text-foreground select-none [-webkit-touch-callout:none]"
      aria-hidden="true"
    />
  );
}
