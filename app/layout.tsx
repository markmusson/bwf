import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { BrandFooter } from "./components/BrandFooter";
import { BrandHeader } from "./components/BrandHeader";
import { CookieBanner } from "./components/CookieBanner";
import { PlausibleScript } from "./components/PlausibleScript";
import { Providers } from "./providers";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BWF Virtual Seats",
  description:
    "Pick a seat at Edgbaston for the Bob Willis Fund. Tribute, avatar, donation from £10.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="bg-bwf-blue flex min-h-full flex-col text-white">
        <ConvexAuthNextjsServerProvider>
          <Providers>
            <BrandHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <BrandFooter />
            <CookieBanner />
            <PlausibleScript />
          </Providers>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
