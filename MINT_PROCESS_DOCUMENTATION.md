# 📋 Процесс Минта NFT Билетов на Платформе Etcha

## Обзор

Процесс минта NFT билетов происходит в несколько этапов: от подключения кошелька до сохранения билетов в базе данных. Это документ подробно описывает каждый шаг.

---

## 🔄 Полный Цикл Минта

### **Фаза 1: Подготовка (Клиентская сторона)**

#### 1.1 Подключение кошелька
- Пользователь подключает кошелек (Phantom) через компонент `WalletDrawer`
- Система получает публичный ключ кошелька (`publicKey`)

**Файл:** `src/app/event/[id]/page.tsx` (строки 133-218)

#### 1.2 Запрос подписи сообщения
```133:184:src/app/event/[id]/page.tsx
    useEffect(() => {
        const deriveAddressFromSignature = async () => {
            if (!publicKey || !connected) {
                setDerivedAddress(null)
                setSignature(null)
                return
            }

            try {
                // Step 1: First check if user already has an internal wallet address in database
                const balanceResponse = await fetch(`/api/wallet/balance?walletAddress=${publicKey.toBase58()}`)
                const balanceData = await balanceResponse.json()

                if (balanceData.success && balanceData.internalWalletAddress) {
                    // User already has an internal wallet - use it
                    setDerivedAddress(balanceData.internalWalletAddress)
                    console.log('Using existing internal wallet from database:', balanceData.internalWalletAddress)

                    // Still need to get signature for minting, but we'll use the existing address
                    if (signMessage || (wallet && wallet.adapter && wallet.adapter.signMessage)) {
                        const message = new TextEncoder().encode("etcha-mint-auth-v1")
                        let signature: Uint8Array
                        if (signMessage) {
                            signature = await signMessage(message)
                        } else if (wallet?.adapter?.signMessage) {
                            signature = await wallet.adapter.signMessage(message)
                        } else {
                            console.warn("Cannot get signature: wallet does not support message signing")
                            return
                        }
                        setSignature(signature) // Save signature for minting
                    }
                    return
                }

                // Step 2: User doesn't have internal wallet yet - derive new one from signature
                if (!signMessage && (!wallet || !wallet.adapter || !wallet.adapter.signMessage)) {
                    console.warn("Cannot derive address: wallet does not support message signing")
                    return
                }

                const message = new TextEncoder().encode("etcha-mint-auth-v1")

                let signature: Uint8Array
                if (signMessage) {
                    signature = await signMessage(message)
                } else if (wallet?.adapter?.signMessage) {
                    signature = await wallet.adapter.signMessage(message)
                } else {
                    console.warn("Cannot derive address: wallet does not support message signing")
                    return
                }
```

- Пользователь подписывает сообщение `"etcha-mint-auth-v1"`
- Подпись сохраняется в состоянии компонента для дальнейшего использования

#### 1.3 Генерация производного адреса кошелька
Система отправляет подпись на сервер для генерации производного адреса:

```186:208:src/app/event/[id]/page.tsx
                // Step 3: Send signature to server to derive address (salt stays secret on server)
                const signatureHex = Array.from(signature)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')

                const response = await fetch('/api/wallet/derived-address', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userPublicKey: publicKey.toBase58(),
                        signature: signatureHex,
                    }),
                })

                const data = await response.json()

                if (data.success) {
                    setDerivedAddress(data.derivedPublicKey)
                    setSignature(signature) // Save signature for later use
                    console.log('Derived new address from server:', data.derivedPublicKey)
                } else {
                    throw new Error(data.message || 'Failed to derive address')
                }
```

**Процесс на сервере** (`src/lib/utils/keyDerivation.server.ts`):
```14:46:src/lib/utils/keyDerivation.server.ts
export function deriveKeypairFromSignature(
    signature: string | Uint8Array,
    userPublicKey: string,
    salt: string
): Keypair {
    // Convert signature to consistent format
    let signatureBytes: Uint8Array
    if (typeof signature === 'string') {
        // If hex string, convert to bytes
        if (signature.startsWith('0x') || signature.length % 2 === 0) {
            signatureBytes = new Uint8Array(
                signature.replace(/^0x/, '').match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
            )
        } else {
            // If base58, decode
            signatureBytes = new Uint8Array(bs58.decode(signature))
        }
    } else {
        signatureBytes = signature
    }

    // Combine signature, publicKey, and salt
    const message = `${userPublicKey}:${Buffer.from(signatureBytes).toString('hex')}:${salt}`
    
    // Use Node.js crypto for deterministic hashing
    const hash = crypto.createHash('sha256').update(message).digest()
    
    // Take first 32 bytes for seed
    const seed = new Uint8Array(hash.slice(0, 32))
    
    // Create Keypair from seed
    return Keypair.fromSeed(seed)
}
```

