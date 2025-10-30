# Candy Machine Implementation Comparison

## 📊 Текущий проект (etcha) vs etcha-candy репозиторий

### 🔍 Используемые версии библиотек

#### Текущий проект (etcha):

```json
{
  "@metaplex-foundation/mpl-candy-machine": "^6.1.0",
  "@metaplex-foundation/umi": "^1.4.1",
  "@metaplex-foundation/umi-bundle-defaults": "^1.4.1",
  "@metaplex-foundation/umi-signer-wallet-adapters": "^1.4.1",
  "@metaplex-foundation/umi-uploader-irys": "^1.4.1",
  "@metaplex-foundation/mpl-token-metadata": "^3.4.0",
  "@metaplex-foundation/mpl-auction-house": "^2.5.1",
  "@metaplex-foundation/js": "^0.20.1"  // Используется в некоторых компонентах (page.tsx)
}
```

#### Репозиторий etcha-candy:

На основе анализа из веб-поиска и документации:
- Использует **Candy Machine V3**
- Создает **Collection NFT** и **Candy Machine**
- Точные версии библиотек требуют проверки `package.json` в репозитории

---

## 🏗️ Архитектурные различия

### Текущий проект (etcha) - UMI Framework

**Подход:**
- ✅ Использует **UMI Framework** (`@metaplex-foundation/umi`) - современный подход
- ✅ Использует `mpl-candy-machine` v6.1.0 (нативные программы Metaplex)
- ✅ Модульная архитектура с сервисами:
  - `CandyMachineService.ts` - создание CM через UMI
  - `candy-machine-client.ts` - клиентская логика минта
- ✅ Разделение Candy Machine и Candy Guard (правильная V3 архитектура)

**Преимущества:**
- Более низкоуровневая работа с программами Solana
- Лучшая типизация через UMI
- Поддержка последних версий Candy Machine V3
- Более гибкое управление транзакциями

**Код из `CandyMachineService.ts`:**
```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
    create as createCandyMachine,
    createCandyGuard,
    wrap,
    mintV2,
    fetchCandyMachine,
    fetchCandyGuard,
    mplCandyMachine,
} from '@metaplex-foundation/mpl-candy-machine'
```

### Репозиторий etcha-candy - вероятно старый SDK

**Подход (из веб-информации):**
- Возможно использует `@metaplex-foundation/js` SDK (более высокоуровневый)
- Может быть более старая версия Candy Machine
- API для создания коллекций через `/api/collections`

**Потенциальные недостатки:**
- Менее гибкий API
- Возможно устаревшие версии
- Меньше контроля над транзакциями

---

## 🔧 Функциональные различия

### Создание Candy Machine

#### Текущий проект (etcha):
```typescript
// 1. Создание Candy Machine (без guards)
const createTx = await createCandyMachine(umi, {
    candyMachine,
    collectionMint: umiPublicKey(params.collectionAddress),
    itemsAvailable: BigInt(params.itemsAvailable),
    // ... другие параметры
})

// 2. Создание Candy Guard (отдельно)
const guardTx = await createCandyGuard(umi, {
    base: candyMachine,
    guards: {
        solPayment: some({
            lamports: sol(params.priceInSol),
            destination: umiPublicKey(params.platformWallet),
        }),
    },
})

// 3. Wrapping Candy Machine с Guard
const wrapTx = await wrap(umi, {
    candyMachine: candyMachine.publicKey,
    candyGuard: candyGuardPda,
})
```

**Характеристики:**
- ✅ Правильное разделение CM и Guard (V3 архитектура)
- ✅ Три отдельных транзакции (create → guard → wrap)
- ✅ Поддержка guards (solPayment, botTax, startDate и т.д.)
- ✅ Правильная работа с mintAuthority

#### Репозиторий etcha-candy:
- Создание через `/api/collections` endpoint
- Верификация через Solana Explorer
- Создание Collection NFT и Candy Machine одновременно

---

### Минт NFT

