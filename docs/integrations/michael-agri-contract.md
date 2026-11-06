# IFB ⇄ MICHAEL: field-level agricultural monitoring contract

This is the interface both repos build against: `infinite-future-bank` (IFB) and `michael-engine` (MICHAEL).
It delivers Annex A1 of agreement GHV-IFB-2026-001 (Greenhouse Ventures, Cameroon).

## Agreement commitments this supports
- Monitoring of crop stress and disease, flood and drought, rainfall and soil-moisture anomalies, fire and storm, for every enrolled field.
- A partner dashboard, weekly risk reports and quarterly summaries.
- **Alerts within 2 hours** of threshold-breach detection.
- **98% monthly uptime** target for MICHAEL. The IFB API target is 99%.
- Year 1: 500 farmers / 500 ha. Year 2: 2,500 ha.

## Data ownership and minimisation
- IFB is the source of truth for fields (`public.fields`). MICHAEL keeps only what it needs to monitor.
- **MICHAEL never receives farmer personal data:** only the field UUID, partner code, country, crop, planting date and boundary.

## Authentication
- Header `X-API-Key`. Keys live only in environment secrets on both sides. Each key has a client name and scopes (`agri:read`, `agri:write`).
- The key previously hard-coded in IFB's `michael-proxy` must be treated as leaked and **rotated**. IFB will read the new key from the `MICHAEL_API_KEY` secret.

## Endpoints (MICHAEL)
| Method & path | Purpose |
|---|---|
| `PUT /api/v1/agri/fields` | Bulk upsert, at most 500 per call. Request `{ "fields": [ { external_id, partner_code, country, crop, planting_date, boundary, thresholds? } ] }`: `external_id` is the IFB field UUID, `country` is ISO2, `boundary` is a GeoJSON Polygon in `[lng, lat]`. Response `{ "results": [ { external_id, status: "created" \| "updated" \| "rejected", reason?, area_ha?, centroid? } ] }`, with one result per item. |
| `DELETE /api/v1/agri/fields/{external_id}` | Stop monitoring. History is kept for 24 months. |
| `GET /api/v1/agri/fields/{external_id}/risk` | Current risk: `score` 0–100, `level` (low / moderate / high / critical), `observed_at`, `indicators[]`. Each indicator has `hazard`, `value`, `unit`, `level`, `baseline`, `source`, `observed_at`. |
| `GET /api/v1/agri/fields/{external_id}/history?from&to&hazard` | Daily time series. |
| `GET /api/v1/agri/risk?partner_code=GHV&level_min=high` | A partner's fields at or above a risk level. Response `{ "fields": [ { external_id, score, level, indicators, observed_at } ] }`. IFB calls it with `level_min=low` to refresh every field. |
| `GET /health`, `GET /api/v1/agri/status` | Liveness; data freshness per source. |
| `POST /api/v1/agri/sandbox/trigger-alert` | Sandbox only: send a test alert. |

Hazards: `crop_stress`, `disease_risk`, `drought`, `flood`, `rainfall_anomaly`, `soil_moisture_anomaly`, `fire`, `storm`.

## Alerts (MICHAEL → IFB webhook)
- **URL:** `https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/michael-agri-webhook` (built in IFB Phase 2).
- **Body:**
  ```json
  { "event_id": "uuid", "type": "field.alert | field.alert_resolved", "external_id": "field uuid",
    "partner_code": "GHV", "hazard": "drought", "severity": "high", "metric": "spi_30d", "value": -1.8,
    "threshold": -1.5, "observed_at": "…", "detected_at": "…", "message_en": "…", "message_fr": "…" }
  ```
- **Headers:**
  - `X-Michael-Timestamp`: the receiver rejects requests older than 5 minutes.
  - `X-Michael-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>">`, using the shared secret `MICHAEL_WEBHOOK_SECRET`.
- **Delivery:** within 2 hours of detection. Retry with exponential backoff for 24 hours. `event_id` makes delivery idempotent.

## IFB side (status)
- **Phase 1 (done):** fields stored with validated PostGIS boundaries (0.01–500 ha) and the `monitoring_status` values `pending` / `active` / `paused` / `rejected`, plus `michael_synced_at`. A boundary change resets the sync.
- **Phase 2 (built):**
  - `michael-agri-sync` runs every 15 minutes, or when an admin taps "Sync now". It handles removals, registrations (fields become `active` or `rejected` with MICHAEL's reason) and the risk refresh.
  - `michael-agri-webhook` checks the signature and timestamp, then stores the alert once per `event_id`. It texts the farmer for high and critical alerts (SMS, with WhatsApp as a fallback), emails partner owners and admins, and resolves open alerts when it receives `alert_resolved`.
  - `partner-agri-report` sends the weekly email (Mondays) and the quarterly summary.
  - The Partner Hub shows a risk map, an alerts inbox with acknowledge, and reports with CSV export.
- **Secrets to set on IFB:**
  - `MICHAEL_BASE_URL`;
  - `MICHAEL_API_KEY` (the new key; `michael-proxy` now reads it too, so the old hard-coded key can be revoked);
  - `MICHAEL_WEBHOOK_SECRET`;
  - for farmer SMS, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_SMS_FROM`. `TWILIO_WA_FROM` is already set and is used as the fallback.