**Важно:** 
- Соль (`DERIVATION_SALT`) хранится только на сервере и никогда не передается клиенту
- Производный адрес детерминистичен: одна и та же подпись + публичный ключ + соль = один и тот же адрес
- Этот адрес используется как "внутренний кошелек" для минта NFT

#### 1.4 Отображение производного адреса
Пользователь видит производный адрес и может скопировать его для пополнения:

```492:528:src/app/event/[id]/page.tsx
                    {/* Derived Wallet Address for Funding */}
                    {connected && publicKey && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-foreground">Minting Wallet Address</div>
                                {derivedAddress && (
                                    <button
                                        onClick={handleCopyDerivedAddress}
                                        className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                                        title={copiedAddress ? "Copied!" : "Copy address"}
                                    >
                                        {copiedAddress ? (
                                            <Check className="w-4 h-4 text-primary" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </button>
                                )}
                            </div>
                            {derivedAddress ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono text-foreground break-all flex-1">
                                            {formatAddress(derivedAddress)}
                                        </code>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Send SOL to this address to fund your minting wallet. You'll need enough SOL to cover the ticket price + transaction fees.
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Sign the authentication message when prompted to generate your minting wallet address.
                                </p>
                            )}
                        </div>
                    )}
```

---

### **Фаза 2: Инициация Минта (Клиент → Сервер)**

#### 2.1 Пользователь нажимает "Buy"
```287:332:src/app/event/[id]/page.tsx
    const handleBuyClick = async () => {
        if (!connected || !publicKey || !wallet || !signTransaction) {
            setIsWalletDrawerOpen(true)
            return
        }

        if (!event.candyMachineAddress) {
            alert("This event does not have an active NFT collection")
            return
        }

        setIsMinting(true)
        setMintStatus("preparing")
        setMintProgress("Requesting signature...")

        try {
            // Step 1: Use saved signature (already requested when wallet connected)
            if (!signature) {
                throw new Error('Please wait for wallet address to be generated. Sign the message when prompted.')
            }

            console.log('Using saved signature for minting...')

            setMintStatus("minting")
            setMintProgress(`Minting ${ticketQuantity} ticket${ticketQuantity > 1 ? 's' : ''}... Please approve the transaction in your wallet.`)

            console.log('Starting mint via API route...')

            // Step 2: Send signature to server for minting
            // Convert signature to hex string for transmission
            const signatureHex = Array.from(signature)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')

            // Use API route directly to avoid bundling Metaplex on client
            const mintResponse = await fetch('/api/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    candyMachineAddress: event.candyMachineAddress,
                    buyerWallet: publicKey.toBase58(),
                    quantity: ticketQuantity,
                    signature: signatureHex, // Send signature for key derivation
                }),
            })
```

**Отправляемые данные:**
- `eventId` - ID события
- `candyMachineAddress` - адрес Candy Machine
- `buyerWallet` - публичный ключ покупателя (Phantom кошелек)
- `quantity` - количество билетов
- `signature` - подпись в hex формате для выведения ключевой пары

---

### **Фаза 3: Обработка Минта (Серверная сторона)**

Основной endpoint: `POST /api/mint` (`src/app/api/mint/route.ts`)

#### 3.1 Валидация входных данных
```23:52:src/app/api/mint/route.ts
        // Validate required fields
        const {
            eventId,
            candyMachineAddress,
            buyerWallet,
            quantity,
            signature, // User signature for key derivation
        } = body

        if (!eventId || !candyMachineAddress || !buyerWallet || !quantity || !signature) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields (signature required for minting)' },
                { status: 400 }
            )
        }

        // Validate buyer wallet address
        if (!isValidSolanaAddress(buyerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid buyer wallet address' },
                { status: 400 }
            )
        }

        // Validate quantity
        if (quantity < 1 || quantity > 10) {
            return NextResponse.json(
                { success: false, message: 'Quantity must be between 1 and 10' },
                { status: 400 }
            )
        }
```

#### 3.2 Получение данных события
```54:85:src/app/api/mint/route.ts
        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        if (event.candyMachineAddress !== candyMachineAddress) {
            return NextResponse.json(
                { success: false, message: 'Candy Machine address mismatch' },
                { status: 400 }
            )
        }

        if (!event.organizer) {
            return NextResponse.json(
                { success: false, message: 'Event organizer not found' },
                { status: 404 }
            )
        }

        const organizerWallet = event.organizer.user.walletAddress
```

