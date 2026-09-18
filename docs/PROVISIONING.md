# Provisioning

## Modes
1. **native** — requires GITHUB_TOKEN, GITHUB_OWNER, VERCEL_TOKEN, product.sourceRepoUrl  
   Creates private customer repository, Vercel project, waits for deployment URL, HTTP health check.
2. **external** — PROVISIONING_API_URL + PROVISIONING_API_KEY  
   Worker must return real instanceUrl; NUMI does not invent success.
3. **manual** — delivery stays queued until owner sets instance URL and readiness flags in Admin.

## Failure
Jobs retry with exponential backoff then `dead_letter`.  
Owner can retry from Admin / worker endpoint.  
Successful steps are not duplicated (idempotent job + ready short-circuit).
