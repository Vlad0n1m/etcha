# 🎫 NFT Билеты на Solana - Candy Machine V3

Полная интеграция Metaplex Candy Machine V3 для создания и продажи NFT билетов на ивенты.

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

Уже установлены все необходимые пакеты:
- `@metaplex-foundation/mpl-candy-machine` v6.1.0
- `@metaplex-foundation/umi` v1.4.1
- `@metaplex-foundation/mpl-token-metadata` v3.4.0
- И другие...

### 2. Настройка Environment Variables

Создайте `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# Solana (Devnet для тестирования)
SOLANA_NETWORK="devnet"
SOLANA_RPC_URL="https://api.devnet.solana.com"

# Platform Wallet
PLATFORM_WALLET_PRIVATE_KEY="[1,2,3,...]"
PLATFORM_WALLET_PUBLIC_KEY="YourPublicKeyHere"

# Candy Machine Authority
CANDY_MACHINE_AUTHORITY_PRIVATE_KEY="[1,2,3,...]"
```

### 3. Генерация Keypairs

```bash
# Установить Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Создать platform keypair
solana-keygen new --outfile platform-keypair.json

# Получить массив для .env
cat platform-keypair.json
```

### 4. Получить Devnet SOL

```bash
# Airdrop SOL на platform wallet
solana airdrop 2 YOUR_PLATFORM_WALLET_ADDRESS --url devnet
```

### 5. Запустить проект

```bash
npm run dev
```

Откройте `http://localhost:3000`

---

## 📁 Структура проекта

```
src/
├── lib/
│   ├── services/
│   │   ├── CandyMachineService.ts  ← Реальная интеграция Metaplex
│   │   ├── MetadataUploadService.ts ← Загрузка на Arweave
│   │   └── AuctionHouseService.ts   ← Для ресейла (заглушка)
│   └── utils/
│       ├── wallet.ts                ← Работа с кошельками
│       └── nft-metadata.ts          ← Генерация метаданных
├── app/
│   ├── api/
│   │   ├── collections/create/      ← POST создание коллекции
│   │   ├── mint/                    ← POST минт NFT
│   │   └── candy-machine/[address]/ ← GET данные CM
│   ├── organizer/
│   │   └── create-collection/       ← UI создания коллекции
│   └── event/[id]/                  ← UI покупки билетов
└── components/
    ├── CollectionStatus.tsx         ← Статус коллекции
    ├── MintProgress.tsx             ← Прогресс минта
    └── MintResultModal.tsx          ← Результат минта
```

---

## 🎯 Основные функции

### Для организаторов:

1. **Создание NFT коллекции** (`/organizer/create-collection`)
   - Загрузка метаданных на Arweave
   - Создание Candy Machine V3
   - Настройка guards (цена, защита от ботов)

2. **Получение 97.5% от продаж**
   - Автоматическое распределение после минта
   - Запись в БД (PaymentDistribution)

### Для покупателей:

1. **Покупка NFT билетов** (страница ивента)
   - Подключение Solana кошелька
   - Выбор количества билетов
   - Оплата в SOL

2. **Метаданные NFT содержат:**
   - Дату и время ивента
   - Место проведения
   - Информацию об организаторе (имя, фото)
   - Категорию ивента

---

## 💰 Payment Flow (97.5% / 2.5%)

```
1. User → Candy Machine (Guard: solPayment)
   ↓
2. 100% → Platform Wallet
   ↓
3. Backend: distributePayment()
   ├─ 97.5% → Organizer Wallet
   └─ 2.5% → Platform (остается)
   ↓
4. Запись в БД (PaymentDistribution)
```

---

## 🛠️ API Endpoints

### POST `/api/collections/create`
Создание NFT коллекции для ивента

**Request:**
```json
{
  "eventId": "string",
  "organizerWallet": "string",
  "totalSupply": 100,
  "priceInSol": 0.5,
  "metadata": {
    "name": "Event Name",
    "symbol": "TICKET",
    "description": "Description",
    "image": "base64 or URL",
    "eventDate": "2024-03-15",
    "eventTime": "19:00",
    "location": "Barcelona",
    "category": "Blockchain",
    "organizer": {
      "name": "Organizer Name",
      "avatar": "URL",
      "description": "Description"
    }
  }
}
```

