import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/db"; // init db on boot
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/command-palette";
import { ObservationsDock } from "@/components/observations-dock";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Tradepad — Trading Journal",
  description: "A beautiful trading journal for traders who care about their edge",
};

// Pre-hydration script: read the sidebar preference and stamp <html data-sidebar=...>
// BEFORE React paints, so the CSS var --sidebar-w is already correct on first render.
// Otherwise collapsed users would see a flash from expanded → collapsed on page load.
const sidebarBootScript = `
try {
  var s = localStorage.getItem('tradepad.sidebar.collapsed');
  document.documentElement.dataset.sidebar = (s === '0') ? 'full' : 'rail';
} catch (e) { document.documentElement.dataset.sidebar = 'rail'; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarBootScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} font-sans min-h-screen gradient-mesh`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Nav />
          <main className="app-main container max-w-7xl py-8 animate-fade-in lg:pr-80">
            {children}
          </main>
          <ObservationsDock />
          <CommandPalette />
          <Toaster theme="dark" position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
