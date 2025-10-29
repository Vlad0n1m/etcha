# SQLite Setup - Инструкция по настройке

## ✅ Что было сделано:

1. **Обновлена схема Prisma** для SQLite:
   - Изменен тип поля `schedule` с `String[]` на `String` (SQLite не поддерживает массивы)
   - Провайдер уже был установлен на `sqlite`

2. **Созданы файлы конфигурации**:
   - `.env` - файл с переменными окружения
   - `.env.example` - пример конфигурации
   - `.gitignore` - обновлен для игнорирования базы данных SQLite

3. **Создана база данных**:
   - Удалены старые миграции PostgreSQL
   - Создана новая база данных SQLite: `prisma/dev.db`
   - Выполнен seed - добавлены начальные категории

## 🔧 Как перезапустить приложение:

### Шаг 1: Остановите текущий dev сервер
Нажмите `Ctrl+C` в терминале, где запущен `npm run dev`

### Шаг 2: Перезапустите dev сервер
```bash
npm run dev
```

### Шаг 3: Очистите кэш браузера
Откройте страницу заново или используйте `Ctrl+Shift+R` (или `Cmd+Shift+R` на Mac)

## 📝 Важные изменения в коде:

### Поле schedule теперь строка, а не массив
**Было:**
```typescript
schedule: string[]
```

**Стало:**
```typescript
schedule: string // JSON string
```

### При работе с schedule в коде нужно использовать JSON.parse/JSON.stringify:

**Сохранение:**
```typescript
const scheduleItems = ["10:00 - Registration", "11:00 - Main Event"];
await prisma.event.create({
  data: {
    // ... другие поля
    schedule: JSON.stringify(scheduleItems)
  }
});
```

**Чтение:**
```typescript
const event = await prisma.event.findUnique({ where: { id } });
const scheduleArray = JSON.parse(event.schedule);
```

## 🗂️ Структура базы данных:

```
/Users/l0xa1/Desktop/etcha/
├── .env                    # Переменные окружения
├── prisma/
│   ├── dev.db             # База данных SQLite
│   ├── dev.db-journal     # Журнал транзакций
│   ├── schema.prisma      # Схема базы данных
│   ├── seed.ts            # Скрипт заполнения
│   └── migrations/        # Миграции базы данных
```

## 🔑 Переменные окружения (.env):

```env
# Database
DATABASE_URL="file:./dev.db"

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT="https://api.devnet.solana.com"

# Platform Wallet
PLATFORM_WALLET_ADDRESS="YOUR_PLATFORM_WALLET_ADDRESS"

# Irys/Arweave Upload
IRYS_PRIVATE_KEY=""
```

## 🛠️ Полезные команды:

```bash
# Регенерация Prisma Client
npm run db:generate

# Применение изменений схемы к базе
npm run db:push

# Создание новой миграции
npx prisma migrate dev --name migration_name

# Заполнение базы начальными данными
npm run db:seed

# Просмотр базы данных в браузере
npx prisma studio
```

## ⚠️ Что нужно обновить в коде:

1. **Файлы, работающие с полем schedule**:
   - `src/app/organizer/create-event/page.tsx`
   - `src/app/event/[id]/page.tsx`
   - Любые другие места, где используется `event.schedule`

2. **Пример обновления компонента**:

```typescript
// Было:
<div>
  {event.schedule.map((item, index) => (
    <div key={index}>{item}</div>
  ))}
</div>

// Стало:
<div>
  {JSON.parse(event.schedule).map((item, index) => (
    <div key={index}>{item}</div>
  ))}
</div>
```

## 🎯 Проверка работы:

После перезапуска сервера:
1. Откройте http://localhost:3000
2. Проверьте, что страница загружается без ошибок
3. Попробуйте создать новое событие
4. Проверьте, что событие сохраняется в базу данных

## 📊 Просмотр данных:

Запустите Prisma Studio для визуального просмотра базы данных:
```bash
npx prisma studio
```

Откроется браузер с интерфейсом для работы с данными.

## ❓ Решение проблем:

### Ошибка: "the URL must start with the protocol `file:`"
**Решение:** Убедитесь, что в `.env` файле `DATABASE_URL="file:./dev.db"` и перезапустите сервер.

### Ошибка: "Can't reach database server"
**Решение:** 
```bash
npx prisma generate
npx prisma db push
npm run dev
```

### База данных не создается
**Решение:**
```bash
rm -f prisma/dev.db prisma/dev.db-journal
npx prisma migrate dev --name init
npm run db:seed
```

---

## ✨ Готово!

Ваше приложение теперь использует SQLite вместо PostgreSQL. 
Просто перезапустите dev сервер и все будет работать!

