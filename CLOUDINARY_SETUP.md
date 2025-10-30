# Cloudinary Setup Instructions

## Проблема
На Vercel файловая система доступна только для чтения (read-only), поэтому нельзя сохранять загружаемые изображения локально. Вместо этого используем **Cloudinary** для хранения изображений в облаке.

## Решение
Код обновлен для использования Cloudinary API. Теперь все изображения загружаются в облако и доступны через CDN.

## Настройка Cloudinary

### Шаг 1: Создайте бесплатный аккаунт на Cloudinary
1. Перейдите на https://cloudinary.com/users/register_free
2. Зарегистрируйтесь (бесплатный тир: 25GB storage, 25GB bandwidth/месяц)
3. После регистрации перейдите в Dashboard

### Шаг 2: Получите API ключи
В Dashboard вы увидите:
- **Cloud Name** (например: `dxxxxxxxxx`)
- **API Key** (например: `123456789012345`)
- **API Secret** (нажмите "Reveal" чтобы увидеть)

### Шаг 3: Добавьте переменные окружения

#### Локальная разработка (.env или .env.local)
Добавьте следующие строки в ваш `.env` файл:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=ваш_cloud_name
CLOUDINARY_API_KEY=ваш_api_key
CLOUDINARY_API_SECRET=ваш_api_secret
```

#### Production (Vercel)
1. Откройте ваш проект на https://vercel.com
2. Перейдите в Settings → Environment Variables
3. Добавьте три переменные:
   - **Name:** `CLOUDINARY_CLOUD_NAME` → **Value:** ваш cloud name
   - **Name:** `CLOUDINARY_API_KEY` → **Value:** ваш API key
   - **Name:** `CLOUDINARY_API_SECRET` → **Value:** ваш API secret
4. Нажмите "Save"
5. **Важно:** После добавления переменных нужно сделать **Redeploy** проекта:
   - Перейдите в Deployments
   - Выберите последний deployment
   - Нажмите на три точки (⋮) → "Redeploy"

## Что изменилось в коде

### `/next.config.ts` - Добавлен Cloudinary домен
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'res.cloudinary.com',
      port: '',
      pathname: '/**',
    },
  ],
}
```
Это необходимо для работы Next.js Image компонента с внешними изображениями.

### `/src/app/api/upload/route.ts` (основной endpoint для создания событий)
- ❌ Убрано: сохранение файлов в `public/uploads/` (не работает на Vercel)
- ❌ Убрано: обработка Sharp (вызывала ошибки с HEIC/HEIF форматами)
- ✅ Добавлено: загрузка в Cloudinary через их API
- ✅ Добавлено: автоматическая обработка через Cloudinary (resize, оптимизация, WebP/AVIF)
- ✅ Поддержка: JPEG, PNG, WebP, HEIC/HEIF (формат iPhone)
- ✅ Возвращает: `{ success: true, url: "https://res.cloudinary.com/..." }`

### `/src/app/api/upload/image/route.ts` (альтернативный endpoint)
- ❌ Убрано: сохранение файлов в `public/uploads/` (не работает на Vercel)
- ❌ Убрано: обработка Sharp (вызывала ошибки с HEIC/HEIF форматами)
- ✅ Добавлено: загрузка в Cloudinary через их API
- ✅ Добавлено: автоматическая обработка через Cloudinary (resize, оптимизация, WebP/AVIF)
- ✅ Поддержка: все форматы изображений включая HEIC/HEIF
- ✅ Возвращает: `{ success: true, imageUrl: "https://res.cloudinary.com/..." }`

## Преимущества Cloudinary
- ✅ Работает на Vercel и любом serverless окружении
- ✅ Бесплатный тир на 25GB
- ✅ Автоматическая оптимизация изображений
- ✅ CDN для быстрой загрузки по всему миру
- ✅ Автоматическое преобразование форматов (WebP, AVIF)
- ✅ Управление изображениями через веб-интерфейс

## Проверка работоспособности

После настройки переменных и redeploy:

1. Откройте ваше приложение на Vercel
2. Попробуйте создать событие с загрузкой изображения
3. Проверьте, что загрузка прошла успешно
4. URL изображения должен выглядеть как: `https://res.cloudinary.com/ваш_cloud_name/...`

## Альтернативы (если не подходит Cloudinary)

Если по каким-то причинам Cloudinary не подходит, можно использовать:
- **Vercel Blob Storage** (платный, но простой)
- **AWS S3** (требует больше настройки)
- **Supabase Storage** (бесплатный тир 1GB)
- **UploadThing** (бесплатный тир 2GB)

## Troubleshooting

### Ошибка: "Invalid credentials"
- Проверьте правильность API ключей
- Убедитесь, что в Vercel добавлены все три переменные
- Сделайте Redeploy после добавления переменных

### Ошибка: "Upload failed"
- Проверьте квоту на Cloudinary (Dashboard → Usage)
- Проверьте размер файла (макс. 10MB по умолчанию)
- Проверьте формат файла (должен быть image/*)

### Изображения не отображаются
- Проверьте URL в базе данных (должен начинаться с `https://res.cloudinary.com/`)
- Проверьте настройки CORS на Cloudinary (обычно работает из коробки)