#### Текущий проект (etcha):
```typescript
// Через UMI с wallet adapter
const mintTx = mintV2(umi, {
    candyMachine: candyMachine.publicKey,
    nftMint,
    collectionMint: candyMachine.collectionMint,
    collectionUpdateAuthority: candyMachine.authority,
    candyGuard: candyMachine.mintAuthority,  // Важно!
    mintArgs: {
        solPayment: { destination },
    },
})
```

**Характеристики:**
- ✅ Минт через Candy Guard с правильными mintArgs
- ✅ Поддержка wallet adapter для браузерных кошельков
- ✅ Последовательный минт нескольких NFT

---

## 📦 Версии пакетов - детальное сравнение

### Metaplex Foundation пакеты

| Пакет | Текущий проект | etcha-candy (предположительно) |
|-------|---------------|-------------------------------|
| `@metaplex-foundation/mpl-candy-machine` | **^6.1.0** | Требует проверки |
| `@metaplex-foundation/umi` | **^1.4.1** | Возможно не используется |
| `@metaplex-foundation/js` | **^0.20.1** (частично) | Возможно основной SDK |
| `@metaplex-foundation/mpl-token-metadata` | **^3.4.0** | Требует проверки |

### Важные различия:

1. **UMI Framework vs JS SDK:**
   - **etcha (текущий)**: Использует UMI - более современный, низкоуровневый подход
   - **etcha-candy**: Возможно использует JS SDK - более высокоуровневый, но может быть устаревшим

2. **Candy Machine версия:**
   - Оба используют **Candy Machine V3** (судя по архитектуре разделения CM/Guard)
   - Но версии пакетов могут отличаться

---

## ✅ Рекомендации

### Если нужно синхронизировать с etcha-candy:

1. **Проверить версии в репозитории etcha-candy:**
   ```bash
   # Клонировать репозиторий и проверить package.json
   ```

2. **Если etcha-candy использует старые версии:**
   - Текущий проект (etcha) использует более современные версии
   - **Рекомендуется остаться на текущих версиях** для лучшей поддержки

3. **Если версии совпадают:**
   - Можно продолжать разработку на текущем стеке

### Важные моменты:

- ✅ **Текущий проект использует правильную V3 архитектуру** (CM + Guard раздельно)
- ✅ **UMI Framework** - рекомендуемый подход от Metaplex
- ⚠️ **@metaplex-foundation/js** используется в `page.tsx` - рассмотреть удаление или миграцию на UMI

---

## 🔍 Что проверить в etcha-candy:

1. Файл `package.json` - точные версии зависимостей
2. Используется ли UMI или JS SDK
3. Версия Candy Machine (V2 или V3)
4. Подход к созданию guards
5. Подход к минту NFT

---

## 📝 Выводы

### Текущий проект (etcha) - ✅ Современный подход:
- Использует **UMI Framework** (рекомендуемый Metaplex)
- Версии библиотек актуальные (mpl-candy-machine v6.1.0)
- Правильная V3 архитектура (CM + Guard раздельно)
- Хорошая типизация и модульность

### Возможные улучшения:
- Убрать `@metaplex-foundation/js` из `page.tsx` (используется неактуальный подход)
- Проверить совместимость версий UMI пакетов
- Убедиться, что все используют одну версию UMI (1.4.1)

---

## 🚨 Потенциальные проблемы

### Если etcha-candy использует другую версию:

1. **Несовместимость транзакций** - Candy Machines, созданные в разных версиях, могут работать по-разному
2. **Разные форматы guards** - структура guards может отличаться
3. **Разные API** - UMI vs JS SDK имеют разные интерфейсы

### Решение:
- Использовать одну версию библиотек в обоих проектах
- Или четко разделить: один проект для одного типа Candy Machines

---

## 📚 Ссылки

- [Metaplex Candy Machine V3 Docs](https://developers.metaplex.com/candy-machine)
- [UMI Framework Docs](https://github.com/metaplex-foundation/umi)
- [mpl-candy-machine GitHub](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/candy-machine)

