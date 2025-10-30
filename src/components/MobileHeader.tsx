"use client"

import React from 'react'
import Image from 'next/image'
import { Button } from './ui/button'
import WalletDrawer from './WalletDrawer'
import { useWallet } from '@solana/wallet-adapter-react'

export default function MobileHeader() {
    const { connected, publicKey } = useWallet()

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/35 backdrop-blur-sm border-b border-gray-200/35">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Logo */}
                <div className="flex items-center">
                    <Image
                        src="/etcha.png"
                        alt="Etcha Logo"
                        width={32}
                        height={32}
                        className="w-8 h-8"
                    />
                </div>
                <div className="flex justify-center gap-2 items-center">
                {/* Wallet Status or Connect Button */}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold uppercase tracking-wide">Devnet</span>
                {connected ? (
                    <WalletDrawer>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
                        >
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            {formatAddress(publicKey?.toString() || "")}
                        </Button>
                    </WalletDrawer>
                ) : (
                    <WalletDrawer>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-purple-500 text-white hover:bg-purple-600"
                        >
                            Connect Wallet
                        </Button>
                    </WalletDrawer>
                )}
                </div>
            </div>
        </header>
    )
}
