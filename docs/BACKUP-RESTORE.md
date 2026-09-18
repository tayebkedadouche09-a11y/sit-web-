# Backup & Restore — NUMI v5.0.1-HARDENED

## What NUMI application backup does

`createSystemBackup()` builds an **application snapshot**:

- products, categories, versions, coupons  
- orders, payments **metadata**, purchases, deliveries, licenses  
- instance deployment metadata (URLs, deployment IDs)  
- recent audit logs  

Then:

1. SHA-256 integrity checksum  
2. Optional AES-GCM encryption (`SECRETS_ENCRYPTION_KEY` or `JWT_SECRET`)  
3. Store via **S3** (`STORAGE_PROVIDER=s3` + `S3_*`) or **BACKUP_WEBHOOK_URL**

**Never stored:** env API keys, JWT raw values, raw customer DB passwords.

## What NUMI does **not** claim

**Full PostgreSQL physical restore** (all tables, WAL, exact DB binary state) is **Supabase’s responsibility** via:

- Supabase Dashboard → Backups / Point-in-Time Recovery (PITR)

NUMI does **not** replace Supabase PITR.

## Restore path in NUMI

1. Operator provides backup envelope  
2. `validateBackupEnvelope` → format + checksum  
3. **Safety backup** created first  
4. If `confirm=false` → status `VALIDATED` only  
5. If `confirm=true` → catalog/config rows applied with `onConflictDoNothing`  
6. Orders/payments/licenses are **not** blindly overwritten (prevents partial financial corruption)

On apply failure: error returned; safety backup id kept; no claim of full DB rewrite.

## Staging test checklist (operator)

- [ ] Configure S3 or BACKUP_WEBHOOK_URL  
- [ ] Admin `backupCreate` → receive `backupId` + checksum  
- [ ] `backupValidate` on same envelope → ok  
- [ ] `backupRestore` confirm=false → VALIDATED + safetyBackupId  
- [ ] On **staging only**, confirm=true → catalog rows present  
- [ ] Supabase PITR tested separately for full DB disaster recovery  

Until the boxes above are checked with real IDs, readiness status remains **NOT VERIFIED** for live Backup/Restore.
