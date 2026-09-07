module.exports = {
  upload: { maxBytes: 10 * 1024 * 1024, types: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] },
  analysis: { defaultGroundResolutionMeters: 20, prototypeLabel: 'Prototype Detection' },
  severity: [
    { name: 'MINOR', max: 2 }, { name: 'MODERATE', max: 5 },
    { name: 'MAJOR', max: 10 }, { name: 'CRITICAL', max: Infinity }
  ],
  correlation: {
    radiusKm: 25, temporalWindowMinutes: 90,
    weights: { proximity: 0.4, temporal: 0.3, vesselType: 0.2, route: 0.1 },
    relevance: { 'Crude Oil Carrier': 1, 'Oil Tanker': 0.95, 'Oil/Chemical Tanker': 0.85, 'Chemical Tanker': 0.75, 'Bulk Carrier': 0.3, 'Container Ship': 0.2, 'General Cargo': 0.2 },
    risk: [{ name: 'HIGH', min: 0.8 }, { name: 'MEDIUM-HIGH', min: 0.6 }, { name: 'MEDIUM', min: 0.4 }, { name: 'LOW', min: 0 }]
  }
};
