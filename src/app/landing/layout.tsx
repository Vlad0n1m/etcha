import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Etcha - Global Events, Crypto Native, Limitless",
  description: "Create events, buy and resell tickets from anywhere in the world with SOL or USDC. Instant transfers, no bureaucracy, full transparency.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-black">
      {children}
    </div>
  );
}
