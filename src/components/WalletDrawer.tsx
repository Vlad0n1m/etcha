"use client"

import type React from "react"
import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import Image from "next/image"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Check, Copy, ExternalLink, Wallet, X } from "lucide-react"

interface WalletDrawerProps {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

// const POPULAR_WALLETS = [
    {
        name: "Phantom",
        icon: "https://phantom.app/img/phantom-logo.svg",
        description: "The friendly crypto wallet",
        gradient: "from-purple-500 to-pink-500",
    },
    {
        name: "Solflare",
        icon: "https://solflare.com/favicon.svg",
        description: "Secure Solana wallet",
        gradient: "from-orange-500 to-red-500",
    },
    {
        name: "Backpack",
        icon: "https://backpack.app/favicon.ico",
        description: "Your home for crypto",
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        name: "Trust Wallet",
        icon: "https://trustwallet.com/assets/images/favicon.ico",
        description: "Multi-chain wallet",
        gradient: "from-blue-600 to-blue-400",
    },
// ]

const WalletDrawer: React.FC<WalletDrawerProps> = ({ children, open, onOpenChange }) => {
    const { connected, publicKey, disconnect, wallets, select, connecting, wallet } = useWallet()
    const [copied, setCopied] = useState(false)

    const handleCopyAddress = async () => {
        if (publicKey) {
            await navigator.clipboard.writeText(publicKey.toString())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleWalletSelect = (walletName: string) => {
        const wallet = wallets.find((w) => w.adapter.name === walletName)
        if (wallet) {
            select(wallet.adapter.name)
        }
    }

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
                {connecting && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-t-[10px]">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium">Connecting...</p>
                        </div>
                    </div>
                )}

                <div className="mx-auto w-full max-w-md">
                    <DrawerHeader className="text-center pb-4">
                        <DrawerTitle className="text-2xl font-bold">
                            {connected ? "Wallet Connected" : "Connect Wallet"}
                        </DrawerTitle>
                    </DrawerHeader>

                    <div className="px-4 pb-6 max-h-[50vh] overflow-y-auto">
                        {connected ? (
                            <div className="space-y-4">
                                <div className="bg-card border-2 border-border rounded-xl p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 flex items-center justify-center">
                                            {wallet?.adapter.icon ? (
                                                <img
                                                    src={wallet.adapter.icon || "/placeholder.svg"}
                                                    alt={wallet.adapter.name}
                                                    className="w-16 h-16 rounded-lg"
                                                />
                                            ) : (
                                                <Wallet className="w-10 h-10" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-semibold text-lg">{wallet?.adapter.name}</p>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-muted-foreground">
                                                    {formatAddress(publicKey?.toString() || "")}
                                                </code>
                                                <Button size="sm" variant="ghost" onClick={handleCopyAddress} className="h-7 w-7 p-0">
                                                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => {
                                        disconnect()
                                        onOpenChange?.(false)
                                    }}
                                    variant="destructive"
                                    className="w-full h-12 font-medium text-white"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 && (
                                    <>
                                        {wallets
                                            .filter((wallet) => wallet.readyState === "Installed")
                                            .map((wallet) => (
                                                <button
                                                    key={wallet.adapter.name}
                                                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                                                    disabled={connecting}
                                                    className="w-full group rounded-xl border-2 border-border hover:border-primary transition-all duration-200 bg-card hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <div className="flex items-center gap-4 p-4">
                                                        <div className="w-12 h-12 flex items-center justify-center">
                                                            {wallet.adapter.icon ? (
                                                                <img
                                                                    src={wallet.adapter.icon || "/placeholder.svg"}
                                                                    alt={wallet.adapter.name}
                                                                    className="w-12 h-12 rounded-lg"
                                                                />
                                                            ) : (
                                                                <Wallet className="w-8 h-8" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="font-semibold text-foreground">{wallet.adapter.name}</p>
                                                        </div>
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    </div>
                                                </button>
                                            ))}
                                    </>
                                )}

                                {wallets.filter((wallet) => wallet.readyState !== "Installed").length > 0 && (
                                    <>
                                        {wallets
                                            .filter((wallet) => wallet.readyState !== "Installed")
                                            .slice(0, 4)
                                            .map((wallet) => (
                                                <button
                                                    key={wallet.adapter.name}
                                                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                                                    disabled={connecting}
                                                    className="w-full group rounded-xl border-2 border-dashed border-border hover:border-primary transition-all duration-200 bg-card/50 hover:bg-card hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <div className="flex items-center gap-4 p-4">
                                                        <div className="w-12 h-12 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                                                            {wallet.adapter.icon ? (
                                                                <img
                                                                    src={wallet.adapter.icon || "/placeholder.svg"}
                                                                    alt={wallet.adapter.name}
                                                                    className="w-12 h-12 rounded-lg"
                                                                />
                                                            ) : (
                                                                <Wallet className="w-8 h-8" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="font-semibold text-foreground">{wallet.adapter.name}</p>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                </button>
                                            ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <DrawerFooter className="pt-4 border-t">
                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full h-11 font-medium bg-transparent">
                                Close
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

export default WalletDrawer
