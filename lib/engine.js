const config = require('../config');

const toRadians = value => value * Math.PI / 180;
function calculateDistance(aLat, aLon, bLat, bLon) {
  const dLat = toRadians(bLat - aLat), dLon = toRadians(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function severityFor(areaKm2) { return config.severity.find(item => areaKm2 < item.max).name; }
function estimateArea(pixelCount, resolutionMeters) { return pixelCount * resolutionMeters ** 2 / 1000000; }
function riskFor(score) { return config.correlation.risk.find(item => score >= item.min).name; }
function temporalScore(positions, timestamp) {
  const target = new Date(timestamp).getTime();
  const nearest = Math.min(...positions.map(p => Math.abs(new Date(p.timestamp).getTime() - target) / 60000));
  return Math.max(0, 1 - nearest / config.correlation.temporalWindowMinutes);
}
function nearestApproach(positions, incident) {
  return Math.min(...positions.map(p => calculateDistance(p.latitude, p.longitude, incident.latitude, incident.longitude)));
}
function correlate(incident, vessel) {
  const distanceKm = nearestApproach(vessel.positions, incident);
  const c = config.correlation;
  if (distanceKm > c.radiusKm) return null;
  const proximity = Math.max(0, 1 - distanceKm / c.radiusKm);
  const temporal = temporalScore(vessel.positions, incident.detectedAt);
  const vesselType = c.relevance[vessel.type] ?? 0.2;
  // A close approach is an observable trajectory signal, not a claim of route deviation.
  const route = Math.max(0, 1 - distanceKm / (c.radiusKm * 0.6));
  const score = c.weights.proximity * proximity + c.weights.temporal * temporal + c.weights.vesselType * vesselType + c.weights.route * route;
  return { vesselMmsi: vessel.mmsi, incidentId: incident.id, distanceKm: +distanceKm.toFixed(2), proximity: +proximity.toFixed(3), temporal: +temporal.toFixed(3), vesselType: +vesselType.toFixed(3), route: +route.toFixed(3), score: +score.toFixed(3), risk: riskFor(score), closestAt: vessel.positions.reduce((best, p) => calculateDistance(p.latitude,p.longitude,incident.latitude,incident.longitude) < calculateDistance(best.latitude,best.longitude,incident.latitude,incident.longitude) ? p : best).timestamp };
}
function explanation(result, vessel) {
  return `${vessel.name} was ${result.distanceKm} km from the incident's closest recorded position. Its temporal score is ${result.temporal} within the configured ${config.correlation.temporalWindowMinutes}-minute window, and ${vessel.type} has a relevance score of ${result.vesselType}. This ${result.risk} correlation score indicates potential relevance only; it is not proof of responsibility.`;
}
module.exports = { calculateDistance, severityFor, estimateArea, riskFor, correlate, explanation };
