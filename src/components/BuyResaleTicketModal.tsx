"use client"

import { useState } from "react"
import { X, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { Drawer } from "vaul"
import { DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, Transaction } from "@solana/web3.js"

interface BuyResaleTicketModalProps {
    open: boolean
    onClose: () => void
    listingId: string
    ticketData: {
        title: string
        price: number
        originalPrice: number
        imageUrl: string
        date: string
        time?: string
        sellerName: string
        // cNFT asset ID (all tickets are cNFTs)
        assetId?: string
    }
    onSuccess?: () => void
}

export default function BuyResaleTicketModal({
    open,
    onClose,
    listingId,
    ticketData,
    onSuccess,
}: BuyResaleTicketModalProps) {
    const { connected, publicKey, wallet, sendTransaction } = useWallet()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [purchaseStep, setPurchaseStep] = useState<'idle' | 'preparing' | 'signing' | 'confirming'>('idle')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [transactionHash, setTransactionHash] = useState<string | null>(null)

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"

    const handlePurchase = async () => {
        if (!connected || !publicKey || !wallet?.adapter) {
            setError("Please connect your wallet")
            return
        }

        setIsSubmitting(true)
        setError(null)
        setPurchaseStep('preparing')

        try {
            const connection = new Connection(
                process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
                'confirmed'
            )

            // Step 1: Get prepared transaction from server
            const prepareResponse = await fetch('/api/resale/prepare-buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId,
                    buyerWallet: publicKey.toString(),
                }),
            })

            const prepareData = await prepareResponse.json()

            if (!prepareResponse.ok || !prepareData.success) {
                throw new Error(prepareData.message || 'Failed to prepare purchase')
            }

            // Step 2: Sign and send transaction with Phantom
            setPurchaseStep('signing')

            const transaction = Transaction.from(
                Buffer.from(prepareData.transaction, 'base64')
            )

            // Send transaction via wallet adapter (user signs in Phantom)
            const paymentSignature = await sendTransaction(transaction, connection)

            console.log('Payment transaction sent:', paymentSignature)

            // Step 3: Wait for confirmation and transfer NFT
            setPurchaseStep('confirming')

            // Wait for transaction to confirm
            await connection.confirmTransaction(paymentSignature, 'confirmed')

            // Step 4: Confirm with server to transfer NFT
            const confirmResponse = await fetch('/api/resale/confirm-buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId,
                    buyerWallet: publicKey.toString(),
                    paymentSignature,
                }),
            })

            const confirmData = await confirmResponse.json()

            if (!confirmResponse.ok || !confirmData.success) {
                throw new Error(confirmData.message || 'Failed to complete purchase')
            }

            setSuccess(true)
            setTransactionHash(confirmData.nftTransferSignature)

            // Call success callback
            if (onSuccess) {
                onSuccess()
            }
        } catch (err: any) {
            console.error('Error purchasing ticket:', err)
            setError(err.message || 'Failed to purchase ticket. Please try again.')
        } finally {
            setIsSubmitting(false)
            setPurchaseStep('idle')
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setError(null)
            setSuccess(false)
            setTransactionHash(null)
            setPurchaseStep('idle')
            onClose()
        }
    }

    const getStepMessage = () => {
        switch (purchaseStep) {
            case 'preparing':
                return 'Preparing transaction...'
            case 'signing':
                return 'Please approve the transaction in your wallet...'
            case 'confirming':
                return 'Confirming payment and transferring NFT...'
            default:
                return 'Processing...'
        }
    }

    const priceChange = ((ticketData.price - ticketData.originalPrice) / ticketData.originalPrice * 100)
    const isDiscount = priceChange < 0

    return (
        <Drawer.Root open={open} onOpenChange={(open) => !open && handleClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white z-50 bg-surface rounded-t-2xl">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4" />

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <DrawerTitle className="text-xl font-bold text-foreground">Buy Resale Ticket</DrawerTitle>
                                <p className="text-sm text-muted-foreground mt-1">{ticketData.title}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {success ? (
                            /* Success State */
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-green-800 font-medium">Purchase Successful!</p>
                                        <p className="text-sm text-green-700 mt-1">
                                            You have successfully purchased this ticket.
                                        </p>
                                    </div>
                                </div>

                                {transactionHash && (
                                    <div className="bg-muted/50 rounded-xl p-4">
                                        <div className="text-xs text-muted-foreground mb-2">Transaction Hash</div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-mono text-foreground truncate flex-1">
                                                {transactionHash.slice(0, 12)}...{transactionHash.slice(-8)}
                                            </p>
                                            <a
                                                href={`https://explorer.solana.com/tx/${transactionHash}?cluster=${network}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-muted rounded-lg transition-colors ml-2"
                                            >
                                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleClose}
                                    className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all"
                                >
                                    Close
                                </Button>
                            </div>
                        ) : (
                            /* Purchase Form */
                            <div className="space-y-4">
                                {/* Error Message */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-red-800 font-medium">Error</p>
                                            <p className="text-sm text-red-700 mt-1">{error}</p>
                                        </div>
                                    </div>
                                )}


                                {/* Ticket Information */}
                                <div className="bg-muted/50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-foreground mb-3">Purchase Details</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Price</span>
                                            <span className="font-semibold text-foreground">{ticketData.price.toFixed(4)} SOL</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Original Price</span>
                                            <span className="text-sm text-muted-foreground">{ticketData.originalPrice.toFixed(4)} SOL</span>
                                        </div>
                                        {isDiscount && (
                                            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                                                <span className="text-muted-foreground">Savings</span>
                                                <span className="font-semibold text-green-600">
                                                    {Math.abs(priceChange).toFixed(1)}% off
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                                            <span className="text-muted-foreground">Seller</span>
                                            <span className="text-sm font-medium text-foreground">{ticketData.sellerName}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Disclaimer */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-xs text-green-800">
                                        By purchasing this ticket, you agree to complete the transaction.
                                        The compressed NFT will be transferred to your wallet and payment will be sent to the seller.
                                        <span className="block mt-1 font-medium">
                                            Ultra-low transaction fees with cNFT technology!
                                        </span>
                                    </p>
                                </div>

                                {/* Action Button */}
                                <Button
                                    onClick={handlePurchase}
                                    disabled={isSubmitting || !connected || !publicKey}
                                    className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {getStepMessage()}
                                        </>
                                    ) : (
                                        `Buy for ${ticketData.price.toFixed(4)} SOL`
                                    )}
                                </Button>

                                {!connected && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        Please connect your wallet to purchase
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}

