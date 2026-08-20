"use client";

import { motion } from "motion/react";
import { useTheme } from "@/components/theme-provider";

/*
 * Plus/minus theme toggle.
 * Dark mode shows a plus. On click the whole icon rotates 90deg while one bar
 * fades out, so the plus visibly rotates into a minus (light mode), and back.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLight}
      className="-mr-3 flex h-10 w-10 cursor-pointer items-center justify-center max-[479px]:mr-0 opacity-[0.33] transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <motion.svg
        viewBox="0 0 16 16"
        className="block h-4 w-4"
        animate={{ rotate: isLight ? 90 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* This bar rotates into the final minus position */}
        <line
          x1="8"
          y1="1"
          x2="8"
          y2="15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* This bar fades away while rotating, leaving a single bar (minus) */}
        <motion.line
          x1="1"
          y1="8"
          x2="15"
          y2="8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ opacity: isLight ? 0 : 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </motion.svg>
    </button>
  );
}
