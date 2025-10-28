# Candy Machine V3 Integration - Implementation Guide

## 🎉 Что было реализовано

Полная интеграция **Metaplex Candy Machine V3** для создания и продажи NFT билетов на ивенты с автоматическим распределением платежей 97.5% / 2.5%.

### ✅ Выполненные компоненты

#### 1. Backend Services & Utilities

**Утилиты:**
- ✅ `src/lib/utils/wallet.ts` - Работа с Solana кошельками
  - Загрузка platform wallet и authority keypair
  - Валидация адресов
  - Конвертация SOL ↔ lamports
  
- ✅ `src/lib/utils/nft-metadata.ts` - Формирование метаданных NFT
  - Генерация метаданных билетов с attributes:
    - Event Date, Event Time, Location
    - Organizer Name, Organizer Avatar
    - Category, Ticket Number, Ticket Type

**Сервисы:**
- ✅ `src/lib/services/MetadataUploadService.ts` - Загрузка на Arweave
  - Загрузка изображений через Irys
  - Загрузка JSON метаданных
  - Батч-загрузка для больших коллекций

- ✅ `src/lib/services/CandyMachineService.ts` - Candy Machine V3
  - Создание NFT коллекций
  - Создание Candy Machine с guards
  - Минт NFT билетов
  - Распределение платежей (97.5% / 2.5%)
  - Получение данных Candy Machine

- ✅ `src/lib/services/AuctionHouseService.ts` - Auction House (заглушка)
  - Подготовлена структура для будущего ресейла

#### 2. API Routes

- ✅ `POST /api/collections/create` - Создание коллекции
  - Загрузка метаданных на Arweave
  - Создание NFT коллекции
  - Создание Candy Machine V3 с guards
  - Обновление Event в БД

- ✅ `POST /api/mint` - Минт NFT билетов
  - Проверка доступности билетов
  - Минт NFT через Candy Machine
  - Автоматическое распределение платежей
  - Создание Order, Ticket, PaymentDistribution в БД

- ✅ `GET /api/candy-machine/[address]` - Данные Candy Machine
  - Информация о доступности
  - Цена в SOL
  - Guards конфигурация

- ✅ `GET /api/collections/[eventId]` - Данные коллекции
  - Метаданные
  - Статистика продаж
  - Расчет revenue

#### 3. Database (Prisma)

- ✅ Обновленная schema с моделью `PaymentDistribution`:
  ```prisma
  model PaymentDistribution {
    id              String   @id @default(cuid())
    orderId         String   @unique
    totalAmount     Float    // Total в SOL
    organizerShare  Float    // 97.5%
    platformShare   Float    // 2.5%
    organizerWallet String
    platformWallet  String
    transactionHash String
    status          String   @default("completed")
    createdAt       DateTime @default(now())
  }
  ```

#### 4. Frontend Components

**UI Components:**
- ✅ `CollectionStatus.tsx` - Виджет статуса коллекции
  - Прогресс-бар продаж
  - Цена билета
  - Количество доступных/проданных

- ✅ `MintProgress.tsx` - Индикатор прогресса минта
  - Статусы: preparing, uploading, minting, confirming, complete, error
  - Прогресс-бар с шагами

- ✅ `MintResultModal.tsx` - Модалка результата минта
  - Список заминченных NFT с адресами
  - Transaction signature с ссылкой на Explorer
  - Payment breakdown (97.5% / 2.5%)
  - Кнопки "View My Tickets" и "Close"

**Pages:**
- ✅ `src/app/event/[id]/page.tsx` - Обновленная страница ивента
  - Интеграция минта NFT
  - Отображение CollectionStatus
  - MintProgress и MintResultModal

- ✅ `src/app/organizer/create-collection/page.tsx` - Создание коллекции
  - Форма с автозаполнением из Event
  - Загрузка изображения
  - Поля: name, symbol, description, total supply, price
  - Калькулятор revenue split (97.5% / 2.5%)

#### 5. Dependencies

Установленные пакеты:
```json
{
  "@metaplex-foundation/mpl-candy-machine": "latest",
  "@metaplex-foundation/umi": "^1.4.1",
  "@metaplex-foundation/umi-bundle-defaults": "latest",
  "@metaplex-foundation/mpl-token-metadata": "latest",
  "@metaplex-foundation/mpl-auction-house": "latest",
  "@metaplex-foundation/umi-uploader-irys": "latest",
  "bs58": "latest"
}
```

---

## 🔧 Настройка Environment Variables

Создайте `.env.local` со следующими переменными:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/etcha"

# Solana Network
SOLANA_NETWORK="devnet"
SOLANA_RPC_URL="https://api.devnet.solana.com"

# Platform Wallet (получает 100%, потом распределяет)
PLATFORM_WALLET_PRIVATE_KEY="[1,2,3,...]"  # JSON array или base58
PLATFORM_WALLET_PUBLIC_KEY="YourPublicKeyHere"

# Candy Machine Authority
CANDY_MACHINE_AUTHORITY_PRIVATE_KEY="[1,2,3,...]"

# Metadata Upload (Arweave via Irys)
IRYS_PRIVATE_KEY="[1,2,3,...]"
IRYS_NETWORK="devnet"

# Platform Config
PLATFORM_FEE_PERCENTAGE="2.5"
ORGANIZER_SHARE_PERCENTAGE="97.5"

# Next.js Public
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
```

### Генерация Keypair

```bash
# Установить Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Создать новый keypair
solana-keygen new --outfile platform-keypair.json

# Получить массив чисел для .env
cat platform-keypair.json
```

---

## 📊 Flow диаграммы

### 1. Создание Коллекции (Организатор)

```
Организатор → Форма создания коллекции
    ↓
