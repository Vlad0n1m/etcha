# Быстрый старт для деплоя на Vercel

## Что было изменено

✅ Schema Prisma обновлен с SQLite на PostgreSQL  
✅ Добавлены команды для миграций в package.json  
✅ Создан vercel.json для автоматической настройки сборки  
✅ Обновлен migration_lock.toml для PostgreSQL  

## Следующие шаги

### 1. Создайте удаленную PostgreSQL базу данных

**Рекомендуется: Neon (бесплатный тариф)**
1. Зайдите на https://neon.tech
2. Создайте аккаунт и новый проект
3. Скопируйте Connection String (будет в формате `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

**Альтернатива: Vercel Postgres**
1. В панели Vercel зайдите в Storage
2. Создайте PostgreSQL базу данных
3. Vercel автоматически добавит `DATABASE_URL`

### 2. Настройте локальную разработку (опционально)

Если хотите тестировать локально:

```bash
# Создайте .env.local файл
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/etcha?schema=public"' > .env.local

# Или для Neon:
echo 'DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"' > .env.local

# Создайте миграции
npm run db:migrate

# Запустите seed (опционально)
npm run db:seed
```

### 3. Подготовьте проект к деплою

Убедитесь, что все изменения закоммичены:

```bash
git add .
git commit -m "Configure PostgreSQL for Vercel deployment"
git push
```

### 4. Настройте Vercel

1. Зайдите в ваш проект на Vercel
2. Перейдите в **Settings** > **Environment Variables**
3. Добавьте переменную:
   - **Name**: `DATABASE_URL`
   - **Value**: ваш connection string от Neon/Vercel Postgres
   - Выберите все окружения (Production, Preview, Development)

4. Добавьте другие необходимые переменные (если есть):
   - `SOLANA_RPC_URL`
   - `METAPLEX_RPC_URL`
   - и другие используемые в проекте

### 5. Деплой

Vercel автоматически:
- ✅ Выполнит `prisma generate` во время установки зависимостей
- ✅ Выполнит `prisma migrate deploy` во время сборки
- ✅ Применит все миграции к базе данных

### 6. Проверка

После деплоя проверьте:
- ✅ Логи сборки в Vercel Dashboard (должны показать успешное выполнение миграций)
- ✅ Работа приложения на production URL
- ✅ Подключение к базе данных (можно проверить через Prisma Studio локально с production DATABASE_URL)

## Важные заметки

⚠️ **Старые миграции SQLite**: Существующие миграции созданы для SQLite. При первом деплое на PostgreSQL нужно создать новую начальную миграцию. См. [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

⚠️ **Миграции**: Для продакшена миграции выполняются автоматически через `prisma migrate deploy` в build команде. Для локальной разработки используйте `npm run db:migrate`.

## Проблемы?

См. [DEPLOYMENT.md](./DEPLOYMENT.md) для подробных инструкций и решения проблем.

