"use client"

import { useState } from "react"
import { X, Loader2, AlertCircle, CheckCircle2, ExternalLink, Copy } from "lucide-react"
import { Drawer } from "vaul"
import { DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"

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
    const { connected, publicKey, signMessage, wallet } = useWallet()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [transactionHash, setTransactionHash] = useState<string | null>(null)
    const [needsFunding, setNeedsFunding] = useState<{
        internalWalletAddress: string
        requiredAmount: number
        currentBalance: number
    } | null>(null)

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"

    const handlePurchase = async () => {
        if (!connected || !publicKey || !signMessage) {
            setError("Please connect your wallet")
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            // Step 1: Get buyer signature
            // Use standardized message to ensure signature-derived keypair matches internalWalletAddress
            // IMPORTANT: Must use same message as profile page ("etcha-mint-auth-v1") to get same internal wallet
            const message = new TextEncoder().encode("etcha-mint-auth-v1")
            const buyerSignature = await signMessage(message)
            const buyerSignatureHex = Array.from(buyerSignature)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')

            // Step 2: Call API to purchase
            // Seller signature is stored in listing, so we don't need it here
            // The system will use the stored signature to derive seller's internal wallet keypair
            const response = await fetch('/api/resale/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId,
                    buyerWallet: publicKey.toString(),
                    signature: buyerSignatureHex,
                    // Seller signature is stored in listing, so no need to send it
                }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                // Check if error is about insufficient balance
                if (data.internalWalletAddress && data.requiredAmount !== undefined) {
                    setNeedsFunding({
                        internalWalletAddress: data.internalWalletAddress,
                        requiredAmount: data.requiredAmount,
                        currentBalance: data.currentBalance || 0,
                    })
                    setError(data.message || 'Insufficient balance in internal wallet')
                    return
                }
                throw new Error(data.message || 'Failed to purchase ticket')
            }

            setSuccess(true)
            setTransactionHash(data.transactionHash)
            
            // Call success callback
            if (onSuccess) {
                onSuccess()
            }
        } catch (err: any) {
            console.error('Error purchasing ticket:', err)
            setError(err.message || 'Failed to purchase ticket. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setError(null)
            setSuccess(false)
            setTransactionHash(null)
            setNeedsFunding(null)
            onClose()
        }
    }

    const handleFundInternalWallet = async () => {
        if (!needsFunding || !connected || !publicKey || !wallet?.adapter) {
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const connection = new Connection(
                process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
                'confirmed'
            )

            const amountToSend = needsFunding.requiredAmount + 0.001 // Add extra for fees

            const transferTransaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(needsFunding.internalWalletAddress),
                    lamports: Math.floor(amountToSend * LAMPORTS_PER_SOL),
                })
            )

            const { blockhash } = await connection.getLatestBlockhash('confirmed')
            transferTransaction.recentBlockhash = blockhash
            transferTransaction.feePayer = publicKey

            const signature = await wallet.adapter.sendTransaction(transferTransaction, connection)
            await connection.confirmTransaction(signature, 'confirmed')

            // Clear funding state and retry purchase
            setNeedsFunding(null)
            setError(null)
            
            // Retry purchase after funding
            setTimeout(() => {
                handlePurchase()
            }, 1000)
        } catch (err: any) {
            console.error('Error funding internal wallet:', err)
            setError(err.message || 'Failed to fund internal wallet. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch (err) {
            console.error('Failed to copy:', err)
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

                                {/* Funding Required Message */}
                                {needsFunding && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm text-yellow-800 font-medium">Funding Required</p>
                                                <p className="text-sm text-yellow-700 mt-1">
                                                    Your internal wallet needs {needsFunding.requiredAmount.toFixed(4)} SOL 
                                                    (current: {needsFunding.currentBalance.toFixed(4)} SOL)
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white rounded-lg p-3 border border-yellow-200">
                                            <div className="text-xs text-yellow-800 mb-2">Send SOL to this address:</div>
                                            <div className="flex items-center justify-between">
                                                <code className="text-xs font-mono text-yellow-900 break-all flex-1">
                                                    {needsFunding.internalWalletAddress}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(needsFunding.internalWalletAddress)}
                                                    className="ml-2 p-1.5 hover:bg-yellow-100 rounded transition-colors"
                                                >
                                                    <Copy className="w-4 h-4 text-yellow-700" />
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleFundInternalWallet}
                                            disabled={isSubmitting}
                                            className="w-full bg-yellow-600 text-white hover:bg-yellow-700"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Funding...
                                                </>
                                            ) : (
                                                `Fund Internal Wallet (${needsFunding.requiredAmount.toFixed(4)} SOL)`
                                            )}
                                        </Button>
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
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        By purchasing this ticket, you agree to complete the transaction. 
                                        The NFT will be transferred to your wallet and payment will be sent to the seller.
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
                                            Processing...
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

