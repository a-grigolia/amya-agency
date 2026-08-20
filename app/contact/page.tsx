import type { Metadata } from "next";
import { CopyEmail } from "./copy-email";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-6">
      <div className="flex max-w-[420px] flex-col items-center">
        <h1 className="my-4 text-center text-sm leading-6 font-normal tracking-[1px]">
          Amya Agency
          <br />
          San Francisco, California
        </h1>
        <CopyEmail />
      </div>
      <a
        href="https://www.linkedin.com/company/amya-agency/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Amya Agency on LinkedIn"
        className="mt-2 block h-6 w-5 opacity-35 transition-opacity duration-200 hover:opacity-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/linkedin-dark.png"
          alt=""
          className="h-full w-full object-contain light:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/linkedin-light.png"
          alt=""
          className="hidden h-full w-full object-contain light:block"
        />
      </a>
    </main>
  );
}
