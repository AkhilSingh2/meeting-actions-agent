import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Outfit } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { MeetingProvider } from "@/components/providers/MeetingProvider";
import { tokenStyle } from "@/lib/design/tokens";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

const themeBoot = `(function(){try{var s=localStorage.getItem("quorum.theme");var dark=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var t=dark?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export const metadata: Metadata = {
  title: { default: "Quorum", template: "%s · Quorum" },
  description:
    "Turn a meeting transcript into decisions, action items, open questions, risks, and a follow-up. Every item cites the line it came from.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenStyle() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <MeetingProvider>
          <AppShell>{children}</AppShell>
        </MeetingProvider>
      </body>
    </html>
  );
}
