"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/*
 * Flickering plus-sign grid.
 *
 * One requestAnimationFrame loop drives every cell: twinkles are time-based
 * sine envelopes, the hover halo is an eased radial falloff blended in and out
 * through a smoothed hover amount, and per-cell opacity eases toward its
 * target each frame (exponential smoothing, so it is frame-rate independent).
 *
 * Cells are created as plain DOM nodes rather than React elements so the loop
 * can write styles directly without re-rendering. Style writes are quantized
 * and diffed against the last written value to keep them off most frames.
 */

export const PLUS_PATH =
  "M24 10.2005H13.8004V0H10.2005V10.2005H0V13.8004H10.2005V24H13.8004V13.8004H24V10.2005Z";

export type PlusGridProps = {
  /** Number of rows. */
  rows?: number;
  /** Columns at or above `breakpoint`. */
  cols?: number;
  /** Columns below `breakpoint`. */
  colsMobile?: number;
  /** Viewport width (px) where the column count switches. */
  breakpoint?: number;
  /** Base px per plus, before the container-fit scale. */
  size?: number;
  /** Base px between cells, before the container-fit scale. */
  gap?: number;
  /** Floor for the container-fit scale, so gaps never collapse on tiny screens. */
  minScale?: number;
  /** Radius of the hover halo, measured in cells. */
  hoverRadius?: number;
  /** Resting opacity of an idle cell. */
  baseOpacity?: number;
  /** Resting opacity while the pointer is over the grid (dims the backdrop). */
  hoverBaseOpacity?: number;
  /** Fraction of cells that start a twinkle on each tick. */
  twinkleRate?: number;
  /** Twinkle duration range in ms. */
  twinkleDurationMin?: number;
  twinkleDurationMax?: number;
  /** Delay range between twinkle ticks, in ms. */
  tickMin?: number;
  tickMax?: number;
  /** Inner glow color for bright cells. */
  glowColor?: string;
  /** Outer, softer glow color for bright cells. */
  glowColorSoft?: string;
  className?: string;
  style?: CSSProperties;
};

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

// ms time constants for the exponential easing
const OPACITY_SMOOTHING = 25;
const HOVER_SMOOTHING = 100;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth01 = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

const ROOT_STYLE: CSSProperties = {
  display: "grid",
  width: "100%",
  marginInline: "auto",
  justifyContent: "center",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
};

