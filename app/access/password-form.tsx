"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";

const CORRECT_PASSWORD = "++++";
const REDIRECT_URL = "https://www.amya.agency/access";

export function PasswordForm() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);

  // The label floats up as soon as the field is focused and stays up
  // while there is text, even after blurring.
  const active = focused || value.length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === CORRECT_PASSWORD) {
      window.location.assign(REDIRECT_URL);
    } else {
      setError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-[260px]">
      <label className="block h-[52px] w-full cursor-text rounded-[16px] border border-foreground/33">
        <span className="sr-only">Password</span>
        <span
          aria-hidden
          className={`pointer-events-none absolute left-[12px] transition-all duration-200 ease-out ${
            active
              ? "top-[8px] text-[8px] leading-[10px] tracking-[0.08px] text-foreground/30"
              : "top-1/2 -translate-y-1/2 text-[13px] leading-[18px] tracking-[0.13px] text-foreground/70"
          }`}
        >
          Password
        </span>
        <input
          type="text"
          name="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`absolute right-[36px] bottom-[8px] left-[12px] h-[18px] bg-transparent text-[13px] leading-[18px] tracking-[0.13px] text-foreground/70 caret-foreground/70 outline-none transition-opacity duration-200 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
        <button
          type="submit"
          aria-label="Submit password"
          className={`absolute top-1/2 right-[12px] flex -translate-y-1/2 cursor-pointer items-center justify-center p-[4px] transition-all duration-200 ease-out ${
            active ? "translate-x-0 opacity-100" : "-translate-x-[6px] opacity-0"
          }`}
          tabIndex={active ? 0 : -1}
        >
          {/* Arrow exported from the Figma design (node 454:317) */}
          <svg
            viewBox="0 0 9.05259 7.00001"
            fill="none"
            className="h-[7px] w-[9px]"
            aria-hidden
          >
            <path
              d="M4.92502 0.500005L8.29999 3.50001L4.92502 6.50001"
              stroke="currentColor"
              strokeLinecap="round"
            />
            <path
              d="M7.69993 3.50001L0.5 3.50001"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </label>
      {error && (
        <p className="absolute top-full left-[12px] mt-[9px] text-[10px] leading-[18px] tracking-[0.1px] text-[rgba(255,116,116,0.7)] light:text-[rgba(211,69,69,0.9)]">
          Incorrect password. Please try again.
        </p>
      )}
    </form>
  );
}

export function AccessGate() {
  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center gap-[48px] overflow-hidden">
      <Logo className="h-[48px] w-[182px]" />
      <PasswordForm />
    </main>
  );
}
