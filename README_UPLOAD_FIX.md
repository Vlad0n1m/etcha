# 📸 Upload Fix - Complete Guide

## 🎯 Что было исправлено

### Проблема
```
❌ /api/upload          → сохранял в /uploads/ (не работает на Vercel)
❌ /api/upload/image    → сохранял в /uploads/ (не работает на Vercel)
```

В базе данных появлялись относительные пути: `/uploads/event-123.jpg`

### Решение
```
✅ /api/upload          → загружает на Cloudinary CDN
✅ /api/upload/image    → загружает на Cloudinary CDN
```

Теперь в базе данных: `https://res.cloudinary.com/your_cloud/image/upload/v123/etcha-events/abc.jpg`

---

## 🚀 Что нужно сделать (всего 5 минут)

### 1. Регистрация на Cloudinary
👉 https://cloudinary.com/users/register_free

**Бесплатный план:**
- 25 GB storage
- 25 GB bandwidth/месяц
- Без кредитной карты

### 2. Получите credentials
После регистрации в Dashboard скопируйте:
- **Cloud Name**: `dxxxxxxxxx`
- **API Key**: `123456789012345`
- **API Secret**: (нажмите "Reveal")

### 3. Добавьте в Vercel

#### Вариант А: Через Web UI
1. Откройте https://vercel.com → ваш проект
2. **Settings** → **Environment Variables**
3. Добавьте три переменные:

| Name | Value |
|------|-------|
| `CLOUDINARY_CLOUD_NAME` | ваш cloud name |
| `CLOUDINARY_API_KEY` | ваш API key |
| `CLOUDINARY_API_SECRET` | ваш API secret |

4. **Save**

#### Вариант Б: Через Vercel CLI
```bash
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
```

### 4. Redeploy
```bash
vercel --prod
```

ИЛИ через Web UI:
1. **Deployments** → выберите последний
2. **⋮** (три точки) → **"Redeploy"**

### 5. Для локальной разработки
Добавьте в `.env` или `.env.local`:
```bash
CLOUDINARY_CLOUD_NAME=dxxxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=ваш_secret
```

---

## ✅ Проверка

### Локально
```bash
npm run dev
```

1. Откройте http://localhost:3000/organizer/create-event
2. Создайте событие с изображением
3. Проверьте Network tab → `/api/upload` должен вернуть URL с `cloudinary.com`

### На Production
1. Откройте https://ваш-домен.vercel.app/organizer/create-event
2. Создайте событие с изображением
3. URL изображения должен начинаться с `https://res.cloudinary.com/`

---

## 📂 Измененные файлы

```
✅ src/app/api/upload/route.ts        - Основной endpoint (используется в create-event)
✅ src/app/api/upload/image/route.ts  - Альтернативный endpoint
✅ package.json                        - Добавлен пакет cloudinary
```

---

## 🔍 Как это работает

### До (локальное хранение)
```typescript
// ❌ Не работает на Vercel
await writeFile('./public/uploads/image.jpg', buffer)
return { url: '/uploads/image.jpg' }
```

### После (Cloudinary)
```typescript
// ✅ Работает везде
const result = await cloudinary.uploader.upload_stream(...)
return { url: 'https://res.cloudinary.com/.../image.jpg' }
```

---

## 🎨 Что происходит с изображениями

1. **Загрузка**: Пользователь выбирает изображение
2. **Обработка**: Sharp оптимизирует и resize до 1200×1200px
3. **Upload**: Cloudinary сохраняет в папку `etcha-events/`
4. **CDN**: Изображение доступно через Cloudinary CDN
5. **Database**: Сохраняется полный HTTPS URL

---

## 📊 Преимущества

| Параметр | До | После |
|----------|-----|-------|
| Работает на Vercel | ❌ | ✅ |
| CDN | ❌ | ✅ 195 точек присутствия |
| Оптимизация | ⚠️ Только Sharp | ✅ Sharp + Cloudinary |
| Автоматический WebP | ❌ | ✅ |
| Управление файлами | ❌ | ✅ Web UI |
| Бэкапы | ❌ | ✅ Автоматически |

---

## 🆘 Troubleshooting

### "Failed to upload image"
**Причина:** Cloudinary credentials не настроены  
**Решение:** Проверьте переменные окружения в Vercel

### "Invalid credentials"
**Причина:** Неправильные API ключи  
**Решение:** Пересоздайте ключи в Cloudinary Dashboard

### Изображения все еще `/uploads/...`
**Причина:** Не сделан Redeploy после добавления переменных  
**Решение:** Redeploy проекта в Vercel

### Квота превышена
**Причина:** Использовано > 25GB  
**Решение:** Upgrade на платный план или очистите старые файлы

---

## 📚 Дополнительные ресурсы

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## 📝 Альтернативы Cloudinary

Если Cloudinary не подходит:

| Сервис | Бесплатный тир | Pros | Cons |
|--------|----------------|------|------|
| **Vercel Blob** | 500MB | Интеграция с Vercel | Платный |
| **Supabase Storage** | 1GB | Бесплатный | Требует регистрации |
| **AWS S3** | 5GB | Надежный | Сложная настройка |
| **UploadThing** | 2GB | Простой | Меньше функций |

---

**Статус:** ✅ Код готов, требуется только настройка credentials
**Время настройки:** ~5 минут
**Совместимость:** Vercel, AWS Lambda, Google Cloud Functions, Azure

