import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Career Ops",
  description: "Application tracker and pipeline dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Career Ops",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Link href="/" className="font-semibold tracking-tight">
              Career Ops
            </Link>
            <nav className="flex gap-3 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Tracker</Link>
              <Link href="/pipeline" className="hover:text-foreground transition-colors">Pipeline</Link>
              <Link href="/reports" className="hover:text-foreground transition-colors">Reports</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </main>
      </body>
    </html>
  );
}
