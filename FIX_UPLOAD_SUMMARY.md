# 🔧 Исправление загрузки изображений (Upload Fix)

## 🔴 Проблема
При создании события на `/organizer/create-event` изображения сохранялись локально в `/uploads/` и в базу данных попадали относительные пути типа `/uploads/image.png`. Это не работает на Vercel из-за read-only файловой системы.

## ✅ Решение
Обновлены **ОБА** API endpoint'а для загрузки изображений на Cloudinary:

### 1. `/api/upload/route.ts` ⭐️ (Основной)
Используется в форме создания события (`/organizer/create-event`)
- **ДО:** Сохранял файлы в `public/uploads/`
- **ПОСЛЕ:** Загружает на Cloudinary CDN
- **Возвращает:** `{ success: true, url: "https://res.cloudinary.com/..." }`

### 2. `/api/upload/image/route.ts` (Резервный)
Альтернативный endpoint для других частей приложения
- **ДО:** Сохранял файлы в `public/uploads/`
- **ПОСЛЕ:** Загружает на Cloudinary CDN
- **Возвращает:** `{ success: true, imageUrl: "https://res.cloudinary.com/..." }`

## 🚀 Что делать дальше

### Шаг 1: Настройте Cloudinary (5 минут)
1. Зарегистрируйтесь: https://cloudinary.com/users/register_free
2. Скопируйте из Dashboard:
   - Cloud Name
   - API Key
   - API Secret

### Шаг 2: Добавьте переменные в Vercel
1. Откройте проект на https://vercel.com
2. Settings → Environment Variables
3. Добавьте:
   ```
   CLOUDINARY_CLOUD_NAME = ваш_cloud_name
   CLOUDINARY_API_KEY = ваш_api_key
   CLOUDINARY_API_SECRET = ваш_api_secret
   ```

### Шаг 3: Redeploy
1. Deployments → выберите последний
2. ⋮ (три точки) → "Redeploy"

### Шаг 4: Для локальной разработки (опционально)
Добавьте в `.env`:
```bash
CLOUDINARY_CLOUD_NAME=ваш_cloud_name
CLOUDINARY_API_KEY=ваш_api_key
CLOUDINARY_API_SECRET=ваш_api_secret
```

## ✅ Результат
После настройки:
- ✅ Загрузка изображений работает на Vercel
- ✅ URL в базе данных: `https://res.cloudinary.com/ваш_cloud/...`
- ✅ Изображения доступны через CDN по всему миру
- ✅ Автоматическая оптимизация и resize
- ✅ 25GB бесплатного storage

## 🧪 Проверка
1. Создайте событие на `/organizer/create-event`
2. Загрузите изображение
3. После создания проверьте страницу события
4. URL изображения должен начинаться с `https://res.cloudinary.com/`

## 📚 Подробная документация
- **Быстрый старт:** `БЫСТРАЯ_НАСТРОЙКА_CLOUDINARY.md`
- **Полная документация:** `CLOUDINARY_SETUP.md`

---

**Статус:** ✅ Код обновлен, требуется только настройка Cloudinary credentials

