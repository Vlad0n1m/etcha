# 🚀 Быстрая настройка Cloudinary

## Что было сделано
✅ Код обновлен для использования Cloudinary вместо локального хранилища  
✅ Установлен пакет `cloudinary`  
✅ API `/api/upload/image` теперь загружает изображения в облако

## Что нужно сделать

### 1️⃣ Зарегистрируйтесь на Cloudinary (2 минуты)
👉 https://cloudinary.com/users/register_free

**Бесплатный тир:**
- 25 GB хранилища
- 25 GB трафика в месяц
- Без кредитной карты

### 2️⃣ Получите API ключи
После регистрации в Dashboard вы увидите:
- **Cloud Name**: `dxxxxxxxxx`
- **API Key**: `123456789012345`
- **API Secret**: (нажмите "Reveal")

### 3️⃣ Добавьте в Vercel
1. Откройте проект на https://vercel.com
2. Settings → Environment Variables
3. Добавьте 3 переменные:

```
CLOUDINARY_CLOUD_NAME = ваш_cloud_name
CLOUDINARY_API_KEY = ваш_api_key
CLOUDINARY_API_SECRET = ваш_api_secret
```

4. **ВАЖНО:** После сохранения сделайте Redeploy:
   - Deployments → выберите последний → ⋮ → Redeploy

### 4️⃣ Для локальной разработки (опционально)
Добавьте в `.env`:

```bash
CLOUDINARY_CLOUD_NAME=ваш_cloud_name
CLOUDINARY_API_KEY=ваш_api_key
CLOUDINARY_API_SECRET=ваш_api_secret
```

## ✅ Готово!
После redeploy загрузка изображений будет работать.

---

**Ответ на ваш вопрос:** Нет, в Neon (PostgreSQL) нельзя эффективно хранить изображения. Используйте Cloudinary или другие специализированные сервисы для файлов.

📖 Подробная документация: `CLOUDINARY_SETUP.md`

