
"use client"

import React from 'react'
import Image from 'next/image'
import { Button } from './ui/button'
import WalletDrawer from './WalletDrawer'
import { useWallet } from '@solana/wallet-adapter-react'
import { Ticket, Wallet } from 'lucide-react'

export default function MobileHeader() {
    const { connected, publicKey } = useWallet()

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-xl border-b border-white/10 transition-all duration-300">
            <div className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto w-full">
                {/* Logo */}
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 group-hover:border-[#14F195]/50 transition-colors">
                        <Ticket size={18} className="text-[#14F195] group-hover:rotate-12 transition-transform duration-500" />
                    </div>
                    <span className="text-lg font-display font-bold tracking-tight text-white flex items-center gap-0.5">
                        etcha<span className="text-[#9945FF]">.io</span>
                    </span>
                </div>

                <div className="flex justify-center gap-3 items-center">
                    {/* Network Status */}
                    <span className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 font-medium uppercase tracking-wider">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#9945FF]"></div>
                         Devnet
                    </span>
                    
                    {connected ? (
                        <WalletDrawer>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#14F195] h-9 rounded-full px-4 transition-all"
                            >
                                <div className="w-2 h-2 rounded-full bg-[#14F195] shadow-[0_0_8px_#14F195]" />
                                <span className="font-mono text-xs">{formatAddress(publicKey?.toString() || "")}</span>
                            </Button>
                        </WalletDrawer>
                    ) : (
                        <WalletDrawer>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white text-black hover:bg-[#14F195] hover:border-[#14F195] border-transparent h-9 rounded-full px-5 font-bold text-xs transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(20,241,149,0.4)] flex items-center gap-2"
                            >
                                <Wallet size={14} /> Connect
                            </Button>
                        </WalletDrawer>
                    )}
                </div>
            </div>
        </header>
    )
}
