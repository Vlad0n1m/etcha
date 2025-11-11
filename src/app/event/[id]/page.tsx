"use client"

import { useState, useEffect, useCallback, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Calendar, MapPin, Clock, Loader2 } from "lucide-react"
import WalletDrawer from "@/components/WalletDrawer"
import CollectionStatus from "@/components/CollectionStatus"
import MintProgress, { MintStatus } from "@/components/MintProgress"
import MintResultModal from "@/components/MintResultModal"
import ResaleSection from "@/components/ResaleSection"
import { Button } from "@/components/ui/button"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useUmi } from "@/components/UmiProvider" // <-- Твой UmiProvider
import { fetchCandyMachine, fetchCandyGuard, mintV2, mint } from "@metaplex-foundation/mpl-candy-machine"
import { transactionBuilder, generateSigner, publicKey as createPublicKey } from "@metaplex-foundation/umi"
import { createMintWithAssociatedToken, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox'
import { PublicKey } from "@solana/web3.js"
import { some } from "@metaplex-foundation/umi";
import { fetchMetadata, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata"

interface Event {
    id: string
    title: string
    price: number
    date: string
    time: string
    ticketsAvailable: number
    imageUrl: string
    description: string
    fullAddress: string
    category?: string
    company?: string
    organizer: {
        name: string
        avatar: string
        description: string
    }
    candyMachineAddress?: string
    collectionNftAddress?: string
}

interface EventMintResult {
    success: boolean
    nftMintAddresses: string[]
    transactionSignature: string
    totalPaid: number
    message?: string
    orderId: string
    organizerPayment: {
        amount: number
        transactionHash: string
    }
    platformFee: {
        amount: number
    }
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [event, setEvent] = useState<Event | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
    const [isMinting, setIsMinting] = useState(false)
    const [mintStatus, setMintStatus] = useState<MintStatus>("preparing")
    const [mintProgress, setMintProgress] = useState<string>("")
    const [mintResult, setMintResult] = useState<EventMintResult | null>(null)
    const [showMintModal, setShowMintModal] = useState(false)
    const [showBuyConfirm, setShowBuyConfirm] = useState(false)
    const { connection } = useConnection()
    const { connected, publicKey } = useWallet()
    const umi = useUmi()
    const resolvedParams = use(params)

    const fetchEvent = useCallback(async () => {
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/events/${resolvedParams.id}`)
            if (!response.ok) throw new Error('Failed to fetch event')
            const data = await response.json()
            setEvent(data.event)
            // const collectionMint = new PublicKey(data.event.collectionNftAddress!)
            // const collectionUpdateAuthority = await connection.getAccountInfo(collectionMint)
            // console.log(collectionUpdateAuthority)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch event')
        } finally {
            setIsLoading(false)
        }
    }, [resolvedParams.id])

    useEffect(() => {
        if (resolvedParams.id) fetchEvent()
    }, [resolvedParams.id, fetchEvent])

    const formatPrice = (price: number) => price >= 1000 ? `${(price / 1000).toFixed(1)}k` : `${price}`
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
    const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`

    // ГЛАВНАЯ ФУНКЦИЯ: Минт через UMI
    const startMint = async () => {
        if (!connected || !publicKey || !event?.candyMachineAddress) {
            setIsWalletDrawerOpen(true)
            return
        }

        setShowBuyConfirm(false)
        setIsMinting(true)
        setMintStatus("preparing")
        setMintProgress("Подготовка транзакции...")

        try {
            const candyMachineAddress = createPublicKey(event.candyMachineAddress!)
            const candyMachine = await fetchCandyMachine(umi, candyMachineAddress)

            // const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority)

            setMintStatus("minting")
            setMintProgress("Минтим 1 билет... Подтвердите в кошельке")

            console.log(candyMachine);

            // const treasury = createPublicKey("YourTreasuryPublicKeyHere") // Replace with actual treasury address from event or config
            // const collectionMint = candyMachine.collectionMint
            // console.log(candyGuard.data.guards)
            // await transactionBuilder()
            //     .add(setComputeUnitLimit(umi, { units: 800_000 }))
            //     .add(
            //         mintV2(umi, {
            //             candyMachine: candyMachine.publicKey,
            //             nftMint,
            //             collectionMint: candyMachine.collectionMint,
            //             collectionUpdateAuthority: candyMachine.authority,
            //             tokenStandard: candyMachine.tokenStandard,
            //         })
            //     )
            //     .sendAndConfirm(umi)
            const nftMint = generateSigner(umi)
            // const candyGuard = await fetchCandyGuard(umi, candyMachine.publicKey)
            // console.log(candyGuard);
            const cm = await fetchCandyMachine(umi, candyMachine.publicKey);
            // console.log('CM.mintAuthority =', cm.mintAuthority.toString());
            // console.log('CM.authority     =', cm.authority.toString());
            const acc = await umi.rpc.getAccount(cm.mintAuthority);
            // console.log('owner =', acc?.owner?.toString());
            const mdPda = findMetadataPda(umi, { mint: cm.collectionMint });
            const md = await fetchMetadata(umi, mdPda);
            const REAL_COLLECTION_UA = md.updateAuthority;
            console.log('collection UA on-chain =', REAL_COLLECTION_UA.toString());
            console.log(candyMachine.authority.toString());
            const nftOwner = generateSigner(umi).publicKey
            await transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(createMintWithAssociatedToken(umi, { mint: nftMint, owner: nftOwner }))
                .add(
                    mintV2(umi, {
                        candyMachine: candyMachine.publicKey,
                        nftMint: nftMint.publicKey,
                        collectionMint: candyMachine.collectionMint,
                        collectionUpdateAuthority: candyMachine.authority,
                        candyGuard: candyMachine.mintAuthority,
                        mintArgs: {
                            solPayment: some({ destination: candyMachine.authority}),
                        },
                    })
                )
                .sendAndConfirm(umi)

            const nftMintAddress = nftMint.publicKey.toString()
            const totalPaid = event.price

            // Сохраняем в твою БД (опционально)
            try {
                await fetch("/api/tickets/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        eventId: event.id,
                        buyerWallet: publicKey.toBase58(),
                        nftMintAddresses: [nftMintAddress],
                        transactionSignature: signature.toString(),
                        quantity: 1,
                        totalPaid,
                    }),
                })
            } catch (e) {
                console.warn("Не удалось сохранить билеты в БД", e)
            }

            setMintStatus("complete")
            setMintProgress("Готово! Билет в вашем кошельке")
            setMintResult({
                success: true,
                nftMintAddresses: [nftMintAddress],
                transactionSignature: signature.toString(),
                totalPaid,
                orderId: Date.now().toString(),
                organizerPayment: {
                    amount: totalPaid * 0.975, // 97.5%
                    transactionHash: signature.toString()
                },
                platformFee: {
                    amount: totalPaid * 0.025 // 2.5%
                }
            })
            setShowMintModal(true)

        } catch (err: unknown) {
            console.error("Mint failed:", err)
            setMintStatus("error")
            let msg = (err instanceof Error ? err.message : "Неизвестная ошибка")
            if (msg.includes("User rejected")) msg = "Вы отменили транзакцию"
            if (msg.includes("insufficient")) msg = "Недостаточно SOL"
            setMintProgress(msg)
            setTimeout(() => setIsMinting(false), 4000)
        }
    }

    const handleBuyClick = () => setShowBuyConfirm(true)

    if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
    if (error || !event) return <div className="min-h-screen bg-background flex items-center justify-center text-center"><p>{error || "Event not found"}</p></div>

    const totalPrice = event.price

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Твой хедер */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                    <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">Devnet</span>
                        <WalletDrawer>
                            <Button variant="outline" size="sm" className="bg-purple-500 text-white hover:bg-purple-600">
                                {connected ? formatAddress(publicKey!.toBase58()) : "Connect"}
                            </Button>
                        </WalletDrawer>
                    </div>
                </div>
            </div>

            {/* Обложка */}
            <div className="relative h-56 w-full">
                <Image src={event.imageUrl || "/no-ticket.svg"} alt={event.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </div>

            <div className="px-4 max-w-2xl mx-auto">
                {/* Collection Status */}
                {event.candyMachineAddress && (
                    <div className="bg-surface rounded-2xl p-4 -mt-4 mb-4 border border-border shadow-lg">
                        <CollectionStatus candyMachineAddress={event.candyMachineAddress} showDetails={false} />
                    </div>
                )}

                <div className="bg-surface rounded-2xl p-5 -mt-8 border border-border shadow-lg">
                    <h1 className="text-xl font-bold mb-2">{event.title}</h1>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                        <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-primary mt-0.5" /><div><div className="text-xs text-muted-foreground">Date</div><div className="text-sm font-medium">{formatDate(event.date)}</div></div></div>
                        <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-primary mt-0.5" /><div><div className="text-xs text-muted-foreground">Time</div><div className="text-sm font-medium">{event.time} GMT+2</div></div></div>
                        <div className="flex items-start gap-2 col-span-2"><MapPin className="w-4 h-4 text-primary mt-0.5" /><div><div className="text-xs text-muted-foreground">Location</div><div className="text-sm font-medium">Barcelona, Catalunya</div></div></div>
                    </div>

                    {event.price > 0 && (
                        <div className="bg-muted/50 rounded-xl p-4 my-4">
                            <div className="text-3xl font-bold">{formatPrice(event.price)} <span className="text-sm font-medium text-muted-foreground">SOL</span></div>
                            <div className="text-xs text-muted-foreground">per ticket</div>
                        </div>
                    )}

                    {isMinting && <MintProgress status={mintStatus} message={mintProgress} />}

                    <button
                        onClick={handleBuyClick}
                        disabled={isMinting || !connected}
                        className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isMinting ? "Минтим..." : `Купить за ${formatPrice(totalPrice)} SOL`}
                    </button>
                </div>

                <ResaleSection eventId={event.id} eventTitle={event.title} eventImage={event.imageUrl} originalPrice={event.price} />

                {/* Остальные секции без изменений */}
            </div>

            {/* Модалка подтверждения */}
            {showBuyConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5">
                        <h3 className="text-lg font-bold mb-3">Подтвердить покупку</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Минт 1 билет за <strong>{formatPrice(totalPrice)} SOL</strong>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowBuyConfirm(false)} className="flex-1 py-2.5 bg-muted rounded-xl">Отмена</button>
                            <button onClick={startMint} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium">
                                {isMinting ? "Минтим..." : "Подтвердить"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <MintResultModal
                open={showMintModal}
                onClose={() => {
                    setShowMintModal(false)
                    setIsMinting(false)
                    setMintResult(null)
                }}
                result={mintResult}
            />

            <WalletDrawer open={isWalletDrawerOpen} onOpenChange={setIsWalletDrawerOpen}>
                <div />
            </WalletDrawer>
        </div>
    )
}