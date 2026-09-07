# SIH Presentation Notes
## Problem
Oil spills can be detected late, while responders must quickly prioritize an incident and investigate vessels without prematurely assigning blame.

## Solution
OilSpill AI provides an offline demonstration chain: image upload, deterministic prototype anomaly segmentation, transparent estimated area and severity, incident creation, local AIS-style vessel tracks, spatial-temporal correlation, explainable ranking, alerts, and report API.

## Innovation
- An explainable investigation workflow rather than an opaque “guilty vessel” claim.
- One canonical data source drives cards, tables, map markers, alerts, and rankings.
- Deterministic resettable demo that works without internet.
- A replaceable detector boundary makes a future validated model an incremental upgrade.

## 3–5 Minute Story
1. Dashboard: six incidents, ten monitored demo vessels, system status, and openly labeled DEMO MODE.
2. Satellite Analysis: upload an image and explain that the engine is a prototype anomaly detector, not trained AI.
3. Read the mask and overlay, the assumed/supplied resolution, estimated area, and severity threshold.
4. Open `OS-2026-001` investigation: Caribbean Star ranks first because the measured closest approach, time relationship, oil/chemical relevance, and trajectory signal combine under the visible formula.
5. End with the warning in the UI: correlation is potential relevance, not legal attribution. Reset Demo makes the next run identical.

## Scalability
The current monolith is intentionally appropriate for an offline SIH prototype. Replace the JSON store with PostGIS, detector with a versioned model-serving adapter, and Demo AIS Dataset with a licensed feed adapter. Keep the REST boundary and score explanation contract unchanged.
