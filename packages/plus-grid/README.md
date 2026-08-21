# react-plus-grid

A flickering plus-sign grid for React. Cells twinkle at random, and a soft halo
follows the pointer across the grid. One `requestAnimationFrame` loop drives
everything.

Zero dependencies beyond React. No CSS file, no Tailwind, no build step — the
package ships TypeScript source and is compiled by the consuming bundler.

## Usage

```tsx
import { PlusGrid } from "react-plus-grid";

export default function Hero() {
  return (
    <div style={{ maxWidth: 704, color: "#fff" }}>
      <PlusGrid />
    </div>
  );
}
```

The grid fills the width of its parent and inherits its `color`, so the pluses
are styled by whatever text color is in scope. Give the parent a `max-width` to
control how large the grid gets.

In Next.js this is a client component (the file carries `"use client"`), so it
can be rendered directly from a server component.

## How it works

The interesting part is that the cells are **not** React elements. On mount the
effect creates one `<div><svg>` pair per cell as plain DOM nodes and keeps them
in a flat array. The animation loop then writes `opacity`, `filter`, and
`transform` straight onto those nodes, so a 6×18 grid animating at 60fps causes
zero React renders.

Three things drive a cell's brightness each frame:

- **Twinkle** — on a randomized tick, a fraction of cells (`twinkleRate`) start
  a twinkle. Each one is a sine envelope over its own duration, so brightness
  rises and falls smoothly instead of stepping between CSS transition states.
- **Halo** — the pointer position is compared against precomputed cell centers.
  Cells inside `hoverRadius` get a smoothstep falloff. The whole halo is scaled
  by a smoothed `hoverAmount` that eases 0→1 on enter and 1→0 on leave, so the
  effect fades rather than snapping.
- **Easing** — the final target feeds an exponential smoothing step,
  `opacity += (target - opacity) * (1 - exp(-dt / tau))`. Because it uses the
  real frame delta, it behaves identically at 60Hz and 120Hz.

Two details keep it cheap: written values are quantized (opacity to 1/500, glow
to 1/20) and diffed against the last written value, so most frames touch only
the handful of cells that actually changed; and `dt` is clamped to 100ms so a
backgrounded tab doesn't resume with one enormous step.

Layout is recomputed on resize via `ResizeObserver`. All columns are created up
front and the responsive ones are hidden, so crossing the breakpoint is a
`display` toggle rather than a rebuild. Cell centers are offset by the centering
gutter — without that, the halo drifts away from the pointer once the tracks are
narrower than the container.

`prefers-reduced-motion: reduce` renders a static grid at `baseOpacity` and
never starts the loop.

## Snake

Pass `snake` to hide a game of snake in the grid:

```tsx
<PlusGrid snake />
```

**Clicking the grid** starts a game — the snake heads right and the arrow keys
steer it. (An arrow key pressed while hovering the grid also starts it; arrows
outside the grid scroll the page as usual.) The snake is drawn as bright cells
(head brightest, fading toward the tail), food pulses, and the backdrop dims
while twinkles and the hover halo pause. Walls wrap around. Eating grows
the snake and speeds it up slightly; running into yourself ends the game, as
does Escape or resizing across the breakpoint. On game over everything just
fades back to the ambient animation — no score, no UI.

The game reuses the animation pipeline: segments and food are extra brightness
sources fed into the same per-cell easing, so movement leaves a soft trail for
free. It is keyboard-only and disabled under `prefers-reduced-motion`.

## Props

All props are optional.

| Prop | Default | Description |
| --- | --- | --- |
| `rows` | `6` | Number of rows. |
| `cols` | `18` | Columns at or above `breakpoint`. |
| `colsMobile` | `12` | Columns below `breakpoint`. |
| `breakpoint` | `1080` | Viewport width in px where the column count switches. |
| `size` | `24` | Base px per plus, before the container-fit scale. |
| `gap` | `14` | Base px between cells, before the container-fit scale. |
| `minScale` | `0.5` | Floor for the container-fit scale, so gaps never collapse. |
| `hoverRadius` | `3` | Radius of the halo, measured in cells. |
| `baseOpacity` | `0.33` | Resting opacity of an idle cell. |
| `hoverBaseOpacity` | `0.18` | Resting opacity while hovering, which dims the backdrop so the halo reads. |
| `twinkleRate` | `0.04` | Fraction of cells that start a twinkle per tick. |
| `twinkleDurationMin` / `twinkleDurationMax` | `1000` / `2000` | Twinkle duration range in ms. |
| `tickMin` / `tickMax` | `400` / `800` | Delay range between ticks in ms. |
| `glowColor` | `var(--pg-glow1, rgba(255,255,255,0.45))` | Inner glow on bright cells. |
| `glowColorSoft` | `var(--pg-glow2, rgba(255,255,255,0.18))` | Outer, softer glow. |
| `snake` | `false` | Easter egg: clicking the grid starts a game of snake. |
| `className` | — | Applied to the root element. |
| `style` | — | Merged over the root's own layout styles. |

## Theming

The glow defaults read CSS custom properties with baked-in fallbacks, so you can
theme the grid from a stylesheet without touching props:

```css
.plus-grid {
  --pg-glow1: rgba(255, 255, 255, 0.45);
  --pg-glow2: rgba(255, 255, 255, 0.18);
}

:root.light .plus-grid {
  --pg-glow1: rgba(0, 0, 0, 0.28);
  --pg-glow2: rgba(0, 0, 0, 0.14);
}
```

```tsx
<PlusGrid className="plus-grid" />
```

Or pass `glowColor` / `glowColorSoft` directly if you'd rather keep it in JS.

## Notes

Changing a prop rebuilds the grid, since the layout is baked into DOM nodes on
mount. Pass literals or memoized values rather than freshly computed objects.

The root is `aria-hidden`, as the grid is decorative.
