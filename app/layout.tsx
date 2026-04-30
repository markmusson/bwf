import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BrandFooter } from "./components/BrandFooter";
import { BrandHeader } from "./components/BrandHeader";
import { Providers } from "./providers";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-bwf-deep flex min-h-full flex-col text-white">
        <ConvexAuthNextjsServerProvider>
          <Providers>
            <BrandHeader />
            <main className="flex-1">{children}</main>
            <BrandFooter />
          </Providers>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
