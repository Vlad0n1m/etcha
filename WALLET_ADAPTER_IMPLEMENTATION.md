# Wallet Adapter NFT Mint Implementation

## ✅ COMPLETED

Реализован безопасный флоу минта NFT билетов с использованием Solana Wallet Adapter.

## Изменения

### 1. `src/lib/solana/CandyMachineService.ts`

**Реализован метод `prepareMintTransaction()`:**
- Использует Umi SDK для создания mint транзакций
- Платформа подписывает как `collectionUpdateAuthority`
- Пользователь указывается как fee payer (платит за транзакцию + цену билета)
- Возвращает частично подписанную транзакцию в base64

**Основные компоненты:**
```typescript
// 1. Валидация (только одиночные минты)
if (quantity !== 1) {
    throw new Error('Currently only single ticket mints are supported');
}

// 2. Создание NFT mint адреса
const nftMint = generateSigner(umi);

// 3. Создание mint инструкции
const mintIx = mintV2(umi, {
    candyMachine: candyMachinePubkey,
    nftMint,
    collectionMint: publicKey(collection.collectionNftAddress!),
    collectionUpdateAuthority: umi.identity.publicKey, // Платформа
    mintArgs: {
        solPayment: {
            destination: publicKey(collection.eventCreatorWallet), // Организатор
        }
    }
});

// 4. Частичная подпись платформой
const signedTx = await builder.buildAndSign(umi);
```

### 2. `src/app/api/events/[id]/prepare-purchase/route.ts`

**Добавлена валидация:**
- Проверка корректности wallet адреса (минимум 32 символа)
- Ограничение на одиночные покупки (quantity = 1)

### 3. Очистка от test wallets

**Удалено:**
- `data/test-wallets.json` - файл удален
- `TestWallet` интерфейс из `src/lib/solana/types.ts`

## Флоу покупки билета

### 1. Пользователь на фронтенде
```typescript
// Frontend: event/[id]/page.tsx
1. Пользователь подключает кошелек (Phantom/Solflare/Torus)
2. Выбирает количество билетов (пока только 1)
3. Нажимает "Buy"
```

### 2. Подготовка транзакции
```typescript
// Backend: prepare-purchase/route.ts
1. Валидация события и наличия билетов
2. Валидация wallet адреса
3. Вызов candyMachineService.prepareMintTransaction()
4. Возврат base64 транзакции на фронтенд
```

### 3. Подпись пользователем
```typescript
// Frontend: event/[id]/page.tsx
1. Десериализация VersionedTransaction
2. Wallet добавляет подпись пользователя
3. sendTransaction() отправляет в блокчейн
4. Ожидание подтверждения
```

### 4. Подтверждение
```typescript
// Backend: confirm-purchase/route.ts
1. Проверка транзакции на блокчейне
2. Извлечение NFT mint адресов
3. Создание Order и Tickets в БД
4. Обновление счетчика билетов
```

## Безопасность ✅

- ✅ Приватные ключи пользователей не хранятся на сервере
- ✅ Пользователи контролируют свои ключи
- ✅ Транзакции подписываются в кошельке пользователя
- ✅ Платформа подписывает только collection authority
- ✅ Оплата идет напрямую организатору события

## Оплата

**Кто платит:**
- Пользователь платит:
  - Цену билета (SOL) → организатору
  - Gas fees (~0.01 SOL) → валидаторам

**Кто получает:**
- Организатор получает 100% от цены билета
- Платформа получает 2.5% роялти при перепродаже (через Candy Machine config)

## Тестирование

### Предварительные требования:
1. Devnet SOL на кошельке организатора (для создания события)
2. Devnet SOL на кошельке покупателя (цена билета + ~0.01 SOL fees)

### Шаги тестирования:

#### 1. Создание события (уже работает)
```bash
1. Подключить кошелек организатора
2. Создать событие с ценой (например, 0.1 SOL)
3. Дождаться создания Collection NFT и Candy Machine
4. Проверить в консоли адреса Collection и Candy Machine
```

#### 2. Покупка билета (новый функционал)
```bash
1. Отключить кошелек организатора
2. Подключить кошелек покупателя (другой адрес)
3. Убедиться что баланс > (цена билета + 0.01 SOL)
4. Открыть страницу события
5. Нажать "Buy" (quantity = 1)
6. Подтвердить транзакцию в кошельке
7. Дождаться подтверждения
8. Проверить:
   - NFT появился в кошельке покупателя
   - SOL переведены организатору
   - Билет записан в БД
   - Счетчик билетов уменьшился
```

#### 3. Проверка на блокчейне
```bash
1. Открыть Solana Explorer (devnet)
2. Найти транзакцию по signature
3. Проверить:
   - NFT mint создан
   - NFT принадлежит Collection
   - Metadata URI корректен
   - Оплата прошла организатору
```

### Проверка ошибок:

#### Недостаточно SOL:
```
Ожидание: "Insufficient SOL balance for purchase"
```

#### Отмена в кошельке:
```
Ожидание: "Transaction cancelled by user"
```

#### Попытка купить > 1 билета:
```
Ожидание: "Only single ticket purchases are supported at this time"
```

## Известные ограничения

1. **Одиночные минты:** Пока поддерживается только quantity = 1
2. **Devnet только:** Проект настроен на devnet
3. **Без retry логики:** При ошибке нужно повторять вручную

## Следующие шаги (опционально)

1. ✨ Поддержка множественных минтов (quantity > 1)
2. ✨ Симуляция транзакции перед подписью
3. ✨ Retry логика для failed транзакций
4. ✨ UI индикатор статуса транзакции
5. ✨ Поддержка бесплатных билетов (price = 0)

## Логи для отладки

При подготовке транзакции выводятся:
```
🎫 Preparing mint transaction...
🎫 Preparing mint for: { collectionId, userWallet, candyMachine, ticketPrice, organizer }
🔍 Candy Guard fetched: Yes/No
✅ Transaction prepared: { nftMint, size, platformSigned }
```

При ошибках:
```
❌ Error preparing mint transaction: [details]
```

## Используемые SDK

- **Старый SDK** (`@metaplex-foundation/js ^0.20.1`):
  - Создание Collection NFT
  - Создание Candy Machine
  - Добавление items

- **Новый SDK** (Umi + `mpl-candy-machine ^6.1.0`):
  - Mint транзакции
  - Частичная подпись
  - VersionedTransaction support

## Поддержка кошельков

✅ Поддерживаются:
- Phantom
- Solflare  
- Torus

Конфигурация в: `src/components/WalletProvider.tsx`