Выбор ивента + заполнение метаданных
    ↓
POST /api/collections/create
    ↓
1. Загрузка изображения на Arweave
2. Создание метаданных для всех билетов
3. Загрузка метаданных на Arweave
4. Создание NFT Collection
5. Создание Candy Machine V3 с guards
6. Обновление Event в БД
    ↓
Redirect → /organizer/collection/[address]
```

### 2. Покупка Билета (Пользователь)

```
Пользователь → Страница ивента
    ↓
Подключение кошелька + выбор количества
    ↓
POST /api/mint
    ↓
1. Проверка доступности билетов
2. Минт NFT через Candy Machine
   ├─ Оплата 100% на platform wallet (guard: solPayment)
   └─ Требуется подпись platform (guard: thirdPartySigner)
3. Распределение платежей:
   ├─ 97.5% → организатору
   └─ 2.5% → платформе
4. Создание записей в БД:
   ├─ Order
   ├─ Ticket (для каждого NFT)
   └─ PaymentDistribution
    ↓
Показать MintResultModal
```

### 3. Метаданные NFT Билета

```json
{
  "name": "Event Name - Ticket #1",
  "symbol": "TICKET",
  "description": "Event description...",
  "image": "https://arweave.net/...",
  "attributes": [
    { "trait_type": "Event Date", "value": "2024-03-15" },
    { "trait_type": "Event Time", "value": "19:00" },
    { "trait_type": "Location", "value": "Barcelona, Catalunya" },
    { "trait_type": "Category", "value": "Blockchain" },
    { "trait_type": "Organizer Name", "value": "Arcium Team" },
    { "trait_type": "Organizer Avatar", "value": "https://..." },
    { "trait_type": "Ticket Number", "value": "1" },
    { "trait_type": "Ticket Type", "value": "NFT Event Ticket" }
  ],
  "properties": {
    "category": "event-ticket",
    "creators": [
      { "address": "<organizer_wallet>", "share": 100 }
    ]
  }
}
```

---

## 🚀 Deployment Checklist

### Pre-Production

- [ ] Получить и настроить production RPC endpoint (Helius/QuickNode)
- [ ] Сгенерировать production keypairs
- [ ] Пополнить platform wallet SOL
- [ ] Пополнить Irys wallet для загрузки метаданных
- [ ] Настроить PostgreSQL БД
- [ ] Запустить Prisma миграции

### Production

- [ ] Переключить `SOLANA_NETWORK` на `mainnet-beta`
- [ ] Обновить все RPC URLs на mainnet
- [ ] Настроить мониторинг транзакций
- [ ] Настроить алерты на failed operations
- [ ] Добавить rate limiting на API
- [ ] Настроить CORS

### Security

- [ ] Private keys в безопасном хранилище (AWS Secrets / Vault)
- [ ] Никогда не коммитить .env файлы
- [ ] Валидация всех inputs
- [ ] Rate limiting для API endpoints

---

## 🔮 Roadmap (Следующие этапы)

### Phase 2: Реальная интеграция Candy Machine V3

**Текущий статус:** В коде используются моки (mock data) для Candy Machine операций.

**Что нужно сделать:**
1. Изучить актуальный API Metaplex Candy Machine V3
2. Правильно реализовать:
   - `createCollection()` с UMI
   - `createCandyMachineV3()` с правильными guards
   - `mintV2()` с корректными параметрами
   - `fetchCandyMachine()` для получения данных
3. Протестировать на devnet
4. Обработка edge cases и ошибок

### Phase 3: Auction House для Ресейла

1. Инициализация Auction House для платформы
2. API endpoints для листинга NFT
3. UI для создания листингов
4. UI для покупки с ресейла
5. Обновление БД (Listing модель)

### Phase 4: Advanced Features

- QR коды для билетов
- Проверка билетов на входе
- Push уведомления
- Email уведомления
- Аналитика для организаторов

---

## 📝 Известные ограничения

1. **Mock Implementation**: CandyMachineService использует моки вместо реальных Metaplex операций
2. **No Migration**: Prisma schema находится в `generated/` - требуется правильная миграция
3. **No Tests**: Нет unit/integration тестов
4. **Error Handling**: Базовая обработка ошибок, нужно улучшить
5. **No Validation**: Минимальная валидация форм

---

## 🆘 Troubleshooting

### Ошибка: "PLATFORM_WALLET_PRIVATE_KEY not set"
**Решение:** Добавьте private key в `.env.local`

### Ошибка: "Failed to upload to Arweave"
**Решение:** 
- Проверьте IRYS_PRIVATE_KEY
- Убедитесь что у Irys wallet есть баланс
- Проверьте размер файла (макс 5MB для изображений)

### Ошибка: "Insufficient SOL"
**Решение:** Пополните platform wallet SOL для оплаты транзакций

### PaymentDistribution model not found
**Решение:** Запустите `npx prisma generate --schema=./src/generated/prisma/schema.prisma`

---

## 📚 Полезные ссылки

- [Metaplex Candy Machine Docs](https://developers.metaplex.com/candy-machine)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Irys (Arweave) Docs](https://docs.irys.xyz/)
- [Prisma Docs](https://www.prisma.io/docs)

---

## 👥 Контакты и Support

Если возникнут вопросы по реализации:
1. Проверьте логи в консоли браузера и server logs
2. Проверьте Solana Explorer для транзакций
3. Проверьте баланс кошельков

---

**Дата создания:** 2025-01-28
**Версия:** 1.0
**Статус:** ✅ Базовая реализация завершена (с моками)

