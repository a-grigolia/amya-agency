import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const helvetica = localFont({
  src: [
    { path: "../fonts/HelveticaNeue-Thin.woff2", weight: "300", style: "normal" },
    { path: "../fonts/HelveticaNeue-Light.woff2", weight: "400", style: "normal" },
    { path: "../fonts/HelveticaNeue-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/HelveticaNeue-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-helvetica",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Amya Agency",
  description:
    "Amya Agency represents world-class engineers, operators, and creatives building the next generation of technology companies.",
};

/* Applies the saved theme before first paint to avoid a flash of the wrong theme */
const themeBootScript = `(function(){try{if(localStorage.getItem("themePreference")==="light"){document.documentElement.classList.add("light")}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={helvetica.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes into <body> before hydration, causing false mismatches */}
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
