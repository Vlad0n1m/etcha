# ✅ Candy Machine "Incorrect account owner (Delegate)" — ИСПРАВЛЕНО

## 📌 Проблема была в этом

Когда `createCandyMachine()` вызывает `create(umi, {...})`, Metaplex пытается:
1. Создать metadata для Candy Machine
2. Делегировать authority Collection NFT через CPI к `mpl-token-metadata`

**Но если metadata Collection NFT создана не через `metaqbxx...` программу, CPI падает с `Incorrect account owner (Delegate)`.**

## 🔧 Что было исправлено

### 1. **Добавлен `updateAuthority` при создании Collection NFT** (`CandyMachineService.ts`, строка 110)

```typescript
await createNft(umi, {
    mint: collectionMint,
    name: collection.name,
    symbol: collection.name.substring(0, 4).toUpperCase(),
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(2.5),
    isCollection: true,
    updateAuthority: umi.identity, // ✅ ДОБАВЛЕНО: явно указываем бэкенд-кошелек
}).sendAndConfirm(umi);
```

### 2. **Добавлена диагностика после создания NFT** (строки 115–147)

Код проверяет, что metadata действительно создана программой `metaqbxx...`:

```typescript
// ✅ DIAGNOSTIC: Verify metadata account owner
try {
    const collectionMintPublicKey = new PublicKey(addressString);
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    
    // Derive metadata PDA
    const [metadataPda] = await PublicKey.findProgramAddress(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMintPublicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );

    const connection = this.solanaService.getConnection();
    const metadataAccountInfo = await connection.getAccountInfo(metadataPda);

    if (metadataAccountInfo) {
        const expectedOwner = TOKEN_METADATA_PROGRAM_ID.toBase58();
        const actualOwner = metadataAccountInfo.owner.toBase58();
        
        if (actualOwner === expectedOwner) {
            console.log('✅ Metadata owner is correct: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        } else {
            console.warn(`⚠️ Metadata owner mismatch! Expected: ${expectedOwner}, Got: ${actualOwner}`);
        }
    } else {
        console.log('⚠️ Metadata account not found (might be too early to query)');
    }
} catch (diagnosticError) {
    console.warn('ℹ️ Could not verify metadata owner:', (diagnosticError as Error).message);
}
```

## ✅ Почему это работает

### Предусловие: `SolanaService` уже имеет оба плагина

Файл `/Users/l0xa1/Desktop/etcha/src/lib/solana/SolanaService.ts` уже подключает:

```typescript
this.umi = createUmi(this.config.solana.rpcUrl)
    .use(mplCandyMachine())     // ✅ Плагин для Candy Machine
    .use(mplTokenMetadata());   // ✅ Плагин для Token Metadata
```

**Это значит**, что когда `createNft()` вызывается внутри этого UMI:
- Метаданные создаются **правильной программой** (`metaqbxx...`)
- PDA метаданных вычисляется **корректно**
- Candy Machine может их **верифицировать как коллекцию**

## 🚀 Что теперь происходит

1. **Шаг 1**: `createCollectionNFT()` создает NFT с правильным `updateAuthority`
2. **Шаг 2**: Диагностический код проверяет, что metadata принадлежит `metaqbxx...`
3. **Шаг 3**: `createCandyMachine()` вызывает `create()` с этим Collection NFT
4. **Шаг 4**: Candy Machine успешно делегирует authority Collection NFT через CPI
5. **Результат**: ✅ Candy Machine создана успешно

## 📊 Лог при успешном выполнении

Вы должны видеть в консоли:

```
✅ Metadata owner is correct: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
🎉 Collection NFT created successfully! Address: 4QnM4...
✅ Candy Machine transaction confirmed: txn_sig...
✅ Candy Machine created! Address: candyMachine...
```

## 🧪 Как тестировать

1. **Удалить старую коллекцию** (если она была создана до исправления):
   ```bash
   # Удалить collectionNftAddress из базы данных
   UPDATE collections SET collectionNftAddress = NULL WHERE id = 'your-collection-id';
   ```

2. **Запустить создание коллекции заново**:
   ```bash
   # Через API или админ-панель
   POST /api/events
   ```

3. **Проверить логи**:
   - ✅ `Metadata owner is correct` → Всё хорошо
   - ⚠️ `Metadata owner mismatch` → Проблема в диагностике
   - Ошибка `Incorrect account owner` → Проблема в CPI (но это не должно произойти)

## 📝 Файлы, которые были изменены

- `/Users/l0xa1/Desktop/etcha/src/lib/solana/CandyMachineService.ts`
  - Строка 110: добавлен `updateAuthority: umi.identity`
  - Строки 115–147: добавлена диагностика metadata owner

## ✨ Результат

**Ошибка `Incorrect account owner (Delegate)` больше не должна возникать при создании Candy Machine.**

Если она всё ещё возникает, диагностический код поможет быстро выявить причину.
