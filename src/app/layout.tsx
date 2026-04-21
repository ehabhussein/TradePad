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

// Pre-hydration script: stamp <html data-sidebar / data-dock> BEFORE React
// paints so the --sidebar-w / --dock-w CSS vars are correct on first render.
// The /observations page hides the dock entirely, so resolve that here too —
// otherwise main would briefly have right-padding reserved for a dock that
// isn't going to render.
const layoutBootScript = `
try {
  var s = localStorage.getItem('tradepad.sidebar.collapsed');
  document.documentElement.dataset.sidebar = (s === '0') ? 'full' : 'rail';
} catch (e) { document.documentElement.dataset.sidebar = 'rail'; }
try {
  var onObsPage = location.pathname.indexOf('/observations') === 0;
  if (onObsPage) {
    document.documentElement.dataset.dock = 'none';
  } else {
    var d = localStorage.getItem('tradepad.dock.collapsed');
    document.documentElement.dataset.dock = (d === '1') ? 'rail' : 'full';
  }
} catch (e) { document.documentElement.dataset.dock = 'full'; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: layoutBootScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} font-sans min-h-screen gradient-mesh`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Nav />
          <main className="app-main container max-w-7xl py-8 animate-fade-in">
            {children}
          </main>
          <ObservationsDock />
          <CommandPalette />
          <Toaster theme="dark" position="top-right" richColors offset={72} />
        </ThemeProvider>
      </body>
    </html>
  );
}
