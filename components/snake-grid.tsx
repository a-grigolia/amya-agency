"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PlusGrid } from "react-plus-grid";

const HINT_VISIBLE_MS = 3000;

const EASE = [0.4, 0, 0.2, 1] as const;

/* The hint's two groups drop in with a slight stagger, hold, then continue
   downward as they fade away (or leave early if the game ends first). */
const containerVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
  away: { transition: { staggerChildren: 0.05 } },
};

const groupVariants = {
  hidden: { opacity: 0, y: -10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  away: { opacity: 0, y: 10, transition: { duration: 0.3, ease: EASE } },
};

/* Arrow glyph exported from the Figma design (node 475:570): a 4x4 triangle
   drawn with currentColor so it follows the theme, rotated per direction. */
function ArrowGlyph({ rotate }: { rotate?: string }) {
  return (
    <svg viewBox="0 0 4 4" className={`h-[4px] w-[4px] ${rotate ?? ""}`}>
      <path d="M4 4H0L2 0L4 4Z" fill="currentColor" />
    </svg>
  );
}

function ArrowKey({ rotate }: { rotate?: string }) {
  return (
    <span className="flex h-[12px] w-[24px] items-center justify-center rounded-[2px] border-[0.5px] border-foreground/[0.33] bg-foreground/5 light:border-black light:bg-black light:text-white">
      <ArrowGlyph rotate={rotate} />
    </span>
  );
}

function ControlsHint() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="shown"
      exit="away"
      className="flex items-center gap-6 text-[10px] leading-[9px] tracking-[0.1px]"
      aria-hidden="true"
    >
      <motion.div
        variants={groupVariants}
        className="flex flex-col items-center gap-4"
      >
        {/* Light mode goes solid black with white legends, MacBook-key style. */}
        <span className="flex h-[26px] w-[58px] items-end rounded-[2px] border-[0.5px] border-foreground/[0.33] bg-foreground/5 p-1 text-foreground light:border-black light:bg-black light:text-white">
          esc
        </span>
        <span className="text-foreground/70">Exit</span>
      </motion.div>
      <motion.div
        variants={groupVariants}
        className="flex flex-col items-center gap-4"
      >
        <span className="flex h-[26px] w-[80px] flex-col items-center justify-between text-foreground">
          <ArrowKey />
          <span className="flex gap-1">
            <ArrowKey rotate="-rotate-90" />
            <ArrowKey rotate="rotate-180" />
            <ArrowKey rotate="rotate-90" />
          </span>
        </span>
        <span className="text-foreground/70">Play</span>
      </motion.div>
    </motion.div>
  );
}

/**
 * The home page grid with the snake easter egg enabled. When a game starts,
 * a controls hint (from Figma node 475:705) animates in below the grid,
 * stays briefly, and motions away.
 */
export function SnakeGrid() {
  const [showHint, setShowHint] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleSnakeChange(playing: boolean) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (playing) {
      setShowHint(true);
      timeoutRef.current = setTimeout(
        () => setShowHint(false),
        HINT_VISIBLE_MS
      );
    } else {
      setShowHint(false);
    }
  }

  return (
    <div className="relative w-full">
      <PlusGrid
        snake
        onSnakeChange={handleSnakeChange}
        className="plus-grid text-foreground"
      />
      {/* Absolutely positioned so the hint never shifts the page layout. */}
      <div className="pointer-events-none absolute inset-x-0 top-full flex justify-center pt-8">
        <AnimatePresence>{showHint && <ControlsHint />}</AnimatePresence>
      </div>
    </div>
  );
}
