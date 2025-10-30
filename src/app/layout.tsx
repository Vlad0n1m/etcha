import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { NavigationProvider } from "@/components/NavigationProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SignatureProvider } from "@/components/SignatureProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Etcha - secure blockchain-based ticket resale platform on Solana",
  description: "Buy and resell verified event tickets on Solana with on-chain ownership, anti-fraud, and instant settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletContextProvider>
          <AuthProvider>
            <SignatureProvider>
              <NavigationProvider>
                {children}
              </NavigationProvider>
            </SignatureProvider>
          </AuthProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
