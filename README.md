# OilSpill AI
## Maritime Oil Spill Detection & Vessel Identification

OilSpill AI is an offline-first Smart India Hackathon prototype for maritime incident triage. It turns a satellite-image upload into a **Prototype Detection** result, stores an incident, and ranks **potentially relevant vessels** using deterministic spatial, temporal, vessel-type, and trajectory signals.

## Honest Prototype Boundary
- The bundled tracks are a clearly labeled **Demo AIS Dataset**, not live AIS.
- The detection engine is a deterministic image-feature anomaly prototype, not a trained ML model.
- Area is an **Estimated Area**: anomalous pixels × supplied/assumed ground resolution squared.
- Correlation supports investigation. It does not identify or prove a polluter.

## Architecture
```text
Satellite image -> validation -> PrototypeAnomalyDetector -> mask/overlay
  -> estimated area + configurable severity -> incident store
Demo AIS Dataset -> Haversine spatial correlation -> temporal comparison
  -> close-approach trajectory signal + vessel relevance -> ranked correlation
  -> dashboard / alerts / investigation report API
```

## Stack
Node.js built-in HTTP server, vanilla HTML/CSS/JS, local JSON store, Node test runner. No network, cloud account, database service, or map tile provider is required for the demo.

## Run
```bash
npm start
# Open http://localhost:3000
```

## Commands
```bash
npm test             # unit tests for computation boundaries
npm run reset-demo   # restore deterministic data without starting the UI
npm start            # backend and frontend
```
There is no separate frontend build process: static assets are served by the local Node process.

## Demo Workflow
1. Open Overview and select `OS-2026-001` via a Correlate action.
2. Inspect Caribbean Star's component score and trajectory. Its score expresses potential relevance only.
3. Open Satellite Analysis, upload any supported local image, enter coordinates and ground resolution, then run detection.
4. Inspect the generated mask/overlay, estimated area, severity rationale, and stored incident.
5. Open Investigation to see nearby vessel ranking. Use `Reset Demo` before the next presentation.

## APIs
- `GET /api/health`, `/api/dashboard/stats`, `/api/analytics`, `/api/alerts`, `/api/config`
- `GET /api/spills`, `/api/spills/:id`, `/api/spills/:id/vessels`
- `GET /api/vessels`, `/api/vessels/:mmsi`, `/api/correlations`, `/api/reports/:id`
- `POST /api/analyze-image`, `/api/correlate`, `/api/demo/reset`

## Algorithms
**Area:** `pixel_count * resolution_meters^2 / 1,000,000` km². Resolution defaults to 20 m/px only when no validated metadata is supplied.

**Severity:** configurable in `config.js`: Minor <2, Moderate <5, Major <10, Critical >=10 km².

**Correlation:** Haversine closest approach within the configurable 25 km radius. Temporal score is the nearest recorded AIS point within a 90-minute window. The final score is:
`0.40 proximity + 0.30 temporal + 0.20 vessel-type relevance + 0.10 close-approach trajectory signal`.

All weights, relevance values, radius, time window, risk bands, upload types, and severity bands are centralized in `config.js`.

## Data
`data/demo.json` is deterministic and contains six incidents and ten vessels with historical track points. Runtime changes live only in `data/runtime.json`, which Reset Demo replaces from the seed. User uploads are treated as user-provided inputs; generated analysis records are derived data.

## Limitations & Future Work
Optical imagery can contain clouds and look-alikes; SAR requires specialized interpretation; actual ground resolution/georeferencing may be unavailable; AIS can be delayed, absent, or spoofed. A production evolution can implement Sentinel/Landsat ingestion, a validated segmentation model behind `lib/detector.js`, PostGIS, authenticated roles, ocean/weather layers, live licensed AIS adapters, and audited reporting.
