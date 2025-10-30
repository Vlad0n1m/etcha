# 🖼️ Next.js Image Configuration Fix

## 🔴 Проблема

После миграции на Cloudinary появилась ошибка при отображении изображений:

```
Invalid src prop (https://res.cloudinary.com/...) on `next/image`, 
hostname "res.cloudinary.com" is not configured under images in your `next.config.js`
```

**Причина:** Next.js требует явного разрешения для загрузки изображений с внешних доменов из соображений безопасности и производительности.

## ✅ Решение

Добавлен Cloudinary домен в конфигурацию Next.js.

### Файл: `/next.config.ts`

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

## 📋 Что делает этот fix

1. **Разрешает Next.js Image оптимизацию** для Cloudinary изображений
2. **Включает автоматический resize** через Next.js Image API
3. **Добавляет lazy loading** для изображений
4. **Улучшает производительность** через оптимизацию Next.js

## 🎯 Преимущества Next.js Image с Cloudinary

| Фича | Описание |
|------|----------|
| **Автоматический resize** | Next.js подбирает оптимальный размер |
| **Lazy loading** | Изображения загружаются по мере скролла |
| **Blur placeholder** | Плавная загрузка с blur эффектом |
| **WebP/AVIF** | Автоматическая конвертация в современные форматы |
| **Responsive images** | Разные размеры для разных экранов |
| **CDN caching** | Кеширование на edge серверах |

## 🔧 Полная конфигурация

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',  // Для тестовых изображений
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',             // Для локальной разработки
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',    // Cloudinary CDN ✨
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: false,  // Включена оптимизация
  },
}
```

## 📱 Использование в компонентах

### EventCard.tsx
```tsx
<Image
    src={imageUrl}  // Cloudinary URL
    alt={title}
    width={48}
    height={48}
    className="object-cover rounded-lg"
/>
```

### EventDetailPage
```tsx
<Image 
    src={event.imageUrl} 
    alt={`${event.title} event cover image`} 
    fill 
    className="object-cover"
    priority  // Для главного изображения
/>
```

## ⚡ Оптимизация

Next.js автоматически:
- Генерирует оптимальные размеры (srcset)
- Конвертирует в WebP/AVIF для поддерживающих браузеров
- Добавляет lazy loading (кроме изображений с `priority`)
- Кеширует результаты на CDN

## 🆘 Troubleshooting

### "Invalid src prop" все еще появляется
**Решение:** Перезапустите dev server (`npm run dev`)

### Изображения не загружаются
**Причина:** Неправильный URL или CORS
**Решение:** Проверьте URL в браузере напрямую

### Изображения размытые
**Причина:** Неправильный размер
**Решение:** Используйте правильные `width`/`height` или `fill` prop

## 📚 Дополнительная настройка (опционально)

Для более детальной настройки оптимизации:

```typescript
images: {
  remotePatterns: [...],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 60,
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

## ✅ Результат

После этого fix'а:
- ✅ Изображения с Cloudinary отображаются корректно
- ✅ Next.js оптимизация работает
- ✅ Lazy loading включен
- ✅ WebP/AVIF автоматически
- ✅ Производительность улучшена

---

**Статус:** ✅ Исправлено  
**Требуется перезапуск:** Dev server (ctrl+C → npm run dev)  
**Для Production:** Просто redeploy на Vercel

