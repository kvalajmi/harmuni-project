# 🤖 دليل العمل مع الذكاء الاصطناعي - Harmuni Task

> **مهم جداً:** اقرأ هذا الملف أولاً قبل إجراء أي تعديلات!

---

## 📋 ملخص المشروع

**المشروع:** نظام إدارة مهام للموظفين (Harmuni Task)
**التقنيات:** Next.js 16, Supabase, Docker, TypeScript
**الاستضافة:** DigitalOcean VPS (167.99.241.118)
**الدومين:** https://harmuni.org
**الريبو:** https://github.com/kvalajmi/harmuni-project

---

## 🎯 البنية التحتية الحالية

### السيرفر:
- **المزود:** DigitalOcean
- **IP:** 167.99.241.118
- **OS:** Ubuntu 24.04.3 LTS
- **RAM:** 1 GB
- **الدخول:** DigitalOcean Console (موصى به) أو SSH
- **المسار:** `/app`

### قاعدة البيانات:
- **Supabase Project:** wefjsxugozhhzubdtpeb
- **URL:** https://wefjsxugozhhzubdtpeb.supabase.co
- **الـ Keys:** موجودة في `تطبيق_المهام_البيانات_المهمة.md`

### Docker Hub:
- **Repository:** kvalajmi/harmuni-task
- **Username:** kvalajmi
- **الـ Tokens:** موجودة في GitHub Secrets

---

## 🚀 نظام النشر الحالي (CI/CD)

### كيف يعمل:

```
الكود المحلي → git push → GitHub Actions → Docker Hub → السيرفر
   (جهاز المستخدم)    (تلقائي)      (3-4 دقائق)      (image)    (20 ثانية)
```

### الملفات المهمة:

1. **`.github/workflows/deploy.yml`** - GitHub Actions workflow
2. **`docker-compose.prod.yml`** - Production config (يسحب من Docker Hub)
3. **`update-server.sh`** - سكريبت النشر السريع (20 ثانية)
4. **`Dockerfile`** - بناء الـ image
5. **`docker-compose.yml`** - Development/Manual build

### GitHub Secrets (مضافة):
- `DOCKER_USERNAME` = kvalajmi
- `DOCKER_TOKEN` = dckr_pat_...
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

---

## 📝 خطوات العمل مع المستخدم

### 1️⃣ المستخدم يطلب تعديل/إضافة/إصلاح

**مثال:** "أبي أضيف زر حذف في صفحة الموظفين"

### 2️⃣ أنت (AI) تعدل الكود محلياً

```bash
# المسار المحلي
cd "/Users/abofahad/Desktop/مشاريعي الي مسويها /harmuni task v2"

# عدّل الملفات المطلوبة
# استخدم Read, Edit, Write tools

# اختبر البناء محلياً
npm run build

# إذا نجح البناء، اعمل commit
git add .
git commit -m "وصف واضح للتعديل

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

### 3️⃣ GitHub Actions يبني تلقائياً

- **المدة:** 3-4 دقائق
- **المتابعة:** https://github.com/kvalajmi/harmuni-project/actions
- **النتيجة المطلوبة:** علامة خضراء ✅

### 4️⃣ المستخدم ينشر على السيرفر

```bash
# في DigitalOcean Console أو SSH:
cd /app
./update-server.sh
```

**المدة:** 10-20 ثانية فقط! ⚡

### 5️⃣ التحقق من النجاح

- زيارة: https://harmuni.org
- اختبار التعديل الجديد
- التأكد من عدم وجود أخطاء

---

## ⚠️ قواعد مهمة - اقرأها!

### ✅ افعل:

1. **اقرأ الملفات أولاً** قبل التعديل (استخدم Read tool)
2. **اختبر البناء محلياً** بـ `npm run build` قبل الـ push
3. **استخدم Edit tool** لتعديل الملفات الموجودة (لا تعيد كتابتها)
4. **اكتب commit messages واضحة** بالعربي أو الإنجليزي
5. **أضف `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`** في كل commit
6. **وثّق التغييرات** في `تطبيق_المهام_البيانات_المهمة.md` إذا كانت مهمة
7. **راجع GitHub Actions** بعد الـ push للتأكد من النجاح

### ❌ لا تفعل:

1. **لا تعدل مباشرة في السيرفر** - كل شي يتم محلياً
2. **لا تستخدم `docker compose build`** في السيرفر بعد الآن (بطيء)
3. **لا تغير الـ Secrets** في GitHub بدون إذن المستخدم
4. **لا تحذف ملفات CI/CD** (`.github/workflows/`, `docker-compose.prod.yml`, `update-server.sh`)
5. **لا تعدل `Dockerfile`** إلا إذا ضروري جداً
6. **لا تنشر كلمات السر** في commit messages أو comments

---

## 🔧 الإصلاحات الشائعة

### إذا فشل GitHub Actions:

1. **اذهب إلى:** https://github.com/kvalajmi/harmuni-project/actions
2. **اضغط على الـ workflow الأحمر**
3. **اقرأ الخطأ** في "Annotations"
4. **أصلح المشكلة** محلياً
5. **اعمل push مرة ثانية**

### إذا فشل النشر في السيرفر:

```bash
# تحقق من الـ logs
docker logs harmuni-task --tail 50

