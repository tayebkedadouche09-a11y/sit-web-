# NUMI 5 — دليل النشر الكامل
## قاعدة البيانات · المفاتيح · المتغيرات · التشغيل · التحديث

هذه الوثيقة تجمع **كل ما تحتاجه** لنشر المتجر على الإنترنت وتشغيله بأمان.

---

## 0) صورة عامة: كل خدمة وين؟

| الجزء | أين يُستضاف | الدور |
|-------|-------------|--------|
| **المتجر (الكود)** | Vercel أو Railway / Render | الواجهة + الـ API |
| **قاعدة البيانات** | **Supabase فقط** (PostgreSQL) | المستخدمون، المنتجات، الطلبات، التسليم |
| **نسخ الزبائن** | GitHub (ريبو خاص) + Vercel (مشروع لكل زبون) | النسخة المستقلة بعد الدفع |
| **الدفع** | Chargily (الجزائر) و/أو Stripe / PayPal | تحصيل الثمن |
| **الدخول** | Manus API Key (server-side) | دخول مالك/أدمن المتجر |
| **الدعم** | واتساب (اختياري) | زر عائم |

**قاعدة ذهبية:**  
- `DATABASE_URL` → Supabase  
- كود المتجر → منصة Node (Vercel/غيرها)  
- لا تخلط قاعدة المتجر مع قواعد الزبائن الاختيارية

---

## 1) التحضير قبل النشر

### 1.1 حسابات تنشئها

1. [ ] **Supabase** — مشروع جديد  
2. [ ] **Vercel** — حساب لنشر المتجر + لاحقاً نسخ الزبائن  
3. [ ] **GitHub** — حساب/منظمة فيها قوالب المواقع (`sourceRepoUrl`)  
4. [ ] **Chargily** — للدفع بالدينار (مستحسن)  
5. [ ] **Stripe / PayPal** — اختياري للخارج  
6. [ ] **Manus** — حساب + API Key  
7. [ ] نطاق domain (اختياري في البداية؛ يمكن البدء بـ `*.vercel.app`)

### 1.2 جهازك محلياً

- Node 20+
- pnpm
- المشروع يفتح محلياً (`pnpm dev`) كما في `docs/LOCAL-VSCODE.md`

---

## 2) قاعدة البيانات على Supabase (خطوة بخطوة)

### 2.1 إنشاء المشروع

1. ادخل https://supabase.com → **New project**
2. اختر اسم، كلمة مرور قوية لقاعدة البيانات، ومنطقة قريبة
3. انتظر حتى يصبح المشروع Ready

### 2.2 أخذ رابط الاتصال

1. **Project Settings → Database**
2. انسخ **Connection string** من نوع **URI**
3. للسيرفرات السحابية (Vercel) فضّل **Transaction pooler** — المنفذ **6543**

شكل تقريبي:

```text
postgresql://postgres.XXXX:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
```

ضع هذا في `DATABASE_URL`.

### 2.3 إنشاء الجداول (مرة أولى)

محلياً مع `.env` فيه `DATABASE_URL`:

```bash
pnpm install
pnpm exec drizzle-kit push
pnpm db:seed
```

`db:seed` يضع منتجات تجريبية — يمكنك لاحقاً تعديلها من `/admin`.

### 2.4 نسخ احتياطي

من لوحة Supabase:

- **Database → Backups** (حسب خطتك)
- أو تصدير دوري للبيانات الحساسة

---

## 3) جدول كل المتغيرات (`.env` / Vercel Environment Variables)

انسخ من `.env.example` إلى `.env` محلياً، ونفس المفاتيح في **Vercel → Project → Settings → Environment Variables**.

### أ) أساسي — بدونها الموقع ما يخدم

| المتغير | مثال / مصدر | مطلوب؟ |
|---------|--------------|--------|
| `DATABASE_URL` | رابط Supabase Pooler | نعم |
| `PUBLIC_APP_URL` | `https://your-domain.com` أو `https://xxx.vercel.app` | نعم |
| `JWT_SECRET` | نص عشوائي ≥ 32 حرف | نعم |
| `NODE_ENV` | `production` على السحابة | نعم |
| `PORT` | `3000` (غالباً تلقائي على المنصة) | حسب المنصة |

### ب) الدخول والأدمن

لا تحتاج **Team** ولا **Open App** في نسخة NUMI الحالية. أنشئ API Key من Manus Developers → API settings.

ضع المفتاح في Vercel كـ Environment Variable server-side:

| المتغير | الوظيفة |
|---------|---------|
| `MANUS_API_KEY` | API Key من Manus — **server-side فقط** |
| `OWNER_OPEN_ID` | اختياري، للتوافق مع منطق الأدمن القديم |

