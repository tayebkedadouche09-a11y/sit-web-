# NUMI V1 — suivi de livraison

## Livré

- Marketplace publique premium avec landing cinématique, grille responsive, cartes produits, recherche et filtre par catégorie.
- Page catégorie dédiée `/categories/:slug` avec données réelles depuis la base.
- Taxonomie `categories` persistée en base, seed initial, relation `products.categoryId`, CRUD owner, publication, archivage, suppression gardée et réordonnancement.
- Éditeur produit owner relié à la catégorie DB, FAQ IA prévisualisable et éditable avant sauvegarde.
- Espace propriétaire protégé avec Products, Categories, Orders, Deliveries, Coupons et Reviews.
- Checkout Stripe serveur réel : création de Checkout Session, redirection sécurisée, webhook signé, transitions idempotentes de paiement, licence et delivery queued.
- Provisioning automatique conditionné à `PROVISIONING_API_URL` et `PROVISIONING_API_KEY`; sans fournisseur configuré, la commande reste honnêtement en `queued` sans URL inventée.
- Notifications client persistées pour paiement confirmé/échoué, provisioning et livraison prête.
- Espace client avec états Stripe/livraison, licences, téléchargements protégés et notifications.
- Analytics produit, audit log et garde-fous d’accès conservés.
- Direction visuelle renforcée : identité algérienne contemporaine, géométrie inspirée de l’architecture, lumière méditerranéenne, particules discrètes, relief 3D, hover/focus et responsive mobile.

## Validation

- `pnpm check` — OK.
- `pnpm test` — OK, 1 test passé.
- `pnpm build` — OK.
- Landing publique contrôlée visuellement.
- Recherche `React` + filtre `operations-saas` — 1 résultat réel, Signal Ops.
- Page `/categories/operations-saas` — contrôlée visuellement, 1 système publié.
- `admin.categories` sans session — `FORBIDDEN`.
- `orders.checkout` sans session — `UNAUTHORIZED`.
- Webhook Stripe sans signature/configuration — HTTP 400, aucun faux paiement accepté.

## Configuration externe attendue

Pour activer les paiements réels : `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` et `PUBLIC_APP_URL`.

Pour activer le provisioning réel : `PROVISIONING_API_URL` et `PROVISIONING_API_KEY`. Le fournisseur doit accepter `POST /provision` et retourner les URLs, ainsi que les flags `sourceReady`, `documentationReady` et `licenseReady`.


## Refonte Cinematic Digital Universe — 2026-09-17

La landing a été refondue autour d’une toile cosmique originale et d’une seconde texture nebula générées pour NUMI. Le hero combine espace profond, étoiles en mouvement lent, profondeur atmosphérique, architecture digitale, fenêtres d’interface flottantes, CTA et narration visuelle. Le scroll-story présente désormais quatre étapes : Signal, Structure, System et Handover. Les couches parallax utilisent `requestAnimationFrame`, restent légères côté client et sont désactivées avec `prefers-reduced-motion`.

Validation : `pnpm check`, `pnpm test` et `pnpm build` passent. Le hero et le parcours complet ont été contrôlés dans le navigateur. Les assets sont servis depuis WebDev Storage, pas depuis le bundle frontend.


## Final source portability hardening — 2026-09-17

- Replaced storefront visual references to WebDev/Manus storage with repository-local SVG assets under `client/public/assets/`.
- Added product preview assets and seeded product gallery records so published product pages have real local visual media.
- Product detail now exposes technology, FAQ, gallery, live-demo state, and motion links when configured.
- Existing seeded catalogs are backfilled with missing FAQ/gallery records without overwriting owner-edited content.
- Remaining external configuration is intentionally not fabricated: Stripe credentials/webhook, real provisioning provider, real live demo URLs, and an optional email provider still require owner credentials/configuration.
