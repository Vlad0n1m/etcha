"use client"

import React from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

interface JoinDrawerProps {
    children: React.ReactNode
}

const JoinDrawer: React.FC<JoinDrawerProps> = ({ children }) => {
    const { connected, publicKey } = useWallet()

    return (
        <Drawer>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader className="text-center">
                        <DrawerTitle className="text-2xl font-bold text-gray-900">
                            Wanna Join?
                        </DrawerTitle>
                        <DrawerDescription className="text-gray-600">
                            Connect your wallet to join our community and start participating in events
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 pb-0">
                        <div className="flex flex-col items-center space-y-4">
                            {connected ? (
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <svg
                                            className="w-8 h-8 text-green-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-green-800">
                                        Wallet Connected!
                                    </p>
                                    <p className="text-xs text-gray-500 break-all">
                                        {publicKey?.toString()}
                                    </p>
                                </div>
                            ) : (
                                <div className="w-full">
                                    <WalletMultiButton className="w-full bg-linear-to-r! from-blue-600! to-purple-600! hover:from-blue-700! hover:to-purple-700! text-white! font-semibold! py-3! px-6! rounded-lg! transition-all! duration-200!" />
                                </div>
                            )}
                        </div>
                    </div>

                    <DrawerFooter className="pt-6">
                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full">
                                Close
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

export default JoinDrawer