NUMI يتحقق من المفتاح عبر `GET https://api.manus.ai/v2/user.me` باستخدام header `x-manus-api-key`، ثم ينشئ جلسة NUMI لحساب صاحب المفتاح. الـAPI Key لا يدخل إلى المتصفح ولا إلى bundle الواجهة.

### ج) الدفع — Chargily (مستحسن للجزائر)

| المتغير | الوظيفة |
|---------|---------|
| `CHARGILY_SECRET_KEY` | المفتاح السري من لوحة Chargily |
| `CHARGILY_API_URL` | غالباً `https://pay.chargily.net/api/v2` |
| `FEATURE_CHARGILY` | `true` |

**Webhook في Chargily:**  
وجّهه إلى:

```text
https://YOUR_PUBLIC_APP_URL/api/... 
```

(حسب مسار الـ webhook في الكود — راجعه في `server/chargily.ts` / السيرفر بعد النشر، وعادة يكون تحت مسار الـ API العام للمشروع.)

ابدأ بـ **Test mode** ثم Live.

### د) Stripe (اختياري)

| المتغير |
|---------|
| `STRIPE_SECRET_KEY` |
| `VITE_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` |

Webhook Stripe → نفس `PUBLIC_APP_URL` + مسار webhook Stripe في المشروع.

### هـ) PayPal (اختياري)

| المتغير |
|---------|
| `PAYPAL_CLIENT_ID` |
| `PAYPAL_CLIENT_SECRET` |
| `PAYPAL_API_URL` |
| `PAYPAL_WEBHOOK_ID` |

### و) التسليم الأوتوماتيكي (نسخة مستقلة بعد الدفع)

| المتغير | الوظيفة |
|---------|---------|
| `FEATURE_NATIVE_PROVISIONING` | `true` |
| `GITHUB_TOKEN` | Personal Access Token بصلاحية إنشاء ريبو خاص |
| `GITHUB_OWNER` | اسم المستخدم أو المنظمة |
| `GITHUB_API_URL` | `https://api.github.com` |
| `VERCEL_TOKEN` | من Vercel Account → Tokens |
| `VERCEL_TEAM_ID` | إن كنت ضمن Team |
| `VERCEL_API_URL` | `https://api.vercel.com` |

**شرط المنتج:** في الأدمن كل منتج يجب أن يملك:

- `sourceRepoUrl` = رابط قالب الموقع على GitHub  
- `provisioningMode` = `native`

بدون `sourceRepoUrl` لن تُنشأ نسخة مستقلة.

### ز) اختياري

| المتغير | الوظيفة |
|---------|---------|
| `VITE_WHATSAPP_NUMBER` | زر واتساب (أرقام فقط مثل `213555123456`) |
| `SECRETS_ENCRYPTION_KEY` | تشفير أسرار مخزّنة (مستحسن) |
| `EMAIL_PROVIDER` / مفاتيح Resend أو SMTP | إيميلات |
| `SENTRY_DSN` | مراقبة أخطاء |
| `CUSTOMER_DB_PROVIDER` | عزل DB لكل زبون (متقدم، غالباً `none` في البداية) |

---

## 4) نشر كود المتجر

### الخيار أ — Vercel (شائع)

1. ارفع المشروع إلى **GitHub** (ريبو خاص بك)
2. في Vercel: **Add New Project** → اختر الريبو
3. **Build Command:** `pnpm build`  
   **Install Command:** `pnpm install`
4. أضف **كل** متغيرات البيئة (Production)
5. Deploy
6. انسخ الرابط `https://xxx.vercel.app` وضعه في `PUBLIC_APP_URL` ثم أعد Deploy
7. اربط domain من Vercel → Domains إن رغبت

> ملاحظة: التطبيق Express كامل. إذا ظهرت حدود serverless (timeout) على التوفير الطويل، بديل أقوى للـ API: **Railway** أو **Render** مع نفس `DATABASE_URL`، و Vercel يبقى لنسخ الزبائن فقط.

### الخيار ب — Railway / Render

1. New project from GitHub  
2. Build: `pnpm install && pnpm build`  
3. Start: `pnpm start`  
4. نفس متغيرات `.env`  
5. ضع الـ URL العمومي في `PUBLIC_APP_URL`

---

## 5) ترتيب التشغيل بعد أول نشر

نفّذ بالترتيب:

