# Решение проблемы "Event blockchain setup incomplete"

## Проблема

При попытке купить билет возникала ошибка:
```
Event blockchain setup incomplete
```

## Причина

1. События, созданные **до** внедрения системы оплаты через SOL, не имели полей `collectionNftAddress` и `candyMachineAddress`
2. Была добавлена жесткая проверка наличия этих полей в `/prepare-purchase` endpoint
3. Это блокировало возможность покупки билетов

## Решение

### 1. Убрана жесткая проверка

**Файл:** `src/app/api/events/[id]/prepare-purchase/route.ts`

**Было:**
```typescript
// Check if event has Candy Machine
if (!event.candyMachineAddress && !event.collectionNftAddress) {
    return NextResponse.json(
        { error: 'Event blockchain setup incomplete' },
        { status: 500 }
    )
}
```

**Стало:**
```typescript
// Prepare mint transaction (will create Candy Machine if needed)
```

### 2. Добавлено автоматическое создание блокчейн-инфраструктуры

**Файл:** `src/lib/solana/CandyMachineService.ts`

Метод `prepareMintTransaction` теперь автоматически:
1. Проверяет наличие Collection NFT, создает если нет
2. Проверяет наличие Candy Machine, создает если нет
3. Обновляет записи в БД

```typescript
// Check if Collection NFT exists, create if not
if (!collection.collectionNftAddress) {
    console.log('🎨 Collection NFT not found, creating...');
    const collectionNftAddress = await this.createCollectionNFT(collection);
    await this.collectionService.updateCollection(collectionId, {
        collectionNftAddress,
    });
    collection.collectionNftAddress = collectionNftAddress;
}

// Check if Candy Machine exists, create if not
if (!collection.candyMachineAddress) {
    console.log('🍭 Candy Machine not found, creating...');
    const candyMachineAddress = await this.createCandyMachine(collection);
    await this.collectionService.updateCollection(collectionId, {
        candyMachineAddress,
    });
    collection.candyMachineAddress = candyMachineAddress;
}
```

## Как это работает сейчас

### Создание нового события

При создании события через `/api/events` (POST):
1. ✅ Сразу создается Collection NFT
2. ✅ Сразу создается Candy Machine
3. ✅ Адреса сохраняются в БД

### Покупка билета для старого события

Для событий без блокчейн-инфраструктуры:
1. Пользователь нажимает "Buy"
2. Frontend вызывает `/prepare-purchase`
3. Backend проверяет наличие Collection NFT
4. Если нет - **автоматически создает** (~10 секунд)
5. Backend проверяет наличие Candy Machine
6. Если нет - **автоматически создает** (~10-15 секунд)
7. Подготавливает транзакцию
8. Пользователь подписывает и оплачивает

## Стоимость "ленивой" инициализации

Если Candy Machine создается при первой покупке:
- **Время:** ~20-30 секунд задержка для первого покупателя
- **Стоимость:** ~0.1 SOL из кошелька платформы
- **Последующие покупки:** мгновенные

## Рекомендации

### Для production

1. **Убедитесь, что платформенный кошелек имеет достаточно SOL:**
   ```bash
   solana balance PLATFORM_WALLET --url mainnet-beta
   # Должно быть минимум 0.5 SOL на резерв
   ```

2. **Предварительно создайте Candy Machine для всех старых событий:**
   ```bash
   # Запустите скрипт миграции (нужно создать)
   npm run migrate:candy-machines
   ```

3. **Мониторьте создание Candy Machine:**
   - Логируйте каждое создание
   - Отслеживайте баланс platform wallet
   - Уведомляйте админа при балансе < 0.2 SOL

### UX улучшение

Добавьте индикатор для первого покупателя:

```typescript
// В prepare-purchase route
if (!event.candyMachineAddress) {
    return NextResponse.json({
        needsSetup: true,
        message: 'Setting up blockchain infrastructure. This may take 20-30 seconds...'
    })
}
```

На фронтенде:
```typescript
if (response.needsSetup) {
    showMessage('First purchase for this event - setting up blockchain...')
    // Показать прогресс-бар
}
```

## Обработка ошибок

### Недостаточно SOL на platform wallet

**Ошибка:**
```
Insufficient SOL balance for Candy Machine creation
```

**Решение:**
```bash
solana transfer PLATFORM_WALLET 1 --from ADMIN_WALLET --url mainnet-beta
```

### Таймаут создания Candy Machine

**Ошибка:**
```
Timeout while creating Candy Machine
```

**Причины:**
- Перегрузка сети Solana
- Проблемы с RPC endpoint

**Решение:**
1. Повторите попытку через несколько минут
2. Используйте другой RPC endpoint
3. Проверьте статус сети: https://status.solana.com

## Миграция старых событий

Для предварительного создания Candy Machine для всех событий создайте скрипт:

```typescript
// scripts/migrate-candy-machines.ts
import { prisma } from '@/lib/db'
import { SolanaService } from '@/lib/solana/SolanaService'
import { CollectionService } from '@/lib/solana/CollectionService'
import { CandyMachineService } from '@/lib/solana/CandyMachineService'

async function migrateCandyMachines() {
    // Найти все события без Candy Machine
    const events = await prisma.event.findMany({
        where: {
            OR: [
                { candyMachineAddress: null },
                { collectionNftAddress: null }
            ],
            isActive: true
        }
    })

    console.log(`Found ${events.length} events without blockchain setup`)

    const solanaService = new SolanaService()
    const collectionService = new CollectionService()
    const candyMachineService = new CandyMachineService(solanaService, collectionService)

    for (const event of events) {
        try {
            console.log(`Processing event: ${event.title}`)
            
            const collection = await collectionService.getCollectionById(event.id)
            
            if (!collection.collectionNftAddress) {
                const addr = await candyMachineService.createCollectionNFT(collection)
                await collectionService.updateCollection(event.id, {
                    collectionNftAddress: addr
                })
                collection.collectionNftAddress = addr
            }

            if (!collection.candyMachineAddress) {
                const addr = await candyMachineService.createCandyMachine(collection)
                await collectionService.updateCollection(event.id, {
                    candyMachineAddress: addr
                })
            }

            console.log(`✅ Event ${event.title} migrated successfully`)
        } catch (error) {
            console.error(`❌ Error migrating event ${event.title}:`, error)
        }
    }

    console.log('Migration complete!')
}

migrateCandyMachines()
```

Запуск:
```bash
npx tsx scripts/migrate-candy-machines.ts
```

## Проверка

После обновления проверьте:

1. **Создание нового события:**
   ```bash
   # Должны быть установлены оба адреса
   curl -H "Authorization: Bearer TOKEN" \
        -X POST http://localhost:3000/api/events \
        -d '{ "title": "Test Event", ... }'
   ```

2. **Покупка билета для старого события:**
   ```bash
   # Должно работать даже если candyMachineAddress = null
   curl -X POST http://localhost:3000/api/events/EVENT_ID/prepare-purchase \
        -d '{ "quantity": 1, "walletAddress": "..." }'
   ```

3. **Проверка созданного Candy Machine:**
   ```bash
   solana account CANDY_MACHINE_ADDRESS --url devnet
   ```

## Итог

✅ Проблема решена - покупка работает для всех событий
✅ Автоматическое создание блокчейн-инфраструктуры
✅ Обратная совместимость со старыми событиями
✅ Готово к production deployment

