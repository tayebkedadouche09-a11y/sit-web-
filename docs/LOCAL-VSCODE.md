# تشغيل NUMI 5 محلياً على VS Code

دليل خطوة بخطوة من الصفر حتى يفتح الموقع على جهازك.

---

## 1) البرامج اللازمة (مرة واحدة)

ثبّت على جهازك:

1. **Node.js** الإصدار 20 أو أحدث  
   - تحميل: https://nodejs.org  
   - تحقق في Terminal:
   ```bash
   node -v
   ```

2. **pnpm**
   ```bash
   npm install -g pnpm
   pnpm -v
   ```

3. **VS Code**  
   - https://code.visualstudio.com

4. **Git** (اختياري لكن مفيد)  
   ```bash
   git --version
   ```

5. **حساب Supabase** (مجاني يكفي للتجربة)  
   - https://supabase.com  
   - ستحتاج Connection String لاحقاً.

---

## 2) فتح المشروع في VS Code

1. فك ضغط الملف `NUMI-v5.0.0.zip` في مجلد واضح، مثال:
   - Windows: `C:\Users\اسمك\Projects\numi`
   - Mac: `~/Projects/numi`

2. افتح VS Code → **File → Open Folder** → اختر مجلد المشروع (اللي فيه `package.json`).

3. افتح Terminal داخل VS Code:
   - قائمة **Terminal → New Terminal**
   - أو اختصار: `` Ctrl+` `` (Windows/Linux) أو `` Cmd+` `` (Mac)

---

## 3) تثبيت الحزم

في الـ Terminal داخل مجلد المشروع:

```bash
pnpm install
```

انتظر حتى ينتهي بدون أخطاء حمراء كبيرة.

---

## 4) إعداد ملف البيئة `.env`

```bash
cp .env.example .env
```

على Windows PowerShell إذا `cp` ما خدمت:

```powershell
Copy-Item .env.example .env
```

افتح `.env` من VS Code وعبّئ على الأقل:

```env
# من Supabase → Project Settings → Database
# استعمل Transaction Pooler إن أمكن (port 6543)
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres

PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=حط_هنا_نص_عشوائي_طويل_على_الاقل_32_حرف
OWNER_OPEN_ID=

NODE_ENV=development
PORT=3000
```

### ملاحظات مهمة

| المتغير | ماذا يعني |
|---------|-----------|
| `DATABASE_URL` | رابط قاعدة Supabase (Postgres) |
| `PUBLIC_APP_URL` | محلياً دائماً `http://localhost:3000` |
| `JWT_SECRET` | أي سلسلة سرية طويلة عشوائية |
| `OWNER_OPEN_ID` | يُملأ بعد أول تسجيل دخول OAuth (أو اتركه فارغاً للتجربة الأولى حسب إعداد OAuth) |

الدفع (Chargily/Stripe) و GitHub/Vercel **ليسوا ضروريين** فقط لفتح الواجهة محلياً.  
يلزمون لاحقاً لتجربة الشراء والتسليم الأوتوماتيكي.

### واتساب (اختياري)

```env
VITE_WHATSAPP_NUMBER=213555123456
```

أرقام فقط مع رمز الدولة، بدون `+`.

---

## 5) إنشاء الجداول في Supabase

بعد ما `DATABASE_URL` صحيح:

```bash
pnpm exec drizzle-kit push
```

إذا طلب تأكيد، وافق على إنشاء الجداول.

ثم البذرة (منتجات تجريبية):

```bash
pnpm db:seed
```

اختياري — فحص الإعدادات:

```bash
pnpm preflight
```

---

## 6) تشغيل المشروع

```bash
pnpm dev
```

انتظر حتى يظهر أن السيرفر شغّال على المنفذ **3000** (أو قريب منه).

افتح المتصفح:

```
http://localhost:3000
```

---

## 7) أوامر مفيدة يومياً

| الأمر | الوظيفة |
|-------|---------|
| `pnpm dev` | تشغيل التطوير (مع إعادة تحميل) |
| `pnpm check` | فحص TypeScript |
| `pnpm build` | بناء نسخة production |
| `pnpm start` | تشغيل البناء (بعد build) |
| `pnpm db:seed` | إعادة بذرة الكتالوج (إذا القاعدة فارغة من المنتجات) |
| `pnpm preflight` | تقرير READY / NOT_CONFIGURED |

---

## 8) امتدادات VS Code مقترحة

من Extensions ثبّت:

- **ESLint** (إن وُجد إعداد)
- **Prettier**
- **Tailwind CSS IntelliSense**
- **DotENV** (لتلوين `.env`)

---

## 9) هيكل المشروع باختصار

```
numi/
├── client/          الواجهة (React)
├── server/          الـ API والتوفير والدفع
├── drizzle/         Schema قاعدة البيانات
├── shared/          الكتالوج المشترك
├── docs/            التوثيق
├── .env.example     نموذج المتغيرات
├── package.json     الأوامر
└── vercel.json      إعداد النشر لاحقاً
```

---

## 10) مشاكل شائعة وحلولها

### `DATABASE_URL is required`
- تأكد أن ملف اسمه بالضبط `.env` في جذر المشروع
- أعد تشغيل `pnpm dev` بعد حفظ `.env`

### خطأ اتصال بقاعدة البيانات
- انسخ URI من Supabase من جديد
- جرّب منفذ **6543** (Pooler) بدل الاتصال المباشر
- تأكد أن كلمة المرور صحيحة (بدون مسافات زائدة)

### المنفذ 3000 مشغول
- غيّر في `.env`: `PORT=3001`
- و `PUBLIC_APP_URL=http://localhost:3001`

### الصفحة تفتح لكن لا منتجات
```bash
pnpm db:seed
```
ثم حدّث المتصفح.

### `pnpm: command not found`
```bash
npm install -g pnpm
```

### OAuth / تسجيل الدخول لا يعمل محلياً
- طبيعي إن لم تضبط `OAUTH_SERVER_URL` و `VITE_APP_ID`
- يمكنك تصفح الكتالوج بدون دخول
- الأدمن يحتاج إعداد OAuth + `OWNER_OPEN_ID`

---

## 11) مسار سريع (ملخص)

```bash
# 1 بعد فك الضغط وفتح المجلد في VS Code
pnpm install
cp .env.example .env
# 2 عبّئ DATABASE_URL و JWT_SECRET و PUBLIC_APP_URL في .env
pnpm exec drizzle-kit push
pnpm db:seed
pnpm dev
# 3 افتح http://localhost:3000
```

---

## 12) ماذا بعد التشغيل المحلي؟

1. ادخل `/admin` بعد ضبط OAuth  
2. عدّل المنتجات وضع `sourceRepoUrl` لكل موقع حقيقي  
3. اضبط Chargily (test) ثم جرب شراء  
4. للنشر: انظر `docs/SUPABASE-VERCEL.md` و `docs/AUTO-DELIVERY.md`

---

**NUMI 5.0.0** — Website Boutique  
إذا ظهرت رسالة خطأ حمراء في Terminal، انسخها كاملة لتسهيل التشخيص.
