# NUMI v5.0.1-HARDENED

# NUMI 5.0.0

## Highlights
- Boutique positioning (sell ready websites)
- Supabase/Postgres path
- Auto delivery after verified payment
- Design focused on conversion
- Soft piano ambient (optional, user-gesture)
- Customer account: delivery status + open instance
- Optional WhatsApp float
- Postgres insert/update compatibility fixes

## Configure
See `.env.example`, `docs/SUPABASE-VERCEL.md`, `docs/AUTO-DELIVERY.md`, `docs/V5-ROADMAP.md`.

## 5.0.1 Hardening
- Application backup/restore module (S3 or webhook, encrypted envelope, safety backup)
- Admin: backupCreate, backupValidate, backupRestore, instanceRollback, orderRefundApply
- Refund: revoke access, block delivery, revoke license, notify, audit
- Rollback: snapshot previous deployment before re-provision; admin rollback
- Health: healthy | degraded | unhealthy with version 5.0.0
- Secret redaction helper
- PostgreSQL labeling (no MySQL as active runtime)
- Production Readiness Report (honest PASS/PARTIAL/NOT VERIFIED)
