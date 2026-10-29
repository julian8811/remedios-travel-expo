// Creates exactly three synthetic records; remove their printed UUIDs after verification.
import assert from 'node:assert/strict';
import { config } from '../public/config.js';
import { colombiaDay } from '../public/shared/validation.js';
const origin = process.env.SMOKE_ORIGIN || 'https://julian8811.github.io';
const headers = { 'Content-Type':'application/json', apikey:config.key, Origin:origin };
const preflight = await fetch(config.url+'/functions/v1/submit',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,apikey'}});
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
const fixtures = [
  ['A',{exp:'PRUEBA TÉCNICA · eliminar',idea:'Registro sintético de verificación'}],
  ['B',{empresa:'PRUEBA TÉCNICA · eliminar',tipo:'Agencia de viajes',interes:4,paso:'Enviar portafolio'}],
  ['C',{perfil:'Visitante o turista',conoce:'No',viajaria:3,coment:'PRUEBA TÉCNICA · eliminar'}]
];
const ids=[];
for (const [form,d] of fixtures) {
  const record={id:crypto.randomUUID(),form,por:'PRUEBA TÉCNICA',capture_date:colombiaDay(),captured_at:new Date().toISOString(),registrar_consent:true,d};
  for (let retry=0;retry<2;retry++) {
    const res=await fetch(config.url+'/functions/v1/submit',{method:'POST',headers,body:JSON.stringify(record)});
    const result=await res.json(); assert.equal(res.status,200,JSON.stringify(result)); assert.equal(result.id,record.id);
  }
  ids.push(record.id);
}
for(const table of ['registros','administradores','summary_runs','rate_limits']) {
  const res=await fetch(config.url+'/rest/v1/'+table+'?select=*',{headers});
  assert.ok(res.status===401 || res.status===403,`Public read ${table}: ${res.status}`);
}
const denied=await fetch(config.url+'/functions/v1/daily-summary',{method:'POST',headers,body:'{}'});
assert.equal(denied.status,401);
const malformed=await fetch(config.url+'/functions/v1/submit',{method:'POST',headers,body:'{}'});
assert.equal(malformed.status,400);
const deniedInsert=await fetch(config.url+'/rest/v1/registros',{method:'POST',headers,body:JSON.stringify({id:crypto.randomUUID()})});
assert.ok([401,403].includes(deniedInsert.status));
console.log(JSON.stringify({status:'passed',forms:3,posts:6,publicReadsDenied:4,directInsertDenied:true,privateDigestDenied:true,invalidRecordRejected:true,syntheticIds:ids},null,2));
