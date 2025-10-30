# ✅ Cloudinary Setup Checklist

## Быстрый чек-лист для запуска

### 📋 Подготовка (5 минут)

- [ ] **Шаг 1:** Зарегистрироваться на Cloudinary
  - Ссылка: https://cloudinary.com/users/register_free
  - Бесплатный тир: 25GB storage + 25GB bandwidth/месяц

- [ ] **Шаг 2:** Скопировать credentials из Dashboard
  ```
  Cloud Name:  _________________
  API Key:     _________________
  API Secret:  _________________
  ```

### 🚀 Vercel (Production)

- [ ] **Шаг 3:** Открыть проект на https://vercel.com
- [ ] **Шаг 4:** Settings → Environment Variables
- [ ] **Шаг 5:** Добавить 3 переменные:
  - `CLOUDINARY_CLOUD_NAME` = ваш cloud name
  - `CLOUDINARY_API_KEY` = ваш API key
  - `CLOUDINARY_API_SECRET` = ваш API secret
- [ ] **Шаг 6:** Save
- [ ] **Шаг 7:** Redeploy проекта (Deployments → ⋮ → Redeploy)

### 💻 Локальная разработка (опционально)

- [ ] **Шаг 8:** Открыть `.env` или `.env.local`
- [ ] **Шаг 9:** Добавить те же 3 переменные
- [ ] **Шаг 10:** Перезапустить dev server (`npm run dev`)

### ✅ Тестирование

- [ ] **Шаг 11:** Открыть `/organizer/create-event`
- [ ] **Шаг 12:** Создать событие с изображением
- [ ] **Шаг 13:** Проверить, что URL начинается с `https://res.cloudinary.com/`
- [ ] **Шаг 14:** Открыть страницу события и убедиться, что изображение отображается

---

## 🎯 Что проверить после настройки

### ✅ Успех выглядит так:
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/dxxxxxxxxx/image/upload/v1730305123/etcha-events/abc123.jpg"
}
```

### ❌ Ошибка выглядит так:
```json
{
  "success": false,
  "message": "Failed to upload image"
}
```

---

## 🔍 Быстрая диагностика

| Проблема | Решение |
|----------|---------|
| ❌ "Invalid credentials" | Проверьте правильность API ключей |
| ❌ "Failed to upload" | Убедитесь, что все 3 переменные добавлены в Vercel |
| ❌ URL все еще `/uploads/...` | Сделайте Redeploy после добавления переменных |
| ❌ 500 Error | Проверьте логи в Vercel → Logs |

---

## 📞 Помощь

Подробная документация:
- **Быстрый старт:** `БЫСТРАЯ_НАСТРОЙКА_CLOUDINARY.md`
- **Полное руководство:** `README_UPLOAD_FIX.md`
- **Техническая документация:** `CLOUDINARY_SETUP.md`
- **Краткое резюме:** `FIX_UPLOAD_SUMMARY.md`

---

**Время выполнения:** ~5 минут  
**Сложность:** 🟢 Легко

**Готово?** Поставьте галочки и начните использовать! 🚀

