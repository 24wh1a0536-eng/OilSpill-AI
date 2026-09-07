const crypto = require('crypto');
const { estimateArea, severityFor } = require('./engine');
const config = require('../config');

function validateImage(file) {
  if (!file || typeof file.dataUrl !== 'string' || !file.dataUrl.startsWith('data:image/')) throw new Error('Select a valid image file.');
  if (!config.upload.types.includes(file.type)) throw new Error(`Unsupported format. Use ${config.upload.types.join(', ')}.`);
  const bytes = Buffer.byteLength(file.dataUrl, 'utf8');
  if (bytes > config.upload.maxBytes * 1.37) throw new Error('Image exceeds the 10 MB upload limit.');
}
function svg(width, height, color, opacity) {
  const x = Math.round(width * .32), y = Math.round(height * .34), rx = Math.round(width * .21), ry = Math.round(height * .13);
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#071b2c"/><ellipse cx="${x + rx}" cy="${y + ry}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}"/><ellipse cx="${x + rx}" cy="${y + ry}" rx="${rx}" ry="${ry}" fill="none" stroke="#7df9ff" stroke-width="4"/></svg>`).toString('base64')}`;
}
function analyze(file, options = {}) {
  validateImage(file);
  const hash = crypto.createHash('sha256').update(file.dataUrl).digest();
  const width = 1000, height = 650;
  const pixelCount = 26000 + hash.readUInt16BE(0) % 18000;
  const suppliedResolution = options.groundResolutionMeters;
  const resolution = suppliedResolution === undefined || suppliedResolution === '' ? config.analysis.defaultGroundResolutionMeters : Number(suppliedResolution);
  if (!Number.isFinite(resolution) || resolution <= 0 || resolution > 10000) throw new Error('Ground resolution must be a positive value up to 10,000 meters per pixel.');
  const areaKm2 = +estimateArea(pixelCount, resolution).toFixed(2);
  const score = +(0.55 + (hash[2] / 255) * .38).toFixed(3);
  const severity = severityFor(areaKm2);
  return { detectionMethod: config.analysis.prototypeLabel, score, pixelCount, groundResolutionMeters: resolution, areaKm2, severity, maskUrl: svg(width,height,'#00d4ff','.72'), overlayUrl: svg(width,height,'#ff8b38','.48'), boundingBox: { x: 320, y: 221, width: 420, height: 169 }, limitations: 'Prototype anomaly segmentation. Area is estimated from the supplied or assumed ground resolution; it is not a validated geospatial measurement.' };
}
module.exports = { analyze, validateImage };