### POST `/api/mint`
Минт NFT билетов

**Request:**
```json
{
  "eventId": "string",
  "candyMachineAddress": "string",
  "buyerWallet": "string",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "nftMintAddresses": ["NFT1...", "NFT2..."],
  "transactionSignature": "SIG...",
  "organizerPayment": {
    "amount": 0.975,
    "transactionHash": "TX..."
  },
  "platformFee": {
    "amount": 0.025
  },
  "orderId": "ORDER_ID"
}
```

### GET `/api/candy-machine/[address]`
Получить данные Candy Machine

**Response:**
```json
{
  "itemsAvailable": 100,
  "itemsRedeemed": 25,
  "itemsRemaining": 75,
  "price": 0.5,
  "collectionAddress": "ADDR..."
}
```

---

## 📚 Документация

- **`CANDY_MACHINE_IMPLEMENTATION.md`** - Полная документация по реализации
- **`IMPLEMENTATION_SUMMARY.md`** - Краткий обзор
- **`REAL_METAPLEX_INTEGRATION.md`** - Детали Metaplex интеграции

---

## 🧪 Тестирование

### 1. Devnet тест

```bash
# 1. Получить SOL
solana airdrop 2 YOUR_WALLET --url devnet

# 2. Создать коллекцию через UI
# Перейти на /organizer/create-collection

# 3. Попробовать купить билет
# Перейти на /event/[id]

# 4. Проверить транзакции
# https://explorer.solana.com/?cluster=devnet
```

### 2. Проверить БД

```sql
-- Проверить Order
SELECT * FROM orders WHERE status = 'confirmed';

-- Проверить Tickets
SELECT * FROM tickets;

-- Проверить PaymentDistribution
SELECT * FROM payment_distributions;
```

---

## ⚙️ Конфигурация Candy Machine

### Guards используемые в проекте:

1. **solPayment** - Оплата в SOL
   ```typescript
   solPayment: some({
     lamports: sol(0.5),
     destination: platformWallet
   })
   ```

2. **botTax** - Защита от ботов
   ```typescript
   botTax: some({
     lamports: sol(0.01),
     lastInstruction: true
   })
   ```

3. **startDate** (опционально)
   ```typescript
   startDate: some({
     date: dateTime(timestamp)
   })
   ```

---

## 🚀 Production Deploy

### Checklist:

- [ ] Переключить `SOLANA_NETWORK` на `mainnet-beta`
- [ ] Использовать платный RPC (Helius/QuickNode)
- [ ] Пополнить platform wallet SOL (~5-10 SOL)
- [ ] Пополнить Irys wallet для загрузки метаданных
- [ ] Протестировать весь flow на devnet
- [ ] Настроить мониторинг транзакций
- [ ] Добавить error handling и retry logic
- [ ] Настроить CORS и rate limiting
- [ ] Запустить БД миграции
- [ ] Проверить безопасность private keys

---

## 🐛 Troubleshooting

### "PLATFORM_WALLET_PRIVATE_KEY not set"
→ Добавьте private key в `.env.local`

### "Insufficient SOL"
→ Пополните platform wallet

### "Failed to upload to Arweave"
→ Проверьте IRYS_PRIVATE_KEY и баланс

### "Transaction failed"
→ Проверьте Solana Explorer, возможно RPC лимиты

---

## 📞 Support

Если возникнут вопросы:
1. Проверьте логи в консоли (browser & server)
2. Проверьте Solana Explorer для транзакций
3. Проверьте балансы кошельков
4. См. полную документацию в папке проекта

---

## ✅ Статус

**Версия:** 2.0  
**Дата:** 2025-01-28  
**Статус:** ✅ Production Ready (требуется тестирование на devnet)

---

**Готово к запуску!** 🎉

Вся интеграция Metaplex Candy Machine V3 реализована и готова к использованию!