#### 3.3 Проверка доступности Candy Machine
```91:116:src/app/api/mint/route.ts
        // Step 1: Check Candy Machine availability
        console.log('Step 1: Checking Candy Machine availability...')
        const candyMachineData = await getCandyMachineData(candyMachineAddress)

        if (!candyMachineData.isFullyLoaded) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Candy Machine is not fully loaded. Please wait for all items to be added.`,
                },
                { status: 400 }
            )
        }

        if (candyMachineData.itemsRemaining < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Not enough tickets available. Only ${candyMachineData.itemsRemaining} remaining.`,
                },
                { status: 400 }
            )
        }

        console.log(`Available tickets: ${candyMachineData.itemsRemaining}`)
        console.log(`Candy Machine is fully loaded and ready for minting`)
```

**Функция проверки** (`src/lib/services/CandyMachineService.ts`):
```451:497:src/lib/services/CandyMachineService.ts
export async function getCandyMachineData(
    candyMachineAddress: string
): Promise<{
    itemsAvailable: number
    itemsRedeemed: number
    itemsRemaining: number
    price: number
    priceInLamports: string
    authority: string
    collectionAddress: string
    isFullyLoaded: boolean
}> {
    try {
        const metaplex = initializeMetaplex()

        console.log('Fetching Candy Machine data:', candyMachineAddress)

        const candyMachine = await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        const itemsAvailable = candyMachine.itemsAvailable.toNumber()
        const itemsRedeemed = candyMachine.itemsMinted.toNumber()
        const itemsRemaining = itemsAvailable - itemsRedeemed
        const isFullyLoaded = candyMachine.isFullyLoaded

        console.log(`Candy Machine status: ${itemsAvailable} available, ${itemsRedeemed} minted, ${itemsRemaining} remaining`)
        console.log(`Is fully loaded: ${isFullyLoaded}`)

        // Get price from guards (simplified - may need adjustment)
        const price = 0 // Placeholder - extract from guards if needed

        return {
            itemsAvailable,
            itemsRedeemed,
            itemsRemaining,
            price,
            priceInLamports: '0', // Placeholder
            authority: candyMachine.authorityAddress.toString(),
            collectionAddress: candyMachine.collectionMintAddress?.toString() || '',
            isFullyLoaded,
        }
    } catch (error) {
        console.error('Failed to get Candy Machine data:', error)
        throw new Error(`Failed to fetch Candy Machine data: ${error instanceof Error ? error.message : String(error)}`)
    }
}
```

#### 3.4 Получение/создание пользователя и выведение ключевой пары
```118:178:src/app/api/mint/route.ts
        // Step 2: Get or create user first to check existing internal wallet
        console.log('Step 2: Getting/creating user...')
        let user = await prisma.user.findUnique({
            where: { walletAddress: buyerWallet },
        })

        let userKeypair: any
        let internalWalletAddress: string

        // Step 3: Derive user keypair from signature
        console.log('Step 3: Deriving user keypair from signature...')
        const { deriveKeypairFromSignature, getDerivationSalt } = await import('@/lib/utils/keyDerivation.server')
        
        const salt = getDerivationSalt()
        const derivedKeypair = deriveKeypairFromSignature(signature, buyerWallet, salt)
        const derivedAddress = derivedKeypair.publicKey.toString()
        
        console.log('User keypair derived:', derivedAddress)

        if (!user) {
            // Create new user with derived address
            internalWalletAddress = derivedAddress
            user = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                    internalWalletAddress: internalWalletAddress,
                },
            })
            userKeypair = derivedKeypair
            console.log('New user created with internal wallet:', internalWalletAddress)
        } else if (user.internalWalletAddress) {
            // User already exists with internal wallet - use existing one
            internalWalletAddress = user.internalWalletAddress
            
            // Re-derive keypair from signature to ensure we have the keypair for minting
            // Note: This assumes the signature is consistent (same message signed each time)
            // If derived address doesn't match existing one, update it
            if (derivedAddress !== internalWalletAddress) {
                console.warn(`Derived address (${derivedAddress}) doesn't match existing (${internalWalletAddress}). Updating...`)
                internalWalletAddress = derivedAddress
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        internalWalletAddress: derivedAddress,
                    },
                })
            }
            userKeypair = derivedKeypair
            console.log('Using existing internal wallet:', internalWalletAddress)
        } else {
            // User exists but has no internal wallet - create one
            internalWalletAddress = derivedAddress
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    internalWalletAddress: derivedAddress,
                },
            })
            userKeypair = derivedKeypair
            console.log('Updated user with internal wallet:', internalWalletAddress)
        }
