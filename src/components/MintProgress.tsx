"use client"

import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export type MintStatus = "preparing" | "uploading" | "minting" | "confirming" | "complete" | "error"

interface MintProgressProps {
    status: MintStatus
    message?: string
}

export default function MintProgress({ status, message }: MintProgressProps) {
    const getStatusConfig = () => {
        switch (status) {
            case "preparing":
                return {
                    icon: <Loader2 className="w-6 h-6 animate-spin text-primary" />,
                    title: "Preparing Transaction",
                    defaultMessage: "Setting up your NFT mint...",
                    bgColor: "bg-primary/10",
                    borderColor: "border-primary/20",
                }
            case "uploading":
                return {
                    icon: <Loader2 className="w-6 h-6 animate-spin text-primary" />,
                    title: "Uploading Metadata",
                    defaultMessage: "Uploading ticket metadata to Arweave...",
                    bgColor: "bg-primary/10",
                    borderColor: "border-primary/20",
                }
            case "minting":
                return {
                    icon: <Loader2 className="w-6 h-6 animate-spin text-primary" />,
                    title: "Minting NFT",
                    defaultMessage: "Creating your NFT ticket on Solana...",
                    bgColor: "bg-primary/10",
                    borderColor: "border-primary/20",
                }
            case "confirming":
                return {
                    icon: <Loader2 className="w-6 h-6 animate-spin text-primary" />,
                    title: "Confirming Transaction",
                    defaultMessage: "Waiting for blockchain confirmation...",
                    bgColor: "bg-primary/10",
                    borderColor: "border-primary/20",
                }
            case "complete":
                return {
                    icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
                    title: "Mint Complete!",
                    defaultMessage: "Your NFT tickets have been minted successfully.",
                    bgColor: "bg-green-500/10",
                    borderColor: "border-green-500/20",
                }
            case "error":
                return {
                    icon: <XCircle className="w-6 h-6 text-destructive" />,
                    title: "Mint Failed",
                    defaultMessage: "Failed to mint NFT tickets. Please try again.",
                    bgColor: "bg-destructive/10",
                    borderColor: "border-destructive/20",
                }
        }
    }

    const config = getStatusConfig()

    return (
        <div
            className={`flex items-start gap-4 p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}
        >
            <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground mb-1">{config.title}</h4>
                <p className="text-sm text-muted-foreground">{message || config.defaultMessage}</p>

                {/* Progress steps indicator */}
                {status !== "error" && status !== "complete" && (
                    <div className="flex items-center gap-2 mt-3">
                        <div
                            className={`h-1 flex-1 rounded-full ${["preparing", "uploading", "minting", "confirming"].includes(status)
                                    ? "bg-primary"
                                    : "bg-muted"
                                }`}
                        />
                        <div
                            className={`h-1 flex-1 rounded-full ${["uploading", "minting", "confirming"].includes(status) ? "bg-primary" : "bg-muted"
                                }`}
                        />
                        <div
                            className={`h-1 flex-1 rounded-full ${["minting", "confirming"].includes(status) ? "bg-primary" : "bg-muted"
                                }`}
                        />
                        <div
                            className={`h-1 flex-1 rounded-full ${status === "confirming" ? "bg-primary" : "bg-muted"
                                }`}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

