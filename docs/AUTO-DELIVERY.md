# التسليم الأوتوماتيكي بعد الدفع

بعدما الـ webhook يؤكد المبلغ، NUMI يقوم بـ:

1. Order = PAID
2. إنشاء شراء + رخصة + مهمة توفير
3. تشغيل الـ worker فوراً (بدون انتظار الكرون)
4. نسخ الريبو المصدر إلى ريبو GitHub خاص بالزبون
5. إنشاء مشروع Vercel ونشره
6. فحص صحة الرابط
7. READY + فتح الوصول في مساحة الزبون

## ما يلزم يكون مضبوط

في `.env` / Vercel:

```
FEATURE_NATIVE_PROVISIONING=true
GITHUB_TOKEN=...          # صلاحية repo خاصة
GITHUB_OWNER=your-user-or-org
VERCEL_TOKEN=...
VERCEL_TEAM_ID=...        # إذا عندك team
```

لكل منتج في الأدمن:

- `sourceRepoUrl` = رابط ريبو الموقع الجاهز (مثال: `https://github.com/you/dar-restaurant`)
- `sourceRepoBranch` = عادة `main`
- `provisioningMode` = `native`

بدون `sourceRepoUrl` ما تقدرش تطلع نسخة مستقلة أوتوماتيكياً.

## مساحة الزبون

بعد الجاهزية يظهر `instanceUrl` في `/account`.
الطلب يبقى queued إذا GitHub/Vercel أو المصدر ناقص — بدون READY كاذب.

## Worker احتياطي

GitHub Action كل 5 دقائق يعيد محاولة المهام العالقة.
