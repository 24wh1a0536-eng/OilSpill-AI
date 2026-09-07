const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { correlate, explanation, severityFor } = require('./lib/engine');
const { analyze } = require('./lib/detector');

const ROOT = __dirname, DATA = path.join(ROOT, 'data', 'runtime.json'), DEMO = path.join(ROOT, 'data', 'demo.json');
function reset() { fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.copyFileSync(DEMO, DATA); return load(); }
function load() { if (!fs.existsSync(DATA)) reset(); return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
function save(data) { fs.writeFileSync(DATA, JSON.stringify(data, null, 2)); }
function correlations(data, incidentId) {
  const incident = data.incidents.find(x => x.id === incidentId);
  if (!incident) return [];
  return data.vessels.map(v => { const result = correlate(incident, v); return result && { ...result, vessel: { mmsi:v.mmsi,name:v.name,type:v.type,flag:v.flag,positions:v.positions }, explanation: explanation(result,v) }; }).filter(Boolean).sort((a,b) => b.score-a.score);
}
function alerts(data) {
  return data.incidents.flatMap(i => {
    const top = correlations(data, i.id)[0]; const result = [];
    if (i.severity === 'CRITICAL') result.push({ id:`ALT-${i.id}-C`, incidentId:i.id, level:'CRITICAL', status:'OPEN', time:i.detectedAt, message:`Critical estimated spill: ${i.areaKm2} km2 at ${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}.` });
    if (top && top.score >= .8) result.push({ id:`ALT-${i.id}-V`, incidentId:i.id, level:'HIGH', status:'OPEN', time:i.detectedAt, message:`High correlation: ${top.vessel.name} scored ${top.score}; potentially relevant, not attribution.` });
    return result;
  }).sort((a,b) => new Date(b.time)-new Date(a.time));
}
function stats(data) {
  const active = data.incidents.filter(i => ['DETECTED','CONFIRMED','TRACKING'].includes(i.status));
  const all = data.incidents.flatMap(i => correlations(data, i.id));
  return { totalSpills:data.incidents.length, activeSpills:active.length, monitoredVessels:data.vessels.length, correlations:all.filter(x=>x.score>=.4).length, highRiskVessels:new Set(all.filter(x=>x.risk==='HIGH').map(x=>x.vesselMmsi)).size, averageDetectionScore:data.incidents.length ? +(data.incidents.reduce((s,i)=>s+i.score,0)/data.incidents.length).toFixed(3) : null };
}
function analytics(data) {
  const severity = Object.fromEntries(['MINOR','MODERATE','MAJOR','CRITICAL'].map(s=>[s,data.incidents.filter(i=>i.severity===s).length]));
  const status = Object.fromEntries(['DETECTED','CONFIRMED','TRACKING','RESOLVED'].map(s=>[s,data.incidents.filter(i=>i.status===s).length]));
  const avgArea = +(data.incidents.reduce((sum,i)=>sum+i.areaKm2,0)/data.incidents.length).toFixed(2);
  return { severity, status, averageAreaKm2:avgArea, timeline:data.incidents.map(i=>({date:i.detectedAt.slice(0,10), count:1, score:i.score})).sort((a,b)=>a.date.localeCompare(b.date)), correlationDistribution:{ high:stats(data).highRiskVessels, medium:[...new Set(data.incidents.flatMap(i=>correlations(data,i.id)).filter(c=>c.risk.startsWith('MEDIUM')).map(c=>c.vesselMmsi))].length, low:[...new Set(data.incidents.flatMap(i=>correlations(data,i.id)).filter(c=>c.risk==='LOW').map(c=>c.vesselMmsi))].length } };
}
function send(res, code, body, contentType='application/json') { res.writeHead(code, {'Content-Type':contentType, 'Cache-Control':'no-store'}); res.end(contentType==='application/json'?JSON.stringify(body):body); }
function parse(req) { return new Promise((resolve,reject) => { let raw=''; req.on('data', c=>{raw+=c;if(raw.length>15*1024*1024) reject(new Error('Request too large.'));}); req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('Invalid JSON request.'));}}); }); }
function serveStatic(res, pathname) { const relative = pathname === '/' ? 'public/index.html' : `public${pathname}`; const file = path.resolve(ROOT, relative); if (!file.startsWith(path.join(ROOT,'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false; const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}; send(res,200,fs.readFileSync(file),types[path.extname(file)]||'application/octet-stream'); return true; }
function incidentReport(data, id) { const incident=data.incidents.find(i=>i.id===id); if(!incident) return null; const ranked=correlations(data,id); return { generatedAt:new Date().toISOString(), dataSource:data.source, incident, correlations:ranked, evidenceSummary:ranked.length ? `Spatial, temporal, vessel-type and close-approach signals rank potentially relevant vessels. ${ranked[0].vessel.name} is highest at ${ranked[0].score}.` : 'No vessels were within the configured search radius.', limitations:'Prototype detector and Demo AIS Dataset. Correlation is decision support, not proof of pollution or legal attribution.' }; }
const server=http.createServer(async (req,res)=>{
  const url=new URL(req.url, `http://${req.headers.host}`), parts=url.pathname.split('/').filter(Boolean);
  try {
    if (req.method==='GET' && !url.pathname.startsWith('/api/')) { if(!serveStatic(res,url.pathname)) send(res,404,{error:'Not found'}); return; }
    const data=load();
    if(req.method==='GET' && url.pathname==='/api/health') return send(res,200,{status:'READY', components:['Satellite Analysis','Prototype Detection Engine','GIS Correlation Engine','Demo AIS Dataset']});
    if(req.method==='GET' && url.pathname==='/api/dashboard/stats') return send(res,200,stats(data));
    if(req.method==='GET' && url.pathname==='/api/spills') return send(res,200,data.incidents);
    if(req.method==='GET' && /^\/api\/spills\/[^/]+$/.test(url.pathname)) { const i=data.incidents.find(x=>x.id===parts[2]); return i?send(res,200,i):send(res,404,{error:'Incident not found.'}); }
    if(req.method==='GET' && /^\/api\/spills\/[^/]+\/vessels$/.test(url.pathname)) return send(res,200,correlations(data,parts[2]));
    if(req.method==='GET' && url.pathname==='/api/vessels') return send(res,200,data.vessels);
    if(req.method==='GET' && /^\/api\/vessels\/[^/]+$/.test(url.pathname)) {const v=data.vessels.find(x=>x.mmsi===parts[2]);return v?send(res,200,v):send(res,404,{error:'Vessel not found.'});}
    if(req.method==='GET' && url.pathname==='/api/correlations') return send(res,200,data.incidents.flatMap(i=>correlations(data,i.id)));
    if(req.method==='GET' && url.pathname==='/api/alerts') return send(res,200,alerts(data));
    if(req.method==='GET' && url.pathname==='/api/analytics') return send(res,200,analytics(data));
    if(req.method==='GET' && url.pathname==='/api/config') return send(res,200,{severity:config.severity,correlation:config.correlation,analysis:config.analysis});
    if(req.method==='GET' && /^\/api\/reports\/[^/]+$/.test(url.pathname)) {const report=incidentReport(data,parts[2]);return report?send(res,200,report):send(res,404,{error:'Incident not found.'});}
    if(req.method==='POST' && url.pathname==='/api/demo/reset') return send(res,200,{message:'Demo data restored.', stats:stats(reset())});
    if(req.method==='POST' && url.pathname==='/api/correlate') { const input=await parse(req); if(!data.incidents.some(i=>i.id===input.incidentId)) return send(res,404,{error:'Incident not found.'}); return send(res,200,correlations(data,input.incidentId)); }
    if(req.method==='POST' && url.pathname==='/api/analyze-image') { const input=await parse(req); const lat=Number(input.latitude), lon=Number(input.longitude); if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lon)||lon<-180||lon>180) return send(res,400,{error:'Provide valid latitude and longitude.'}); const result=analyze(input.file,input); const id=`OS-UP-${String(data.incidents.length+1).padStart(3,'0')}`; const incident={id,latitude:lat,longitude:lon,areaKm2:result.areaKm2,severity:severityFor(result.areaKm2),score:result.score,detectedAt:new Date().toISOString(),status:'DETECTED',source:'User upload',processingMethod:result.detectionMethod,maskUrl:result.maskUrl,overlayUrl:result.overlayUrl}; data.incidents.unshift(incident);save(data); console.info('analysis completed',id);return send(res,201,{incident,analysis:result}); }
    return send(res,404,{error:'API endpoint not found.'});
  } catch(error) { console.error('api error',error.message); return send(res,400,{error:error.message||'Request failed.'}); }
});
server.listen(process.env.PORT||3000,()=>console.log(`OilSpill AI listening at http://localhost:${process.env.PORT||3000}`));
