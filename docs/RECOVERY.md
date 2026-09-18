# Recovery

1. Payment paid, delivery failed → job dead_letter → fix config → re-queue / retry worker  
2. GitHub created, Vercel failed → fix VERCEL_TOKEN → retry (idempotent repo path)  
3. Health failed → fix app/deploy → retry health via re-run provisioning or manual delivery update  
4. Never mark READY without reachable instanceUrl
