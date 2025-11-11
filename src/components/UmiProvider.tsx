// components/UmiProvider.tsx
"use client";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { Umi } from "@metaplex-foundation/umi";
import { createContext, useContext, useMemo, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// Создаём контекст
const UmiContext = createContext<Umi | null>(null);

export const useUmi = (): Umi => {
    const umi = useContext(UmiContext);
    if (!umi) {
        throw new Error("useUmi must be used within UmiProvider");
    }
    return umi;
};

interface UmiProviderProps {
    children: ReactNode;
    endpoint?: string;
}

export const UmiProvider = ({ children, endpoint }: UmiProviderProps) => {
    const { wallet } = useWallet(); // Правильный адаптер!

    const umi = useMemo(() => {
        if (!endpoint) return null;

        const umiInstance = createUmi(endpoint)
            .use(mplCandyMachine())
            .use(mplTokenMetadata())
        // Другие плагины по желанию:
        // .use(mplCore())
        // .use(mplBubblegum())

        // Подключаем кошелёк только если он есть
        if (wallet?.adapter) {
            umiInstance.use(walletAdapterIdentity(wallet.adapter));
        }

        return umiInstance;
    }, [endpoint, wallet?.adapter]);

    // Если umi ещё не готов — можно показать лоадер
    if (!umi) {
        return <div>Загрузка UMI...</div>;
    }

    return <UmiContext.Provider value={umi}>{children}</UmiContext.Provider>;
};