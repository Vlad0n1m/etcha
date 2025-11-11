import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { NavigationProvider } from "@/components/NavigationProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SignatureProvider } from "@/components/SignatureProvider";
import { useMemo } from "react";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { useWallet } from "@solana/wallet-adapter-react";
import { UmiProvider } from "@/components/UmiProvider";

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
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  // const { wallet } = useWallet();
  // const umi = useMemo(
  //   () =>
  //     createUmi(endpoint)
  //       .use(walletAdapterIdentity(wallet?.adapter))
  //       .use(mplCandyMachine()),
  //   [endpoint, wallet?.adapter]
  // );
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletContextProvider>
          <AuthProvider>
            <SignatureProvider>
              <NavigationProvider>
                <UmiProvider endpoint={endpoint}>
                  {children}
                </UmiProvider>
              </NavigationProvider>
            </SignatureProvider>
          </AuthProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