# إعادة تشغيل يدوياً
cd /app
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### إذا احتجت بناء يدوي (الطريقة القديمة):

```bash
# في السيرفر (فقط للطوارئ!)
cd /app
git pull
docker compose build
docker compose up -d
```

**تحذير:** هذا سيأخذ 5-6 دقائق. استخدمه فقط إذا GitHub Actions معطل.

---

## 📁 هيكل المشروع المهم

```
harmuni task v2/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React Components
│   └── lib/
│       ├── hooks.ts            # SWR hooks (مهم!)
│       ├── supabase-browser.ts # Supabase client
│       ├── employee-task-actions.ts  # Server Actions
│       └── staff-actions.ts    # Staff management
├── public/                     # Static files
├── Dockerfile                  # Docker build instructions
├── docker-compose.yml          # Dev/Manual build
├── docker-compose.prod.yml     # Production (Docker Hub)
├── update-server.sh            # النشر السريع ⚡
├── DEPLOY.md                   # دليل النشر
├── AI_WORKFLOW.md              # هذا الملف!
└── تطبيق_المهام_البيانات_المهمة.md  # الـ Credentials والتوثيق
```

---

## 🎯 الإنجازات الأخيرة (2026-01-09)

### إصلاحات التطبيق:
1. ✅ إصلاح: المهام تظهر للموظف الذي أنشأها (commit: `efe87aa`)
2. ✅ إزالة حقل "الموعد النهائي" من نموذج إنشاء المهام (commit: `ffdb897`)
3. ✅ تحسين الأداء: SWR caching (commit: `7c9229c`)
4. ✅ تحسين استعلامات قاعدة البيانات (commit: `81a0855`)

### البنية التحتية:
1. ✅ إعداد GitHub Actions CI/CD (commit: `00179f3`)
2. ✅ ربط Docker Hub (commit: `de4749f`)
3. ✅ إصلاح تمرير الـ secrets (commit: `de4749f`)
4. ✅ إنشاء سكريبت النشر السريع `update-server.sh`

### النتيجة:
- **النشر أصبح 27x أسرع** (من 9 دقائق → 20 ثانية)
- **نشر تلقائي** عند كل push
- **سهل وموثوق**

---

## 🔍 معلومات تقنية إضافية

### SWR Hooks المستخدمة:

في `src/lib/hooks.ts`:
- `useEmployeesWithStats()` - موظفين مع إحصائيات
- `useAssignedTasks()` - مهام مُسندة
- `useCreatedTasks()` - مهام مُنشأة
- `useEmployeeTasksList()` - مهام الموظفين (بين الموظفين)
- `useNotifications()` - إشعارات
- وغيرها...

### تحسينات الأداء:

1. **SWR Config:**
   - `revalidateOnFocus: false` - لا تُعيد الجلب عند التركيز
   - `dedupingInterval: 120000` - منع الطلبات المكررة (دقيقتان)
   - `keepPreviousData: true` - احتفظ بالبيانات القديمة أثناء الجلب

2. **Database Queries:**
   - `.limit(100)` على كل الاستعلامات الرئيسية
   - استخدام `count` بدل جلب كل التعليقات
   - استعلامات منفصلة (created + assigned) للموظفين

---

## 📞 جهات الاتصال والموارد

