import Link from "next/link";
import { SnakeGrid } from "@/components/snake-grid";
import { ThemeToggle } from "@/components/theme-toggle";

/*
 * When the nav group is hovered, every link drops to the body-text color
 * (foreground at 66%) and only the link under the cursor stays full-strength.
 */
const navLinkClass =
  "text-foreground transition-colors duration-200 group-hover:text-foreground/70 group-hover:hover:text-foreground";

export default function Home() {
  return (
    <main className="flex h-dvh w-full flex-col items-center justify-between overflow-hidden">
      {/* Top heading */}
      <section className="w-full px-12 pt-4 max-md:px-6">
        <h1 className="text-center text-[13px] tracking-[0.13px] text-foreground/[0.33]">
          San Francisco, California
        </h1>
      </section>

      {/* Centered plus grid */}
      <section className="flex w-full flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[704px]">
          <SnakeGrid />
        </div>
      </section>

      {/* Bottom bar */}
      <footer className="flex w-full items-end justify-between gap-6 p-12 max-md:p-6 max-[479px]:flex-col max-[479px]:items-stretch max-[479px]:gap-4">
        <div className="flex flex-col gap-4 text-[13px] tracking-[0.13px] max-[479px]:text-center">
          <nav className="group flex gap-3 max-[479px]:justify-center">
            <Link href="/access" className={navLinkClass}>
              Access
            </Link>
            <Link href="/contact" className={navLinkClass}>
              Contact
            </Link>
          </nav>
          <h2 className="max-w-[410px] leading-[18px] font-normal text-foreground/70 max-[479px]:mx-auto">
            Amya Agency represents world-class engineers, operators, and
            creatives building the next generation of technology companies.
          </h2>
        </div>
        <div className="flex flex-col items-end justify-end max-[479px]:items-center">
          <ThemeToggle />
        </div>
      </footer>
    </main>
  );
}