1. [ ] الموقع يفتح على `PUBLIC_APP_URL`
2. [ ] `GET /api/health` يرجع ok
3. [ ] الجداول موجودة في Supabase (Table Editor)
4. [ ] المنتجات تظهر (بعد seed أو من الأدمن)
5. [ ] تسجيل الدخول عبر Manus API Key يعمل
6. [ ] `/admin` يفتح لحسابك فقط
7. [ ] منتج تجريبي فيه `sourceRepoUrl` حقيقي
8. [ ] Chargily **test**: شراء كامل
9. [ ] بعد الدفع: طلب PAID + مهمة توفير
10. [ ] في `/account` يظهر رابط النسخة أو حالة التجهيز
11. [ ] بدّل Chargily إلى **live** فقط بعد نجاح الاختبار

---

## 6) Webhooks (لا تنسَ)

| الخدمة | ماذا تضبط |
|--------|-----------|
| Chargily | URL موقعك العام + سر التحقق إن وُجد |
| Stripe | Endpoint + `STRIPE_WEBHOOK_SECRET` |
| PayPal | Webhook id في لوحتهم + في `.env` |

بدون webhook صحيح: الزبون يدفع لكن الطلب قد لا يتحول PAID تلقائياً.

---

## 7) Worker التوفير (احتياطي)

المشروع فيه GitHub Action:

`.github/workflows/automation-worker.yml`

يعمل كل ~5 دقائق ويعيد محاولة المهام العالقة.

أضف في GitHub Secrets إن استخدمته:

- `NUMI_AUTOMATION_URL` = رابط موقعك
- `NUMI_AUTOMATION_SECRET` = نفس `AUTOMATION_WORKER_SECRET`

بعد الدفع مباشرة الكود يحاول التوفير فوراً؛ الـ Action احتياطي.

---

## 8) التشغيل اليومي (Operations)

| مهمة | كيف |
|------|-----|
| إضافة منتج | `/admin` → Products |
| إيقاف منتج | status = archived/draft |
| مراقبة طلب | `/admin` → Orders / Deliveries |
| إعادة محاولة تسليم | من الأدمن أو انتظار الـ worker |
| نسخة احتياطية DB | Supabase Backups |
| مراقبة أخطاء | Sentry إن رُبط |

---

## 9) تحديث المشروع لاحقاً (Update)

1. محلياً: اسحب التعديلات أو انسخ النسخة الجديدة فوق المشروع (مع الحفاظ على `.env`)
2. ```bash
   pnpm install
   pnpm exec drizzle-kit push
   pnpm check
   pnpm build
   ```
3. ادفع إلى GitHub → Vercel ينشر تلقائياً (إن مربوط)
4. راقب `/api/health` بعد النشر
5. لا تحذف `DATABASE_URL` ولا تعِد `db:seed` على إنتاج فيه طلبات حقيقية إلا بوعي (الـ seed مصمم idempotent للمنتجات الفارغة، لكن الحذر واجب)

---

## 10) قائمة أمان مختصرة

- [ ] لا ترفع `.env` إلى GitHub أبداً
- [ ] `JWT_SECRET` و توكنات GitHub/Vercel قوية ومحدودة الصلاحية
- [ ] `MANUS_API_KEY` server-side فقط
- [ ] ابدأ Chargily test قبل live
- [ ] ريوهات الزبائن **private**
- [ ] راجع صلاحيات `GITHUB_TOKEN` دورياً

---

## 11) خريطة ملفات التوثيق

| ملف | المحتوى |
|-----|---------|
| `docs/LOCAL-VSCODE.md` | التشغيل على جهازك |
| `docs/DEPLOY-FULL.md` | هذا الملف — النشر الكامل |
| `docs/SUPABASE-VERCEL.md` | ملخص Supabase + Vercel |
| `docs/AUTO-DELIVERY.md` | التسليم الأوتوماتيكي |
| `docs/OWNER-ACCESS.md` | الأدمن |
| `docs/V5-ROADMAP.md` | أفكار مستقبلية |
| `.env.example` | قائمة المتغيرات الرسمية |

---

## 12) مسار يوم الإطلاق (Checklist نهائي)

```text
□ Supabase جاهز + DATABASE_URL (6543)
□ جداول push + منتجات حقيقية في الأدمن
□ كل منتج: demoUrl + sourceRepoUrl + native
□ PUBLIC_APP_URL = رابط النشر النهائي
□ JWT + MANUS_API_KEY
□ Chargily test ناجح end-to-end
□ GITHUB_* + VERCEL_* مضبوطة
□ FEATURE_NATIVE_PROVISIONING=true
□ /account يعرض النسخة بعد الدفع
□ واتساب (اختياري)
□ Chargily live
□ فتح المتجر للزبائن
```

---

**NUMI 5.0.0 — Website Boutique**  
المتغيرات الحقيقية تُوضع في المنصة السحابية (Vercel/Railway) وفي `.env` المحلي فقط — لا تشاركها في الشات أو الريبو العام.