### GitHub:
- **Repository:** https://github.com/kvalajmi/harmuni-project
- **Actions:** https://github.com/kvalajmi/harmuni-project/actions
- **Secrets:** https://github.com/kvalajmi/harmuni-project/settings/secrets/actions

### Docker Hub:
- **Repository:** https://hub.docker.com/r/kvalajmi/harmuni-task
- **Tokens:** https://hub.docker.com/settings/security

### Supabase:
- **Dashboard:** https://supabase.com/dashboard/project/wefjsxugozhhzubdtpeb
- **Database:** SQL Editor في Dashboard

### DigitalOcean:
- **Console:** https://cloud.digitalocean.com
- **Droplet:** harmuni-task

---

## 💡 نصائح للعمل الفعال

### للـ AI الذي يقرأ هذا:

1. **اقرأ هذا الملف كاملاً** قبل أي تعديل
2. **اقرأ `تطبيق_المهام_البيانات_المهمة.md`** للتاريخ الكامل
3. **اقرأ `DEPLOY.md`** لفهم نظام النشر
4. **اختبر محلياً** دائماً قبل الـ push
5. **تواصل مع المستخدم** إذا كان شيء غير واضح
6. **وثّق التغييرات المهمة** في ملف البيانات المهمة

### للمستخدم:

1. **اطلب بوضوح** ما تريده بالضبط
2. **وفّر أمثلة** إذا ممكن
3. **راجع التغييرات** قبل الموافقة على الـ push
4. **انتظر GitHub Actions** ينتهي قبل النشر على السيرفر
5. **اختبر دائماً** بعد النشر على https://harmuni.org

---

## 🎓 أمثلة على طلبات شائعة

### مثال 1: إضافة حقل جديد

**المستخدم:** "أبي أضيف حقل 'رقم الهاتف' لجدول الموظفين"

**الـ AI يسوي:**
1. يعدل الـ database schema في Supabase (أو يطلب من المستخدم)
2. يعدل الـ types في TypeScript
3. يعدل الـ forms المتعلقة
4. يعدل الـ display components
5. يختبر البناء
6. يعمل commit & push
7. يطلب من المستخدم ينشر بـ `./update-server.sh`

### مثال 2: إصلاح bug

**المستخدم:** "في خطأ لما أضغط على زر الحذف"

**الـ AI يسوي:**
1. يطلب تفاصيل أكثر (أي صفحة؟ أي خطأ؟)
2. يقرأ الـ component المتعلق
3. يشخص المشكلة
4. يصلحها
5. يختبر البناء
6. يعمل commit & push
7. يطلب من المستخدم ينشر

### مثال 3: تحسين الأداء

**المستخدم:** "صفحة المهام بطيئة"

**الـ AI يسوي:**
1. يفحص الـ component (SWR hook موجود؟)
2. يفحص الـ Server Actions (استعلام محسّن؟)
3. يضيف/يحسن الـ SWR hook إذا لزم
4. يضيف `.limit()` للاستعلامات
5. يختبر البناء
6. يعمل commit & push
7. يوثق التحسين في ملف البيانات المهمة

---

## 📅 تاريخ آخر تحديث

**التاريخ:** 2026-01-09
**الإصدار:** 1.0
**آخر تعديل بواسطة:** Claude Sonnet 4.5

---

## ✅ Checklist للـ AI قبل أي تعديل

- [ ] قرأت `AI_WORKFLOW.md` (هذا الملف)
- [ ] قرأت `تطبيق_المهام_البيانات_المهمة.md`
- [ ] فهمت الطلب بوضوح من المستخدم
- [ ] قرأت الملفات المتعلقة بالتعديل
- [ ] عدلت الكود بحذر (استخدم Edit tool)
- [ ] اختبرت البناء محلياً (`npm run build`)
- [ ] كتبت commit message واضح
- [ ] أضفت `Co-Authored-By: Claude Sonnet 4.5`
- [ ] عملت push للـ GitHub
- [ ] راجعت GitHub Actions (علامة خضراء؟)
- [ ] طلبت من المستخدم ينشر بـ `./update-server.sh`
- [ ] وثّقت التغيير المهم (إذا لزم)

---

**🎉 الآن أنت جاهز للعمل على Harmuni Task بكفاءة!**
