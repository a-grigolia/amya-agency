"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const EMAIL = "information@amya.agency";
const COPIED_VISIBLE_MS = 1500;

/* Copy icon exported from the Figma design (node 457:391), drawn with
 * currentColor so it follows the row's text color. */
function CopyIcon() {
  return (
    <svg viewBox="0 0 11 13" className="h-[13px] w-[11px]" aria-hidden>
      <path
        d="M8.5 0C9.88071 0 11 1.11929 11 2.5V8.5C11 9.7248 10.1188 10.7415 8.95605 10.9561C8.74152 12.1188 7.7248 13 6.5 13H2.5C1.11929 13 0 11.8807 0 10.5V4.5C0 3.27547 0.880623 2.25781 2.04297 2.04297C2.25781 0.880623 3.27547 0 4.5 0H8.5ZM2 3.08691C1.41766 3.29297 1 3.84707 1 4.5V10.5C1 11.3284 1.67157 12 2.5 12H6.5C7.15293 12 7.70703 11.5823 7.91309 11H4.5C3.11929 11 2 9.88071 2 8.5V3.08691ZM4.5 1C3.67157 1 3 1.67157 3 2.5V8.5C3 9.32843 3.67157 10 4.5 10H8.5C9.32843 10 10 9.32843 10 8.5V2.5C10 1.67157 9.32843 1 8.5 1H4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

const slideTransition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

export function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    navigator.clipboard.writeText(EMAIL);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_VISIBLE_MS);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Copy ${EMAIL} to clipboard`}
      className="group my-4 grid h-6 cursor-pointer place-items-center overflow-hidden text-sm leading-6 font-normal tracking-[1px]"
    >
      {/* Both rows share the same grid cell; the button's overflow-hidden
          clips them as they slide vertically. */}
      <AnimatePresence initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={slideTransition}
            className="col-start-1 row-start-1 flex items-center gap-[6px] whitespace-nowrap text-foreground"
          >
            Copied to your clipboard
            <CopyIcon />
          </motion.span>
        ) : (
          <motion.span
            key="email"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={slideTransition}
            className="col-start-1 row-start-1 flex items-center gap-[6px] whitespace-nowrap text-foreground/60 transition-colors duration-200 group-hover:text-foreground"
          >
            {EMAIL}
            <CopyIcon />
          </motion.span>
        )}
      </AnimatePresence>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to your clipboard" : ""}
      </span>
    </button>
  );
}
