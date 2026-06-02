import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Momentum",
  description:
    "A premium, habit-driven job application tracker. Track every application. Earn every day.",
  applicationName: "Momentum",
  authors: [{ name: "Momentum" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Momentum",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Synchronous theme script. Runs in <head> before any body paint, so the very
// first rendered frame is already in the correct theme — no FOUC flash from
// the light-theme fallback while next-themes hydrates.
//
// next-themes injects its own script, but it sits inside <body> (the provider
// is a client component) so the header has already been parsed and painted
// against the light :root variables before that script runs.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark;
    if (stored === 'dark') dark = true;
    else if (stored === 'light') dark = false;
    else if (stored === 'system') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    else dark = true; // defaultTheme
    var el = document.documentElement;
    if (dark) el.classList.add('dark');
    else el.classList.remove('dark');
    el.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_e) {
    document.documentElement.classList.add('dark');
  }
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
