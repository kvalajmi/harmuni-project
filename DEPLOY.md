# 🚀 دليل النشر السريع - Harmuni Task

## ⚡ طريقة النشر الجديدة (10-20 ثانية فقط!)

### كيف يعمل النظام الجديد؟

1. **تعمل `git push`** على جهازك
2. **GitHub Actions يبني تلقائياً** (في الخلفية - 3-4 دقائق)
3. **يرفع الـ image لـ Docker Hub** جاهز
4. **في السيرفر، تشغل سكريبت واحد** يسحب الـ image الجاهز (10-20 ثانية!)

---

## 📋 الإعداد الأولي (مرة واحدة فقط)

### 1. إضافة Docker Hub secrets في GitHub

اذهب إلى: https://github.com/kvalajmi/harmuni-project/settings/secrets/actions

أضف هذين السرّين:
- **DOCKER_USERNAME**: `kvalajmi`
- **DOCKER_TOKEN**: (الـ token من Docker Hub)

### 2. تجهيز السيرفر

```bash
# دخول للسيرفر
ssh root@167.99.241.118

# الذهاب لمجلد التطبيق
cd /app

# جعل سكريبت التحديث قابل للتنفيذ
chmod +x update-server.sh
```

---

## 🎯 طريقة النشر (بعد كل تحديث)

### على جهازك (MacBook):

```bash
# 1. اكتب الكود وعدّل
# 2. احفظ التغييرات
git add .
git commit -m "وصف التحديث"
git push

# 3. انتهيت! GitHub Actions سيبني تلقائياً
```

### على السيرفر:

**انتظر 3-4 دقائق** حتى ينتهي GitHub Actions من البناء (تقدر تشوف التقدم في GitHub Actions tab)

ثم:

```bash
# دخول للسيرفر
ssh root@167.99.241.118

# تشغيل سكريبت التحديث (10-20 ثانية فقط!)
cd /app
./update-server.sh
```

**وخلاص! التحديث تم 🎉**

---

## 📊 مقارنة الطرق

| الطريقة | المدة | الخطوات |
|--------|------|---------|
| **القديمة** (build في السيرفر) | 9-10 دقائق | docker compose build --no-cache |
| **الجديدة** (Docker Hub) | 10-20 ثانية | ./update-server.sh |

---

## 🔍 التحقق من GitHub Actions

لمتابعة عملية البناء التلقائية:
https://github.com/kvalajmi/harmuni-project/actions

---

## ⚠️ ملاحظات مهمة

1. **لا تحتاج `docker compose build` بعد الآن** في السيرفر
2. **GitHub Actions يبني في الخلفية** - تقدر تشتغل على شي ثاني
3. **السيرفر فقط يسحب الـ image الجاهز** - سريع جداً!
4. **إذا فشل GitHub Actions** - تقدر ترجع للطريقة القديمة مؤقتاً

---

## 🆘 استكشاف الأخطاء

### إذا فشل GitHub Actions:
- تأكد من الـ secrets في GitHub (DOCKER_USERNAME و DOCKER_TOKEN)
- شوف الـ logs في: https://github.com/kvalajmi/harmuni-project/actions

### إذا فشل السحب في السيرفر:
- تأكد من اتصال الإنترنت: `ping hub.docker.com`
- جرب يدوياً: `docker pull kvalajmi/harmuni-task:latest`

---

## 📝 الطريقة القديمة (للطوارئ فقط)

إذا احتجت تبني يدوياً في السيرفر:

```bash
cd /app
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

📅 تاريخ الإنشاء: 2026-01-09
✨ النظام الجديد: GitHub Actions + Docker Hub