export function PlusGrid({
  rows = 6,
  cols = 18,
  colsMobile = 12,
  breakpoint = 1080,
  size: baseSize = 24,
  gap: baseGap = 14,
  minScale = 0.5,
  hoverRadius: hoverRadiusCells = 3,
  baseOpacity = 0.33,
  hoverBaseOpacity = 0.18,
  twinkleRate = 0.04,
  twinkleDurationMin = 1000,
  twinkleDurationMax = 2000,
  tickMin = 400,
  tickMax = 800,
  glowColor = "var(--pg-glow1, rgba(255, 255, 255, 0.45))",
  glowColorSoft = "var(--pg-glow2, rgba(255, 255, 255, 0.18))",
  className,
  style,
}: PlusGridProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Every column exists up front; the responsive ones are hidden rather
    // than rebuilt, so a breakpoint cross is a display toggle.
    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
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
        svg.style.opacity = String(baseOpacity);

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
          opacity: baseOpacity,
          lastOpacity: baseOpacity,
          lastGlow: 0,
          twinkleStart: -1,
          twinkleDur: 0,
        });
      }
    }

    let currentCols = cols;
    let active = cells;
    let pitch = baseSize + baseGap;
    let hoverRadius = pitch * hoverRadiusCells;

    function layout() {
      const targetCols = window.innerWidth >= breakpoint ? cols : colsMobile;
      if (targetCols !== currentCols) {
        currentCols = targetCols;
        for (const cell of cells) {
          cell.wrap.style.display = cell.c < currentCols ? "grid" : "none";
        }
      }
      active = cells.filter((cell) => cell.c < currentCols);

      const avail = root!.clientWidth || root!.getBoundingClientRect().width;
      const baseWidth = currentCols * baseSize + (currentCols - 1) * baseGap;
      const scale = Math.max(minScale, Math.min(1, avail / baseWidth));

      const size = Math.round(baseSize * scale);
      const gap = Math.round(baseGap * scale);
      pitch = size + gap;
      hoverRadius = pitch * hoverRadiusCells;

      root!.style.gridTemplateColumns = `repeat(${currentCols}, ${size}px)`;
      root!.style.gridAutoRows = `${size}px`;
      root!.style.gap = `${gap}px`;

      // The tracks are narrower than the full-width root and centered by
      // `justify-content`, so cell centers have to start at that gutter or the
      // hover halo drifts right of the pointer.
      const trackWidth = currentCols * size + (currentCols - 1) * gap;
      const originX = Math.max(0, (avail - trackWidth) / 2);

      for (const cell of active) {
        cell.wrap.style.width = `${size}px`;
        cell.wrap.style.height = `${size}px`;
        cell.cx = originX + cell.c * pitch + size / 2;
        cell.cy = cell.r * pitch + size / 2;
      }
    }

    layout();

    const observer = new ResizeObserver(layout);
    observer.observe(root);

    if (reducedMotion) {
      return () => {
        observer.disconnect();
        root.replaceChildren();
      };
    }

    let hovering = false;
    let hoverAmount = 0; // smoothed 0..1
    let pointerX = 0;
    let pointerY = 0;
    let nextTickAt = performance.now() + 200;
    let lastTime = performance.now();
    let rafId = 0;

    function scheduleTwinkles(now: number) {
      const count = Math.max(1, Math.round(active.length * twinkleRate));
      for (let i = 0; i < count; i++) {
        const cell = active[Math.floor(Math.random() * active.length)];
        if (cell.twinkleStart < 0) {
          cell.twinkleStart = now;
          cell.twinkleDur = rand(twinkleDurationMin, twinkleDurationMax);
        }
      }
      nextTickAt = now + rand(tickMin, tickMax);
    }

    function frame(now: number) {
      // Clamped so a backgrounded tab does not resume with one huge step.
      const dt = Math.min(100, now - lastTime);
      lastTime = now;

      const hoverTarget = hovering ? 1 : 0;
      hoverAmount +=
        (hoverTarget - hoverAmount) * (1 - Math.exp(-dt / HOVER_SMOOTHING));
      if (Math.abs(hoverTarget - hoverAmount) < 0.001) {
        hoverAmount = hoverTarget;
      }

      // Twinkles keep running unless the halo is meaningfully visible.
      if (hoverAmount < 0.5 && now >= nextTickAt) scheduleTwinkles(now);

      const base =
        baseOpacity + (hoverBaseOpacity - baseOpacity) * hoverAmount;
      const radiusSq = hoverRadius * hoverRadius;

      for (const cell of active) {
        // Twinkle envelope: 0 -> 1 -> 0 sine over the twinkle duration.
        let twinkle = 0;
        if (cell.twinkleStart >= 0) {
          const t = (now - cell.twinkleStart) / cell.twinkleDur;
          if (t >= 1) {
            cell.twinkleStart = -1;
          } else {
            twinkle = Math.sin(Math.PI * t);
          }
        }

        // Hover halo: eased falloff from the pointer, scaled by hoverAmount.
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
          (target - cell.opacity) * (1 - Math.exp(-dt / OPACITY_SMOOTHING));

        const opacity = Math.round(cell.opacity * 500) / 500;
        if (opacity !== cell.lastOpacity) {
          cell.lastOpacity = opacity;
          cell.svg.style.opacity = String(opacity);
        }

        // Glow tracks the brightness boost; quantized to limit style writes.
        const glow = Math.round(bright * 20) / 20;
        if (glow !== cell.lastGlow) {
          cell.lastGlow = glow;
          if (glow > 0) {
            cell.svg.style.filter =
              `drop-shadow(0 0 ${(10 * glow).toFixed(1)}px ${glowColor}) ` +
              `drop-shadow(0 0 ${(16 * glow).toFixed(1)}px ${glowColorSoft})`;
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
     * Mouse: the halo appears on enter and follows the cursor.
     * Touch: it appears on finger-down, follows the drag, and fades on lift
     * (pointerup/cancel) so a tap never freezes the hover state. The root sets
     * touch-action:none, so touches starting on the grid drive the halo
     * instead of scrolling the page.
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
  }, [
    rows,
    cols,
    colsMobile,
    breakpoint,
    baseSize,
    baseGap,
    minScale,
    hoverRadiusCells,
    baseOpacity,
    hoverBaseOpacity,
    twinkleRate,
    twinkleDurationMin,
    twinkleDurationMax,
    tickMin,
    tickMax,
    glowColor,
    glowColorSoft,
  ]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ ...ROOT_STYLE, ...style }}
      aria-hidden="true"
    />
  );
}
