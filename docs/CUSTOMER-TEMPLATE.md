# Customer instance source (v5.0.1-HARDENED)

NUMI does **not** use a root `template.json` to provision buyers.

Each product in the catalog defines:

- `sourceRepoUrl` — GitHub repository of the website template (owner’s template)
- `sourceRepoBranch` — usually `main`
- `provisioningMode` — `native` for GitHub+Vercel auto delivery

Provisioning copies that repository into a **private per-customer** GitHub repo, then deploys to Vercel.

There is no MySQL customer template in the v5 runtime.
