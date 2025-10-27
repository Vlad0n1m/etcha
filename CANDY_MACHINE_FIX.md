# Candy Machine Fix - Исправление ошибки "Invalid token standard"

## Проблема
При создании Candy Machine возникала ошибка:
```
Error Code: InvalidTokenStandard. Error Number: 6024. Error Message: Invalid token standard.
```

Это происходило потому, что использовалось неправильное значение для `tokenStandard`.

## Решение
Были внесены следующие изменения в `src/lib/solana/CandyMachineService.ts`:

### 1. **Добавлен импорт TokenStandard**
```typescript
import {
    createNft,
    TokenStandard, // ✅ ДОБАВЛЕНО
} from '@metaplex-foundation/mpl-token-metadata';
```

### 2. **Исправлен параметр `tokenStandard`**
- ❌ Было: `tokenStandard: 1` (неправильное значение)
- ✅ Стало: `tokenStandard: TokenStandard.NonFungible` (правильное enum значение)

### 3. **Обновлена документация**
```typescript
tokenStandard: TokenStandard.NonFungible, // 0 = NonFungible
```

## Правильные значения TokenStandard
Согласно `node_modules/@metaplex-foundation/mpl-token-metadata/dist/src/generated/types/tokenStandard.d.ts`:

```typescript
export declare enum TokenStandard {
    NonFungible = 0,                    // ✅ Для обычных NFT (наши билеты)
    FungibleAsset = 1,                  // Для fungible активов
    Fungible = 2,                       // Для fungible токенов
    NonFungibleEdition = 3,             // Для editions
    ProgrammableNonFungible = 4,         // Для programmable NFT
    ProgrammableNonFungibleEdition = 5   // Для programmable editions
}
```

## Результат
✅ Candy Machine теперь создается успешно с:
- Правильным `TokenStandard.NonFungible = 0` для NFT билетов
- Корректной связью с Collection NFT
- Guard на оплату, направляющим платежи организатору
- Всеми NFT items загруженными в начальной загрузке

## Технические детали
- `TokenStandard.NonFungible` имеет значение `0` в Metaplex
- Это соответствует стандарту для обычных невзаимозаменяемых токенов (NFT)
- Правильное использование enum вместо магических чисел улучшает читаемость кода