```

**Важно:**
- Ключевая пара выводится из подписи детерминистически
- Внутренний адрес кошелька сохраняется в базе данных в таблице `User.internalWalletAddress`
- Этот ключ используется для подписания транзакций минта

#### 3.5 Минт NFT через Candy Machine
```184:202:src/app/api/mint/route.ts
        // Step 4: Mint NFTs
        console.log('Step 4: Minting NFTs...')
        const platformSigner = loadPlatformWallet()

        const {
            nftMintAddresses,
            transactionSignature,
            totalPaid,
        } = await mintNFT({
            candyMachineAddress,
            buyerWallet,
            quantity,
            platformSigner,
            userKeypair, // Pass derived keypair
            pricePerNFT: event.price, // Pass price from database as fallback
        })

        console.log(`Minted ${nftMintAddresses.length} NFT(s)`)
        console.log('Transaction signature:', transactionSignature)
```

**Детальный процесс минта** (`src/lib/services/CandyMachineService.ts`):
```274:425:src/lib/services/CandyMachineService.ts
export async function mintNFT(params: {
    candyMachineAddress: string
    buyerWallet: string
    quantity: number
    platformSigner?: Keypair
    userKeypair?: Keypair // Derived keypair from signature
    pricePerNFT?: number // Optional price from database (fallback if guards don't have price)
}): Promise<{
    nftMintAddresses: string[]
    transactionSignature: string
    totalPaid: number
}> {
    try {
        const platformSigner = params.platformSigner || loadPlatformWallet()
        const connection = getConnection()
        
        // Use derived keypair if provided, otherwise create guest Metaplex instance
        const userKeypair = params.userKeypair
        if (!userKeypair) {
            throw new Error('User keypair is required for minting. Please provide signature.')
        }
        
        // Create Metaplex instance with derived user keypair
        const buyerMetaplex = Metaplex.make(connection)
            .use(keypairIdentity(userKeypair))

        console.log(`Minting ${params.quantity} NFT(s) from Candy Machine...`)
        console.log('Candy Machine:', params.candyMachineAddress)
        console.log('Buyer wallet (Phantom):', params.buyerWallet)
        console.log('Derived wallet (for minting):', userKeypair.publicKey.toString())

        // Check balance of derived wallet before minting
        const derivedBalance = await connection.getBalance(userKeypair.publicKey)
        const derivedBalanceSOL = derivedBalance / LAMPORTS_PER_SOL
        console.log(`Derived wallet balance: ${derivedBalanceSOL} SOL (${derivedBalance} lamports)`)

        // Get price from guards - try to extract from candy machine guards
        // Note: We'll get the actual price from the guards after fetching the candy machine
        let pricePerNFT = 0
        let totalPrice = 0
        const estimatedFees = 0.001 * params.quantity // Rough estimate for transaction fees

        // Get Candy Machine
        const candyMachine = await buyerMetaplex.candyMachines().findByAddress({
            address: new PublicKey(params.candyMachineAddress),
        })

        // Verify Candy Machine is fully loaded before minting
        if (!candyMachine.isFullyLoaded) {
            throw new Error(
                `Candy Machine is not fully loaded. ` +
                `Items available: ${candyMachine.itemsAvailable.toNumber()}, ` +
                `but not all config lines were added. ` +
                `Please complete item insertion before minting.`
            )
        }

        console.log(`Candy Machine is fully loaded: ${candyMachine.itemsAvailable.toNumber()} items ready for minting`)
        console.log(`Items already minted: ${candyMachine.itemsMinted.toNumber()}`)

        // Extract price from guards (solPayment guard)
        try {
            // In JS SDK v0.19.0, guards are stored in candyMachine.guards
            // Type assertion for guards that may not be in type definitions
            const candyMachineWithGuards = candyMachine as typeof candyMachine & {
                guards?: {
                    solPayment?: {
                        amount?: number | bigint | { basisPoints?: number | bigint } | { basisPoints: { toNumber?: () => number } }
                    }
                }
            }
            
            const guards = candyMachineWithGuards.guards
            if (guards && guards.solPayment) {
                // solPayment.amount may be in different formats
                const solPaymentAmount = guards.solPayment.amount
                if (solPaymentAmount !== undefined) {
                    if (typeof solPaymentAmount === 'number' || typeof solPaymentAmount === 'bigint') {
                        pricePerNFT = Number(solPaymentAmount) / LAMPORTS_PER_SOL
                    } else if (typeof solPaymentAmount === 'object' && solPaymentAmount !== null) {
                        // Try basisPoints property
                        const amountObj = solPaymentAmount as { basisPoints?: number | bigint | { toNumber?: () => number } }
                        if (amountObj.basisPoints !== undefined) {
                            if (typeof amountObj.basisPoints === 'number' || typeof amountObj.basisPoints === 'bigint') {
                                pricePerNFT = Number(amountObj.basisPoints) / LAMPORTS_PER_SOL
                            } else if (typeof amountObj.basisPoints === 'object' && 'toNumber' in amountObj.basisPoints) {
                                enabledPerNFT = (amountObj.basisPoints.toNumber?.() || 0) / LAMPORTS_PER_SOL
                            }
                        }
                    }
                    console.log(`Price from guards: ${pricePerNFT} SOL`)
                }
            }
        } catch (guardError) {
            console.warn('Could not extract price from guards:', guardError)
        }

        // Fallback to database price if guards don't have price
        if (pricePerNFT === 0 && params.pricePerNFT) {
            pricePerNFT = params.pricePerNFT
            console.log(`Using price from database: ${pricePerNFT} SOL`)
        }

        totalPrice = pricePerNFT * params.quantity
        
        // Final balance check before minting
        if (derivedBalanceSOL < totalPrice + estimatedFees) {
            throw new Error(
                `Insufficient balance in derived wallet. ` +
                `Required: ${(totalPrice + estimatedFees).toFixed(4)} SOL, ` +
                `Available: ${derivedBalanceSOL.toFixed(4)} SOL. ` +
                `Please send SOL to: ${userKeypair.publicKey.toString()}`
            )
        }

        const nftMintAddresses: string[] = []
        let lastSignature = ''

        // Mint NFTs one by one
        for (let i = 0; i < params.quantity; i++) {
            console.log(`Minting NFT ${i + 1}/${params.quantity}...`)

            // Mint NFT
            // Note: In production, this should be signed by buyer's wallet
            // For now, using platform signer as collection update authority
            const { nft, response } = await buyerMetaplex.candyMachines().mint({
                candyMachine,
                collectionUpdateAuthority: platformSigner.publicKey,
            })

            lastSignature = response.signature
            nftMintAddresses.push(nft.address.toString())

            console.log(`Minted NFT ${i + 1}/${params.quantity}:`, nft.address.toString())
        }

        // Calculate total paid (price already fetched above for balance check)
        const totalPaid = pricePerNFT * params.quantity

        console.log(`Minting complete. Total paid: ${totalPaid} SOL`)
        console.log(`Remaining balance: ${((derivedBalance / LAMPORTS_PER_SOL) - totalPrice - estimatedFees).toFixed(4)} SOL`)

        return {
            nftMintAddresses,
            transactionSignature: lastSignature,
            totalPaid,
        }
    } catch (error) {
        console.error('Failed to mint NFT:', error)
        throw new Error(`NFT minting failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}
```

**Ключевые моменты:**
- Проверяется баланс производного кошелька перед минтом
- Цена извлекается из guards Candy Machine или берется из базы данных
- Минт происходит последовательно (по одному NFT за раз)
- Транзакции подписываются производной ключевой парой пользователя
- Collection Update Authority - это платформенный кошелек

#### 3.6 Распределение платежа
```204:216:src/app/api/mint/route.ts
        // Step 4: Distribute payment (97.5% / 2.5%)
        console.log('Step 4: Distributing payment...')
        const {
            organizerShare,
            platformShare,
            transactionHash: distributionTxHash,
        } = await distributePayment({
            totalAmount: totalPaid,
            organizerWallet,
            platformWallet: platformSigner,
        })

        console.log('Payment distributed successfully')
```

**Функция распределения** (`src/lib/services/CandyMachineService.ts`):
```502:539:src/lib/services/CandyMachineService.ts
export async function distributePayment(params: {
    totalAmount: number
    organizerWallet: string
    platformWallet?: Keypair
}): Promise<{
    organizerShare: number
    platformShare: number
    transactionHash: string
}> {
    try {
        const platformWallet = params.platformWallet || loadPlatformWallet()

        // Calculate shares (in lamports)
        const totalLamports = Math.floor(params.totalAmount * LAMPORTS_PER_SOL)
        const organizerShareLamports = Math.floor(totalLamports * 0.975)
        const platformShareLamports = totalLamports - organizerShareLamports

        console.log(`Distributing payment: ${params.totalAmount} SOL`)
        console.log(`  Organizer (97.5%): ${organizerShareLamports / LAMPORTS_PER_SOL} SOL`)
        console.log(`  Platform (2.5%): ${platformShareLamports / LAMPORTS_PER_SOL} SOL`)

        // Simple transfer - in production, this should be more sophisticated
        // This is a placeholder - actual implementation depends on how payments are handled
        // TODO: Implement actual SOL transfer using Metaplex or web3.js
        const transactionHash = 'transfer-placeholder'

        console.log('Payment distributed successfully')

        return {
            organizerShare: organizerShareLamports / LAMPORTS_PER_SOL,
            platformShare: platformShareLamports / LAMPORTS_PER_SOL,
            transactionHash,
        }
    } catch (error) {
        console.error('Failed to distribute payment:', error)
        throw new Error(`Payment distribution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}
```

**⚠️ Внимание:** Функция `distributePayment` в текущей реализации является placeholder. Реальное распределение средств должно быть реализовано.

#### 3.7 Создание заказа в базе данных
```218:230:src/app/api/mint/route.ts
        // Step 5: Create order in database
        console.log('Step 5: Creating order in database...')
        // Note: totalPaid from mintNFT is already in SOL, not lamports
        const order = await prisma.order.create({
            data: {
                eventId,
                userId: user.id,
                quantity,
                totalPrice: totalPaid, // totalPaid is already in SOL
                status: 'confirmed',
                transactionHash: transactionSignature,
            },
        })
```

#### 3.8 Создание записей билетов
```232:246:src/app/api/mint/route.ts
        // Step 6: Create ticket records
        console.log('Step 6: Creating ticket records...')
        const ticketData = nftMintAddresses.map((nftMintAddress, index) => ({
            eventId,
            orderId: order.id,
            userId: user.id,
            nftMintAddress,
            tokenId: index + 1,
            isValid: true,
            isUsed: false,
        }))

        await prisma.ticket.createMany({
            data: ticketData,
        })
```

#### 3.9 Создание записи распределения платежа
```248:262:src/app/api/mint/route.ts
        // Step 7: Create payment distribution record
        console.log('Step 7: Creating payment distribution record...')
        // @ts-ignore - PaymentDistribution model exists but TypeScript doesn't recognize it yet
        await (prisma as any).paymentDistribution.create({
            data: {
                orderId: order.id,
                totalAmount: totalPaid, // Already in SOL
                organizerShare: organizerShare, // Already in SOL from distributePayment
                platformShare: platformShare, // Already in SOL from distributePayment
                organizerWallet,
                platformWallet: platformSigner.publicKey.toBase58(),
                transactionHash: distributionTxHash,
                status: 'completed',
            },
        })
```

#### 3.10 Обновление счетчика проданных билетов
```264:273:src/app/api/mint/route.ts
        // Step 8: Update event tickets sold
        console.log('Step 8: Updating event tickets sold...')
        await prisma.event.update({
            where: { id: eventId },
            data: {
                ticketsSold: {
                    increment: quantity,
                },
            },
        })
```

#### 3.11 Возврат результата клиенту
```277:290:src/app/api/mint/route.ts
        return NextResponse.json({
            success: true,
            nftMintAddresses,
            transactionSignature,
            organizerPayment: {
                amount: lamportsToSol(organizerShare),
                transactionHash: distributionTxHash,
            },
            platformFee: {
                amount: lamportsToSol(platformShare),
            },
            orderId: order.id,
            message: 'NFT tickets minted successfully',
        })
```

---

### **Фаза 4: Подтверждение (Опционально)**

Endpoint: `POST /api/mint/confirm` (`src/app/api/mint/confirm/route.ts`)

Этот endpoint используется как резервный для подтверждения минта, если процесс был прерван:

```14:249:src/app/api/mint/confirm/route.ts
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        const {
            eventId,
            candyMachineAddress,
            buyerWallet,
            quantity,
            nftMintAddresses,
            transactionSignature,
        } = body

        if (!eventId || !candyMachineAddress || !buyerWallet || !quantity || !nftMintAddresses || !transactionSignature) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate buyer wallet address
        if (!isValidSolanaAddress(buyerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid buyer wallet address' },
                { status: 400 }
            )
        }

        // Validate quantity matches NFT addresses
        if (nftMintAddresses.length !== quantity) {
            return NextResponse.json(
                { success: false, message: 'Quantity mismatch with NFT addresses' },
                { status: 400 }
            )
        }

        // Verify transaction on-chain
        console.log('Verifying transaction on-chain:', transactionSignature)
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
        )

        try {
            // Convert base64 signature to buffer
            const signatureBuffer = Buffer.from(transactionSignature, 'base64')
            const signatureBase58 = signatureBuffer.toString('base64')

            // Try to get transaction (this will throw if transaction doesn't exist)
            // Note: We just verify it exists, actual validation would check the transaction details
            console.log('Transaction verified on-chain')
        } catch (txError) {
            console.error('Transaction verification error:', txError)
            // Continue anyway - in production you'd want stricter validation
        }

        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        if (event.candyMachineAddress !== candyMachineAddress) {
            return NextResponse.json(
                { success: false, message: 'Candy Machine address mismatch' },
                { status: 400 }
            )
        }

        if (!event.organizer) {
            return NextResponse.json(
                { success: false, message: 'Event organizer not found' },
                { status: 404 }
            )
        }

        const organizerWallet = event.organizer.user.walletAddress

        console.log(`Confirming mint of ${quantity} ticket(s) for event: ${eventId}`)

        // Get or create user
        console.log('Getting/creating user...')
        let user = await prisma.user.findUnique({
            where: { walletAddress: buyerWallet },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                },
            })
        }

        // Calculate payment details
        // User already paid through Candy Guard, so we just record what they paid
        const pricePerTicket = event.price // Price in SOL from database
        const totalPrice = pricePerTicket * quantity
        const organizerShare = totalPrice * 0.975 // 97.5% to organizer
        const platformShare = totalPrice * 0.025 // 2.5% to platform

        console.log('Payment details:', {
            totalPrice,
            organizerShare,
            platformShare,
        })

        // Create order in database
        console.log('Creating order in database...')
        const order = await prisma.order.create({
            data: {
                eventId,
                userId: user.id,
                quantity,
                totalPrice,
                status: 'confirmed',
                transactionHash: transactionSignature,
            },
        })

        // Create ticket records
        console.log('Creating ticket records...')
        
        // Check which tickets already exist to avoid duplicates
        const existingTickets = await prisma.ticket.findMany({
            where: {
                nftMintAddress: {
                    in: nftMintAddresses,
                },
            },
            select: {
                nftMintAddress: true,
            },
        })
        
        const existingAddresses = new Set(existingTickets.map(t => t.nftMintAddress))
        const newNftAddresses = nftMintAddresses.filter(
            (addr: string) => !existingAddresses.has(addr)
        )
        
        if (existingTickets.length > 0) {
            console.log(`Warning: ${existingTickets.length} ticket(s) already exist, skipping duplicates`)
        }
        
        if (newNftAddresses.length > 0) {
            const ticketData = newNftAddresses.map((nftMintAddress: string, index: number) => {
                // Find the original index in nftMintAddresses array
                const originalIndex = nftMintAddresses.indexOf(nftMintAddress)
                return {
                    eventId,
                    orderId: order.id,
                    userId: user.id,
                    nftMintAddress,
                    tokenId: originalIndex + 1,
                    isValid: true,
                    isUsed: false,
                }
            })

            await prisma.ticket.createMany({
                data: ticketData,
                skipDuplicates: true, // Additional safety
            })
            
            console.log(`Created ${newNftAddresses.length} new ticket record(s)`)
        } else {
            console.log('All tickets already exist in database, skipping creation')
        }

        // Create payment distribution record (note: actual payment happened through Candy Guard)
        console.log('Creating payment distribution record...')
        await (prisma as any).paymentDistribution.create({
            data: {
                orderId: order.id,
                totalAmount: totalPrice,
                organizerShare: organizerShare,
                platformShare: platformShare,
                organizerWallet,
                platformWallet: process.env.PLATFORM_WALLET_PUBLIC_KEY || 'Unknown',
                transactionHash: transactionSignature,
                status: 'completed',
            },
        })

        // Update event tickets sold
        console.log('Updating event tickets sold...')
        await prisma.event.update({
            where: { id: eventId },
            data: {
                ticketsSold: {
                    increment: quantity,
                },
            },
        })

        console.log('Mint confirmed successfully')

        return NextResponse.json({
            success: true,
            nftMintAddresses,
            transactionSignature,
            organizerPayment: {
                amount: organizerShare,
                transactionHash: transactionSignature,
            },
            platformFee: {
                amount: platformShare,
            },
            orderId: order.id,
            message: 'NFT tickets confirmed successfully',
        })
    } catch (error: unknown) {
        console.error('Error confirming mint:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to confirm NFT tickets',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}
```

---

### **Фаза 5: Отображение результата (Клиент)**

После успешного минта клиент получает результат и отображает модальное окно:

```334:379:src/app/event/[id]/page.tsx
            const mintResult = await mintResponse.json()

            if (!mintResult.success) {
                throw new Error(mintResult.message || 'Failed to mint NFT tickets')
            }

            const nftMintAddresses = mintResult.nftMintAddresses || []
            const txSignature = mintResult.transactionSignature || ''

            console.log('Mint successful!', { nftMintAddresses, txSignature })

            // Step 2: Save to database
            setMintProgress("Saving ticket information...")

            const response = await fetch("/api/mint/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId: event.id,
                    candyMachineAddress: event.candyMachineAddress,
                    buyerWallet: publicKey.toBase58(),
                    quantity: ticketQuantity,
                    nftMintAddresses,
                    transactionSignature: txSignature,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setMintStatus("complete")
                setMintProgress("Minted successfully!")
                setMintResult({
                    ...result,
                    nftMintAddresses,
                    transactionSignature: txSignature,
                })
                setShowMintModal(true)

                // Refresh Candy Machine data
                // Note: Candy Machine data refresh handled by CollectionStatus component
            } else {
                setMintStatus("error")
                setMintProgress(result.message || "Failed to save ticket information")
                setTimeout(() => setIsMinting(false), 3000)
            }
```

**Компонент результата** (`src/components/MintResultModal.tsx`):
- Отображает адреса минтованных NFT
- Показывает хеш транзакции
- Показывает разбивку платежа (97.5% организатору, 2.5% платформе)
- Предоставляет ссылки на Solana Explorer

---

## 🔐 Безопасность и Важные Детали

### **Выведение ключевой пары из подписи**

1. **Детерминистичность:** Одна и та же подпись + публичный ключ + соль = один и тот же адрес
2. **Секретность соли:** Соль (`DERIVATION_SALT`) хранится только на сервере
3. **Безопасность:** Невозможно воссоздать ключевую пару без соли, даже зная подпись

### **Два типа кошельков**

1. **Внешний кошелек (`walletAddress`):** Кошелек пользователя (Phantom)
   - Используется для аутентификации
   - Используется для подписания сообщений

2. **Внутренний кошелек (`internalWalletAddress`):** Производный кошелек
   - Генерируется из подписи
   - Используется для минта NFT
   - Требует пополнения SOL для оплаты минта

### **Процесс оплаты**

**Текущая реализация:**
- Платеж происходит через Candy Machine guards (`solPayment`)
- Деньги идут на платформенный кошелек при минте
- Затем (теоретически) распределяются: 97.5% организатору, 2.5% платформе

**⚠️ Проблема:** Функция `distributePayment` является placeholder и не выполняет реальный перевод SOL.

---

## 📊 Структура Базы Данных

### **Таблицы, участвующие в процессе:**

1. **`User`**
   - `walletAddress` - внешний кошелек (Phantom)
   - `internalWalletAddress` - производный внутренний кошелек

2. **`Order`**
   - Хранит информацию о заказе
   - Связывает пользователя, событие и билеты

3. **`Ticket`**
   - Каждый билет = один NFT
   - Содержит `nftMintAddress` - адрес NFT на блокчейне

4. **`PaymentDistribution`**
   - Хранит информацию о распределении платежа
   - Связывается с заказом

5. **`Event`**
   - `candyMachineAddress` - адрес Candy Machine
   - `ticketsSold` - счетчик проданных билетов

---

## 🔍 Потенциальные Проблемы и Улучшения

### **1. Распределение платежа**
Функция `distributePayment` не реализована полностью. Нужно:
- Реализовать реальную отправку SOL организатору
- Обработать ошибки при переводе
- Возможно, использовать программируемые кошельки для автоматизации

### **2. Проверка баланса**
Перед минтом проверяется баланс производного кошелька, но:
- Пользователь должен самостоятельно отправить SOL на производный адрес
- Нет автоматического пополнения из внешнего кошелька

### **3. Обработка ошибок**
- Нет обработки случая, когда минт прошел, но сохранение в БД не удалось
- Нет механизма восстановления после ошибок

### **4. Подтверждение транзакций**
- Не всегда проверяется финальное подтверждение транзакции на блокчейне
- Можно добавить ожидание подтверждения перед возвратом успеха

---

## 📝 Резюме Процесса

```
1. Клиент подключает кошелек → получает публичный ключ
2. Клиент подписывает сообщение → получает подпись
3. Сервер выводит ключевую пару из подписи → создает производный адрес
4. Пользователь пополняет производный адрес SOL
5. Пользователь нажимает "Buy" → отправляет запрос на /api/mint
6. Сервер проверяет доступность Candy Machine
7. Сервер проверяет баланс производного кошелька
8. Сервер минтует NFT через Candy Machine (подписывает производной ключевой парой)
9. Сервер создает записи в БД (Order, Ticket, PaymentDistribution)
10. Сервер обновляет счетчик проданных билетов
11. Клиент получает результат и отображает модальное окно с NFT адресами
```

---

## 🔗 Связанные Файлы

- **API Routes:**
  - `src/app/api/mint/route.ts` - основной endpoint минта
  - `src/app/api/mint/confirm/route.ts` - подтверждение минта
  - `src/app/api/wallet/derived-address/route.ts` - получение производного адреса

- **Services:**
  - `src/lib/services/CandyMachineService.ts` - работа с Candy Machine
  - `src/lib/utils/keyDerivation.server.ts` - выведение ключевой пары
  - `src/lib/utils/wallet.ts` - утилиты для работы с кошельками

- **Components:**
  - `src/app/event/[id]/page.tsx` - страница события с формой покупки
  - `src/components/MintProgress.tsx` - компонент прогресса минта
  - `src/components/MintResultModal.tsx` - модальное окно результата

- **Database:**
  - `prisma/schema.prisma` - схема базы данных

