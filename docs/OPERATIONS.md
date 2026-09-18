# Operations

## Worker
POST automation worker endpoint with AUTOMATION_WORKER_SECRET to process queued jobs.

## Demo health
Published products are re-checked by `checkPublishedDemos` (worker/cron). Unhealthy demos do not satisfy new publish gate.

## Admin System Truth
Owner → System Truth tab: database, payments, GitHub, Vercel, AI, worker status.
