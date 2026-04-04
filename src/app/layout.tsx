import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Caveat, JetBrains_Mono, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "UsVerse — Your Private Universe",
  description:
    "A shared life app for two people who want to live together, digitally. Real-time presence, deep connection, shared memories.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "UsVerse",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0720" },
  ],
  colorScheme: "light dark",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${playfairDisplay.variable} ${caveat.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="usverse-theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var stored = localStorage.getItem("usverse-theme-prefs");
              var theme = "romantic-dusk"; // default

              if (stored) {
                try {
                  var prefs = JSON.parse(stored);
                  theme = prefs.theme || "romantic-dusk";
                } catch (e) {
                  // Legacy support: check old storage key
                  var oldTheme = localStorage.getItem("usverse-theme");
                  if (oldTheme === "light" || oldTheme === "dark") {
                    theme = oldTheme === "dark" ? "dark" : "romantic-dusk";
                  }
                }
              } else {
                // No stored preference, check system
                var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                theme = dark ? "dark" : "romantic-dusk";
              }

              document.documentElement.setAttribute("data-theme", theme);

              // Update theme-color meta
              var themeMeta = document.querySelector('meta[name="theme-color"]');
              if (themeMeta) {
                var colors = {
                  "romantic-dusk": "#fff8fb",
                  "golden-hour": "#fffaf5",
                  "mint-garden": "#f8fefb",
                  "wisteria-dream": "#faf7fe",
                  "blush-cream": "#fffcf8",
                  "light": "#fff8fb",
                  "dark": "#0d0720",
                  "dark-void": "#050212"
                };
                themeMeta.setAttribute("content", colors[theme] || "#fff8fb");
              }
            } catch (_) {
            }
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}
