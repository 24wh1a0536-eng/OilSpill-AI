const test = require('node:test'); const assert = require('node:assert/strict');
const {calculateDistance, estimateArea, severityFor, riskFor, correlate} = require('../lib/engine');
const { analyze } = require('../lib/detector');
test('haversine distance is zero for a shared coordinate',()=>assert.equal(calculateDistance(19,72,19,72),0));
test('estimated area converts pixels and resolution',()=>assert.equal(estimateArea(31250,20),12.5));
test('severity thresholds classify exact configured ranges',()=>{assert.equal(severityFor(1.9),'MINOR');assert.equal(severityFor(2),'MODERATE');assert.equal(severityFor(10),'CRITICAL')});
test('risk thresholds are explainable',()=>{assert.equal(riskFor(.8),'HIGH');assert.equal(riskFor(.6),'MEDIUM-HIGH');assert.equal(riskFor(.2),'LOW')});
test('vessel outside configured radius has no correlation',()=>{const incident={id:'x',latitude:0,longitude:0,detectedAt:'2026-01-01T00:00:00Z'};const vessel={mmsi:'1',type:'Oil Tanker',positions:[{latitude:2,longitude:2,timestamp:'2026-01-01T00:00:00Z'}]};assert.equal(correlate(incident,vessel),null)});
test('analysis rejects invalid ground resolution',()=>assert.throws(()=>analyze({type:'image/svg+xml',dataUrl:'data:image/svg+xml;base64,PHN2Zy8+'},{groundResolutionMeters:0}),/Ground resolution/));
