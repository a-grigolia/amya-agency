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
      {/* Padding is mobile-first: 24px sides with a 12px bottom on mobile,
          24px all around from 480px, 48px on md+ */}
      <footer className="relative flex w-full items-end justify-between gap-6 p-6 pb-3 max-[479px]:flex-col max-[479px]:items-stretch min-[480px]:pb-6 md:p-12">
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
        {/* Mobile: in the stacked footer flow, centered at the very bottom.
            480px+: out of flow (absolute against the footer) so it floats
            below the nav/description column without shifting the layout —
            offsets place it 8px below the text block (19px on md+, per the
            design, where the larger footer padding leaves room for it). */}
        <Link
          href="/anti-spam-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-[10px] tracking-[0.1px] whitespace-nowrap text-foreground/[0.33] transition-colors duration-200 hover:text-foreground/70 min-[480px]:absolute min-[480px]:bottom-[6px] min-[480px]:left-6 min-[480px]:leading-none md:bottom-[19px] md:left-12"
        >
          Anti-spam policy
        </Link>
      </footer>
    </main>
  );
}
