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
 *
 * With `snake` enabled, clicking the grid starts a game of snake on the same
 * cells: the snake and food are extra brightness sources fed into the shared
 * easing pipeline, so segments light up and vacated cells trail off with the
 * same smoothing the twinkles use.
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
  /**
   * Easter egg: clicking the grid (or pressing an arrow key while hovering
   * it) starts a game of snake, steered with the arrow keys. Wrap-around
   * walls, food, growth, death on self-collision. Escape or dying fades back
   * to the ambient animation.
   */
  snake?: boolean;
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

// Snake: base ms per move, how much each food speeds it up, and the floor.
const SNAKE_TICK = 160;
const SNAKE_TICK_STEP = 5;
const SNAKE_TICK_MIN = 100;
const SNAKE_START_LENGTH = 3;
// Brightness falls off from head (1) toward the tail by this much.
const SNAKE_TAIL_FADE = 0.45;

const SNAKE_DIRS: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

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
  snake = false,
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

    /*
     * Snake state. Segments are [row, col], head first. The overlay holds a
     * per-cell brightness (indexed r * cols + c) repainted on each move, and
     * the frame loop feeds it into the same easing as twinkles and the halo.
     * snakeAmount smooths 0..1 across game start/end so the backdrop dims in
     * and the board fades out instead of snapping.
     */
    let snakePlaying = false;
    let snakeAmount = 0;
    let snakeSegs: Array<[number, number]> = [];
    let snakeDir: readonly [number, number] = [0, 1];
    let dirQueue: Array<readonly [number, number]> = [];
    let foodR = -1;
    let foodC = -1;
    let nextMoveAt = 0;
    const overlay = new Float32Array(rows * cols);

    function endSnake() {
      snakePlaying = false;
      dirQueue.length = 0;
      overlay.fill(0);
    }

    function layout() {
      const targetCols = window.innerWidth >= breakpoint ? cols : colsMobile;
      if (targetCols !== currentCols) {
        currentCols = targetCols;
        for (const cell of cells) {
          cell.wrap.style.display = cell.c < currentCols ? "grid" : "none";
        }
        // The board just changed shape under the snake; end the game rather
        // than leave segments stranded on hidden columns.
        if (snakePlaying) endSnake();
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

    const snakeTickMs = () =>
      Math.max(
        SNAKE_TICK_MIN,
        SNAKE_TICK - SNAKE_TICK_STEP * (snakeSegs.length - SNAKE_START_LENGTH)
      );

    function paintOverlay() {
      overlay.fill(0);
      const n = snakeSegs.length;
      for (let i = 0; i < n; i++) {
        const [r, c] = snakeSegs[i];
        const v = n === 1 ? 1 : 1 - (i / (n - 1)) * SNAKE_TAIL_FADE;
        overlay[r * cols + c] = Math.max(overlay[r * cols + c], v);
      }
    }

    function spawnFood() {
      for (let tries = 0; tries < 200; tries++) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * currentCols);
        if (!snakeSegs.some(([sr, sc]) => sr === r && sc === c)) {
          foodR = r;
          foodC = c;
          return;
        }
      }
      // Board is (nearly) full — no food; the snake just roams victorious.
      foodR = -1;
      foodC = -1;
    }

    function startSnake(dir: readonly [number, number], now: number) {
      snakeDir = dir;
      dirQueue.length = 0;
      snakeSegs = [];
      const hr = Math.floor(rows / 2);
      const hc = Math.floor(currentCols / 2);
      // Body extends opposite the travel direction, wrapped onto the board.
      for (let i = 0; i < SNAKE_START_LENGTH; i++) {
        snakeSegs.push([
          (hr - dir[0] * i + rows * SNAKE_START_LENGTH) % rows,
          (hc - dir[1] * i + currentCols * SNAKE_START_LENGTH) % currentCols,
        ]);
      }
      spawnFood();
      paintOverlay();
      nextMoveAt = now + snakeTickMs();
      snakePlaying = true;
    }

    function moveSnake(now: number) {
      if (dirQueue.length) snakeDir = dirQueue.shift()!;
      const [hr, hc] = snakeSegs[0];
      const nr = (hr + snakeDir[0] + rows) % rows;
      const nc = (hc + snakeDir[1] + currentCols) % currentCols;
      const ate = nr === foodR && nc === foodC;

      // Self-collision. The tail cell is vacated this move unless we grow,
      // so it only counts when eating.
      const lim = ate ? snakeSegs.length : snakeSegs.length - 1;
      for (let i = 0; i < lim; i++) {
        if (snakeSegs[i][0] === nr && snakeSegs[i][1] === nc) {
          endSnake();
          return;
        }
      }

      snakeSegs.unshift([nr, nc]);
      if (ate) spawnFood();
      else snakeSegs.pop();
      paintOverlay();
      nextMoveAt = now + snakeTickMs();
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

      const snakeTarget = snakePlaying ? 1 : 0;
      snakeAmount +=
        (snakeTarget - snakeAmount) * (1 - Math.exp(-dt / HOVER_SMOOTHING));
      if (Math.abs(snakeTarget - snakeAmount) < 0.001) {
        snakeAmount = snakeTarget;
      }

      if (snakePlaying && now >= nextMoveAt) moveSnake(now);

      // Twinkles keep running unless the halo or the game is meaningfully
      // visible.
      if (hoverAmount < 0.5 && snakeAmount < 0.5 && now >= nextTickAt) {
        scheduleTwinkles(now);
      }

      // The backdrop dims for the halo and further for the game board.
      const dim = Math.max(hoverAmount, snakeAmount);
      const base = baseOpacity + (hoverBaseOpacity - baseOpacity) * dim;
      const radiusSq = hoverRadius * hoverRadius;
      // Food pulses on a ~1.1s sine so it reads as the thing to chase.
      const foodPulse = 0.55 + 0.35 * Math.sin(now / 180);

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
        // Suppressed while the game runs so the snake reads clearly.
        let halo = 0;
        if (hoverAmount > 0.001 && snakeAmount < 0.999) {
          const dx = pointerX - cell.cx;
          const dy = pointerY - cell.cy;
          const d2 = dx * dx + dy * dy;
          if (d2 <= radiusSq) {
            halo =
              smooth01(1 - Math.sqrt(d2) / hoverRadius) *
              hoverAmount *
              (1 - snakeAmount);
          }
        }

        // Snake segments and food, faded by snakeAmount across start/end.
        let game = 0;
        if (snakeAmount > 0.001) {
          game = overlay[cell.r * cols + cell.c] * snakeAmount;
          if (snakePlaying && cell.r === foodR && cell.c === foodC) {
            game = Math.max(game, foodPulse * snakeAmount);
          }
        }

        const bright = Math.max(twinkle * (1 - snakeAmount), halo, game);
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
      // Clicking the grid starts the game (heading right; arrows steer from
      // there). Touch is excluded: the game is keyboard-steered, so a tap
      // would start something the player can't control.
      if (snake && !snakePlaying && e.pointerType !== "touch") {
        startSnake([0, 1], performance.now());
      }
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

    /*
     * Snake input. A click starts the game (see onDown); an arrow key while
     * hovering also works. Arrows are only claimed while playing or hovering,
     * so page scrolling is never hijacked by accident; once playing, arrows
     * steer and Escape quits. Turns are queued (two deep) so a fast
     * up-then-left lands on consecutive ticks, and a queued turn can't
     * reverse straight into the neck.
     */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (snakePlaying) {
          endSnake();
          e.preventDefault();
        }
        return;
      }
      const dir = SNAKE_DIRS[e.key];
      if (!dir) return;
      if (!snakePlaying) {
        if (!hovering) return;
        startSnake(dir, performance.now());
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : snakeDir;
      const reversal = dir[0] === -last[0] && dir[1] === -last[1];
      const same = dir[0] === last[0] && dir[1] === last[1];
      if (!reversal && !same && dirQueue.length < 2) dirQueue.push(dir);
    };

    root.addEventListener("pointerenter", onEnter, { passive: true });
    root.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointercancel", onUp, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });

    if (snake) window.addEventListener("keydown", onKey);
    window.addEventListener("resize", layout);

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      if (snake) window.removeEventListener("keydown", onKey);
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
    snake,
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
