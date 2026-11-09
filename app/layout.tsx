import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AntiZoom } from "@/components/common/AntiZoom";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Pingr",
  description: "Reliable Website & API Monitoring",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var zoomKeys = ['+', '-', '=', '_', '0', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract', 'Digit0', 'Numpad0'];
                window.addEventListener('wheel', function(e) {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                  }
                }, { passive: false });
                window.addEventListener('keydown', function(e) {
                  if ((e.ctrlKey || e.metaKey) && (zoomKeys.indexOf(e.key) !== -1 || zoomKeys.indexOf(e.code) !== -1)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }, true);
                document.addEventListener('touchstart', function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
                document.addEventListener('touchmove', function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
                document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
                var lastTouchEnd = 0;
                document.addEventListener('touchend', function(e) {
                  var now = Date.now();
                  if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                  }
                  lastTouchEnd = now;
                }, { passive: false });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AntiZoom />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
