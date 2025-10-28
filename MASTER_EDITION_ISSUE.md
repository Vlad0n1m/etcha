# 🔍 Master Edition Issue — Диагностика

## 📋 Ситуация

Первый фикс добавил `updateAuthority`, что **исправило создание Collection NFT**, но 
**Candy Machine всё ещё падает** с `Incorrect account owner` при delegate операции.

**Значит, проблема не в metadata, а в Master Edition PDA!**

## 🔧 Что было добавлено

### 1. Проверка Master Edition после создания NFT

При создании Collection NFT теперь проверяется **оба** аккаунта:
- ✅ Metadata PDA
- ✅ Master Edition PDA

```typescript
// Check master edition
if (masterEditionAccountInfo) {
    const actualOwner = masterEditionAccountInfo.owner.toBase58();
    if (actualOwner === expectedOwner) {
        console.log('✅ Master Edition owner is correct: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    } else {
        console.warn(`⚠️ Master Edition owner mismatch! Expected: ${expectedOwner}, Got: ${actualOwner}`);
    }
} else {
    console.log('⚠️ Master Edition account not found - this might be the issue!');
}
```

### 2. Расширенная диагностика перед созданием Candy Machine

**Перед** попыткой создать Candy Machine, код проверяет все требуемые аккаунты:

```typescript
// Check mint account
const mintInfo = await connection.getAccountInfo(collectionMintPublicKey);

// Check metadata PDA
const [metadataPda] = ...

// Check master edition PDA
const [masterEditionPda] = ...

// Вывод результатов:
console.log('✅ Mint account exists and is owned by: TokenkegQfeZyiNwAJsyFbPVwwQQfjasRRicxo6tnk');
console.log('✅ Metadata account exists and is owned by: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
console.log('❌ Master Edition account NOT FOUND - this is the issue!');
```

## 🎯 Возможные причины проблемы

### Сценарий 1: Master Edition не создается

Если при создании Collection NFT master edition не создается, то:
- ✅ Metadata PDA будет правильным и принадлежать `metaqbxx...`
- ❌ Master Edition PDA не будет создана вообще
- ❌ Candy Machine при CPI будет пытаться делегировать несуществующий аккаунт
- ❌ CPI упадет с `Incorrect account owner`

**Решение:**  
`createNft()` из `@metaplex-foundation/mpl-token-metadata` ДОЛЖНА создавать master edition автоматически. 
Если не создается, возможны варианты:

1. **Версия библиотеки устарела** — обновить `@metaplex-foundation/mpl-token-metadata`
2. **Плагин не подключен** — убедиться, что `mplTokenMetadata()` подключен в SolanaService
3. **Параметры неправильные** — проверить параметры `createNft()`

### Сценарий 2: Master Edition создается, но с неправильным owner

Если master edition создается, но owner не `metaqbxx...`, то:
- ❌ Диагностика покажет `⚠️ Master Edition owner mismatch!`
- ❌ Candy Machine не сможет делегировать authority
- ❌ CPI упадет с `Incorrect account owner`

**Решение:**  
Пересоздать Collection NFT заново, убедившись что SolanaService правильно инициализирован.

## 📊 Ожидаемый лог при проблеме

```
✅ Metadata owner is correct: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
⚠️ Master Edition account not found - this might be the issue!
🎉 Collection NFT created successfully! Address: DmaMWThVKs8nqZ12s2kZftQCQY2moCwEWnhgrbdvLyRa

(потом)

🔍 Verifying Collection NFT state before Candy Machine creation...
✅ Mint account exists and is owned by: TokenkegQfeZyiNwAJsyFbPVwwQQfjaXXXXXXXXXXX
✅ Metadata account exists and is owned by: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
❌ Master Edition account NOT FOUND - this is the issue!
Collection NFT may not have been created as a proper collection NFT.

(потом падает)

Program log: IX: Delegate
Program log: Incorrect account owner
```

## 🔧 Следующие шаги

### Если Master Edition не создается:

1. **Проверить версию библиотеки:**
   ```bash
   npm list @metaplex-foundation/mpl-token-metadata
   ```

2. **Если версия < 0.20.0, обновить:**
   ```bash
   npm install @metaplex-foundation/mpl-token-metadata@latest
   ```

3. **Проверить SolanaService:**
   ```typescript
   this.umi = createUmi(this.config.solana.rpcUrl)
       .use(mplTokenMetadata())   // ← Должен быть
       .use(mplCandyMachine());   // ← Должен быть
   ```

4. **Пересоздать Collection NFT:**
   ```bash
   DELETE FROM collections WHERE collectionNftAddress IS NOT NULL;
   POST /api/events (create new collection)
   ```

### Если Master Edition существует но owner неправильный:

1. **Перезагрузить сервер** — может быть проблема инициализации
2. **Проверить SOLANA_PRIVATE_KEY** — правильный ли бэкенд кошелек?
3. **Пересоздать коллекцию** с правильным кошельком

## 📝 Git Commit

```
commit a961dac...
    fix: add extended diagnostics for Candy Machine Master Edition account verification
    
    - Added check for Master Edition PDA after Collection NFT creation
    - Added pre-Candy Machine creation diagnostics
```

---

**Статус:** 🔍 Ожидается тестирование с новой диагностикой
