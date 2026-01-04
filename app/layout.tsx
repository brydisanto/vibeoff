import type { Metadata } from "next";
import { Inter, Titan_One, Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from '@next/third-parties/google';
import { WalletProvider } from "@/components/WalletProvider";

const inter = Inter({ subsets: ["latin"] });
const titan = Titan_One({ weight: "400", subsets: ["latin"], variable: "--font-titan" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const brice = localFont({
    src: [
        { path: "../public/fonts/Brice-Bold.otf", weight: "700", style: "normal" },
        { path: "../public/fonts/Brice-Black.otf", weight: "900", style: "normal" }
    ],
    variable: "--font-brice"
});

const mundial = localFont({
    src: [
        { path: "../public/fonts/Mundial-Regular.otf", weight: "400", style: "normal" },
        { path: "../public/fonts/MundialDemibold.otf", weight: "600", style: "normal" },
        { path: "../public/fonts/Mundial-Bold.otf", weight: "700", style: "normal" }
    ],
    variable: "--font-mundial"
});

import dynamic from 'next/dynamic';

const GlobalActivityToast = dynamic(() => import('@/components/GlobalActivityToast'), { ssr: false });

export const metadata: Metadata = {
    title: "VIBE OFF! | Good Vibes Club",
    description: "1v1 Vibe Matchup Game",
    icons: {
        icon: '/gvc_shaka.png',
        shortcut: '/gvc_shaka.png',
        apple: '/gvc_shaka.png',
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} ${outfit.variable} ${mundial.variable} ${titan.variable} ${brice.variable} min-h-screen bg-gvc-black text-white selection:bg-gvc-gold selection:text-black font-sans`}>
                <WalletProvider>
                    {children}
                    <GlobalActivityToast />
                </WalletProvider>
                <Analytics />
                <GoogleAnalytics gaId="G-XSXTB0M59N" />
            </body>
        </html>
    );
}
