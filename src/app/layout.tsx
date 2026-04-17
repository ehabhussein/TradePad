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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} font-sans min-h-screen gradient-mesh`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Nav />
          <main className="container max-w-7xl py-8 animate-fade-in lg:pr-80">{children}</main>
          <ObservationsDock />
          <CommandPalette />
          <Toaster theme="dark" position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
