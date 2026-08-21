"use client";

import { useEffect, useRef } from "react";
import { PLUS_PATH } from "react-plus-grid";

/*
 * Wave variant of the plus grid, shown on the access page after a correct
 * password. Same grid shape and sizing as the home page's PlusGrid, but
 * instead of twinkles/hover the cells ride a 3D wave: each plus scales up
 * and down, lifts toward the viewer (translateZ under a perspective), and
 * brightens near the wave crests, with glow at the peaks.
 */

const CFG = {
  rows: 6,
  colsDesktop: 18,
  colsMobile: 12,
  breakpoint: 1080,
  size: 24,
  gap: 14,
  minScale: 0.5,
  baseDim: 0.18,
  waveSpeed: 0.00125,
  depthMax: 32,
  scaleMin: 0.92,
  scaleMax: 1.18,
  glowThreshold: 0.4, // only cells above this wave height get a drop-shadow
} as const;

type WaveCell = {
  wrap: HTMLDivElement;
  svg: SVGSVGElement;
  r: number;
  c: number;
  phase: number;
};

export function PlusGridWave() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cells: WaveCell[] = [];
    for (let r = 0; r < CFG.rows; r++) {
      for (let c = 0; c < CFG.colsDesktop; c++) {
        const wrap = document.createElement("div");
        wrap.style.display = "grid";
        wrap.style.placeItems = "center";
        wrap.style.transformStyle = "preserve-3d";
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.opacity = String(CFG.baseDim);
        svg.style.willChange = "transform, opacity";
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", PLUS_PATH);
        path.setAttribute("fill", "currentColor");
        svg.appendChild(path);
        wrap.appendChild(svg);
        root.appendChild(wrap);
        cells.push({ wrap, svg, r, c, phase: Math.random() * Math.PI * 2 });
      }
    }

    let currentCols: number = CFG.colsDesktop;

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
      const baseWidth = currentCols * CFG.size + (currentCols - 1) * CFG.gap;
      const scale = Math.max(CFG.minScale, Math.min(1, avail / baseWidth));

      const size = Math.round(CFG.size * scale);
      const gap = Math.round(CFG.gap * scale);

      root!.style.gridTemplateColumns = `repeat(${currentCols}, ${size}px)`;
      root!.style.gridAutoRows = `${size}px`;
      root!.style.gap = `${gap}px`;

      for (const cell of cells) {
        cell.wrap.style.width = `${size}px`;
        cell.wrap.style.height = `${size}px`;
      }
    }

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(root);

    if (reducedMotion) {
      // Static grid at the home page's resting brightness
      for (const cell of cells) cell.svg.style.opacity = "0.33";
      return () => {
        observer.disconnect();
        root.replaceChildren();
      };
    }

    const start = performance.now();
    let rafId = 0;

    function frame(now: number) {
      const t = (now - start) * CFG.waveSpeed;
      const rowsMinus1 = Math.max(1, CFG.rows - 1);
      const colsMinus1 = Math.max(1, currentCols - 1);

      for (const cell of cells) {
        if (cell.c >= currentCols) continue;
        const nx = cell.c / colsMinus1;
        const ny = cell.r / rowsMinus1;

        // Two crossed waves make a rolling 2D surface; the per-cell phase
        // keeps the pattern from looking perfectly mechanical.
        const wave1 = Math.sin(nx * 2 * Math.PI + t);
        const wave2 = Math.cos(ny * 2 * Math.PI + t * 0.7 + cell.phase);
        const height = (wave1 * 0.7 + wave2 * 0.3 + 1) / 2; // 0..1

        const opacity = CFG.baseDim + height * (1 - CFG.baseDim);
        const depth = height * CFG.depthMax;
        const scale = CFG.scaleMin + height * (CFG.scaleMax - CFG.scaleMin);
        const offsetX = (nx - 0.5) * 6;
        const offsetY = (ny - 0.5) * 4;

        cell.svg.style.opacity = opacity.toFixed(3);
        cell.svg.style.transform = `translate3d(${offsetX.toFixed(
          1
        )}px, ${offsetY.toFixed(1)}px, ${depth.toFixed(1)}px) scale(${scale.toFixed(3)})`;

        if (height > CFG.glowThreshold) {
          const glow = (height - CFG.glowThreshold) / (1 - CFG.glowThreshold);
          cell.svg.style.filter = `drop-shadow(0 0 ${(8 * glow).toFixed(
            1
          )}px var(--pg-glow1)) drop-shadow(0 0 ${(14 * glow).toFixed(
            1
          )}px var(--pg-glow2))`;
        } else if (cell.svg.style.filter) {
          cell.svg.style.filter = "";
        }
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      root.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="plus-grid mx-auto grid w-full justify-center text-foreground select-none [perspective:900px]"
      aria-hidden="true"
    />
  );
}
