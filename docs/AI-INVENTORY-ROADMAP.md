# KHYAL AI & Inventory Roadmap

## Current baseline
- Products and stock quantities are stored in Supabase `public.products`.
- Admins can manually edit a product's stock quantity.
- Checkout currently opens WhatsApp; orders and sold quantities are not written to the database.
- The storefront is a Vite frontend hosted on GitHub Pages. Never place an AI provider secret in frontend code or `VITE_*` variables.

## Non-negotiable safety rules
1. AI may suggest text, stock actions, and purchase quantities; it must not publish content or change stock automatically.
2. Every stock change must be confirmed by an authenticated admin and recorded with who/when/why and before/after quantities.
3. Keep the existing product records. Database changes must be additive and backed up first.
4. Use Supabase Row Level Security. Secrets belong only in a server-side function, never in the browser.
5. Clearly label forecasts as estimates and avoid pretending there is sales history when there isn't.

## Phased implementation

### Phase 0 — Protect and baseline
- Export/backup products and existing Supabase schema.
- Confirm the deployed app uses the intended Supabase project and admin role policies.
- Test product create/edit/delete and stock updates using a non-critical test product.

### Phase 1 — Reliable inventory foundation (first build)
- Add an append-only `stock_movements` table for opening balances, receipts, corrections, damaged/returned goods, and later sales.
- Record product, quantity delta, reason, note, admin user, timestamp, and stock before/after.
- Add an admin-only stock adjustment flow with a review/confirmation step; no silent changes.
- Add low-stock threshold per product and an admin alert/report. Start with a manually configured threshold.
- Import opening balances as explicitly labeled opening-balance movements; do not infer old sales.

### Phase 2 — Capture real sales
- Add an order draft/record flow that stores product snapshots and quantities before sending the customer to WhatsApp.
- Only decrement stock after an admin confirms an order according to the store's actual fulfillment process. Cancelled/unfulfilled orders must not count as sales.
- Record order status changes and connect fulfilled order items to stock movements.
- Provide a manual path for phone/WhatsApp orders so sales history is not limited to website visitors.

### Phase 3 — AI product content
- Add a “Generate with AI” button in the admin product form.
- Send only product facts (name, category, brand, price and supplied specifications) to a server-side Supabase Edge Function.
- Return editable Arabic title, short description, full description, key features, search terms, and WhatsApp/social copy.
- Never invent dimensions, materials, origin, certifications, warranty, or included pieces. Mark missing facts for the admin.
- Require admin review and a separate explicit save/publish action. Store provider credentials as server-side secrets.

### Phase 4 — Inventory insights
- Start with transparent rule-based reports: low stock, no/slow movement, top sellers, and reorder suggestions.
- After sufficient clean sales history exists, evaluate simple demand estimates with a stated date range and confidence/limitations.
- Present recommended quantities and reasons; require explicit admin approval for any stock or purchase action.

### Phase 5 — Quality and rollout
- Test access controls as both admin and public visitor.
- Test network/API failures, duplicate order submissions, cancelled orders, returns, and concurrent stock edits.
- Add audit/export capability and a rollback procedure.
- Deploy in small steps and verify GitHub Actions and the live site after each change.

## Acceptance criteria
- No AI secret is shipped to the browser.
- AI-generated content is a draft until an admin saves it.
- No stock changes without an explicit admin confirmation.
- Every stock adjustment is auditable.
- Forecasts are disabled or clearly marked as unavailable until real sales history exists.
