"use client"

import { useState } from "react"
import { X, Copy, ExternalLink, CheckCircle2 } from "lucide-react"
import { Drawer } from "vaul"

interface MintResult {
    nftMintAddresses: string[]
    transactionSignature: string
    organizerPayment: {
        amount: number
        transactionHash: string
    }
    platformFee: {
        amount: number
    }
    orderId: string
}

interface MintResultModalProps {
    open: boolean
    onClose: () => void
    result: MintResult | null
}

export default function MintResultModal({ open, onClose, result }: MintResultModalProps) {
    const [copiedItem, setCopiedItem] = useState<string | null>(null)

    if (!result) return null

    const totalPaid = result.organizerPayment.amount + result.platformFee.amount
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"
    const explorerUrl = `https://explorer.solana.com/tx/${result.transactionSignature}?cluster=${network}`

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedItem(label)
            setTimeout(() => setCopiedItem(null), 2000)
        } catch (err) {
            console.error("Failed to copy:", err)
        }
    }

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`
    }

    return (
        <Drawer.Root open={open} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[90vh] z-50 bg-surface rounded-t-2xl">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4" />

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Successfully Minted!</h2>
                                    <p className="text-sm text-muted-foreground">
                                        You received {result.nftMintAddresses.length} NFT ticket
                                        {result.nftMintAddresses.length > 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* NFT Addresses */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Your NFT Tickets</h3>
                            <div className="space-y-2">
                                {result.nftMintAddresses.map((address, index) => (
                                    <div
                                        key={address}
                                        className="flex items-center justify-between bg-background rounded-lg p-3"
                                    >
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Ticket #{index + 1}</p>
                                            <p className="text-sm font-mono text-foreground">{formatAddress(address)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => copyToClipboard(address, `nft-${index}`)}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                            >
                                                {copiedItem === `nft-${index}` ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </button>
                                            <a
                                                href={`https://explorer.solana.com/address/${address}?cluster=${network}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Transaction */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Transaction</h3>
                            <div className="flex items-center justify-between bg-background rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground mb-1">Transaction Signature</p>
                                    <p className="text-sm font-mono text-foreground truncate">
                                        {formatAddress(result.transactionSignature)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={() => copyToClipboard(result.transactionSignature, "tx")}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                        {copiedItem === "tx" ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </button>
                                    <a
                                        href={explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Payment Breakdown</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Total Paid</span>
                                    <span className="font-semibold text-foreground">{totalPaid.toFixed(4)} SOL</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">To Organizer (97.5%)</span>
                                    <span className="text-foreground">
                                        {result.organizerPayment.amount.toFixed(4)} SOL
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Platform Fee (2.5%)</span>
                                    <span className="text-foreground">{result.platformFee.amount.toFixed(4)} SOL</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            <a
                                href="/profile"
                                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all text-center"
                            >
                                View My Tickets
                            </a>
                            <button
                                onClick={onClose}
                                className="w-full bg-muted text-foreground font-medium py-3.5 rounded-xl hover:bg-muted/80 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}

