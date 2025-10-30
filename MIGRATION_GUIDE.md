# Руководство по миграции с SQLite на PostgreSQL

## ⚠️ Важно

При переходе с SQLite на PostgreSQL нужно создать новые миграции для PostgreSQL. Существующие миграции SQLite не будут работать с PostgreSQL.

## Шаги миграции

### 1. Настройка локальной PostgreSQL базы данных (для разработки)

**Вариант A: Использовать Docker**
```bash
docker run --name etcha-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=etcha -p 5432:5432 -d postgres:15
```

**Вариант B: Использовать Neon для разработки**
- Создайте проект на [Neon](https://neon.tech)
- Скопируйте connection string

### 2. Настройка переменных окружения

Создайте файл `.env.local` (или обновите `.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/etcha?schema=public"
```

Для Neon:
```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

### 3. Создание новой базы данных PostgreSQL

**Вариант A: Удалить старые миграции SQLite и создать новые (рекомендуется для нового проекта)**

```bash
# Удалите папку миграций (если проект новый и нет важных данных)
rm -rf prisma/migrations

# Создайте начальную миграцию для PostgreSQL
npx prisma migrate dev --name init_postgresql
```

**Вариант B: Сохранить историю миграций (для существующего проекта с данными)**

Если у вас уже есть данные в SQLite, которые нужно перенести:

1. Сначала создайте PostgreSQL базу данных и пустую схему:
```bash
npx prisma migrate dev --name init_postgresql --create-only
```

2. Отредактируйте созданную миграцию, добавив SQL для создания всех таблиц (скопируйте из старой миграции, но замените синтаксис SQLite на PostgreSQL)

3. Примените миграцию:
```bash
npx prisma migrate deploy
```

4. Экспортируйте данные из SQLite и импортируйте в PostgreSQL:
```bash
# Экспорт из SQLite (используйте SQLite инструменты)
# Импорт в PostgreSQL (используйте psql или pgAdmin)
```

### 4. Проверка и генерация Prisma Client

```bash
# Генерация Prisma Client
npm run db:generate

# Проверка подключения
npx prisma studio
```

### 5. Запуск seed (если нужно)

```bash
npm run db:seed
```

## Различия между SQLite и PostgreSQL

### Типы данных
- `TEXT` → `TEXT` (остается тем же)
- `REAL` → `DOUBLE PRECISION` (для чисел с плавающей точкой)
- `INTEGER` → `INTEGER` (остается тем же)
- `BOOLEAN` → `BOOLEAN` (остается тем же)
- `DATETIME` → `TIMESTAMP` (изменение формата)

### UNIQUE ограничения
В PostgreSQL нужно создавать явные индексы для UNIQUE полей (Prisma делает это автоматически)

### Автоинкремент
SQLite использует `AUTOINCREMENT`, PostgreSQL использует `SERIAL` или `IDENTITY`

### Триггеры для updatedAt
PostgreSQL требует явных триггеров для автоматического обновления `updatedAt` (Prisma Migrate генерирует их автоматически)

## Для продакшена на Vercel

1. Настройте удаленную PostgreSQL базу данных (Neon, Vercel Postgres, или Supabase)
2. Добавьте `DATABASE_URL` в переменные окружения Vercel
3. Vercel автоматически выполнит `prisma migrate deploy` во время сборки
4. Миграции применятся автоматически

## Проверка

После настройки проверьте:

```bash
# Проверка подключения
npx prisma db pull

# Просмотр схемы
npx prisma studio
```

