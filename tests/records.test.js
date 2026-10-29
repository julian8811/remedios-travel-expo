import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { FORMS } from '../public/shared/forms.js';
import { validateRecord, colombiaDay } from '../public/shared/validation.js';
import { csvCell, toCsv, dayBounds, summaryStats } from '../public/shared/report.js';
function record(form='A',d={exp:'Destino de prueba',idea:'Idea de prueba'}) {
  return {id:randomUUID(),form,por:'Registrador de prueba',capture_date:colombiaDay(),captured_at:new Date().toISOString(),registrar_consent:true,d};
}
test('preserves every original field in all three forms',()=>{
  assert.deepEqual(FORMS.A.fields.map(f=>f.id),['exp','region','tipo','prod','similar','precio','presenta','idea','contacto','cal','autoriza']);
  assert.deepEqual(FORMS.B.fields.map(f=>f.id),['empresa','tipo','ciudad','persona','cargo','tel','correo','seg','conoce','interes','prod','necesita','grupo','temporada','paso','notas','autoriza']);
  assert.deepEqual(FORMS.C.fields.map(f=>f.id),['perfil','origen','edad','conoce','asocia','prod','viajaria','frena','con','noches','gasto','canal','coment']);
});
test('validates A, B and anonymous C',()=>{
  assert.equal(validateRecord(record()).form,'A');
  assert.equal(validateRecord(record('B',{empresa:'Empresa',tipo:FORMS.B.fields[1].o[0],interes:4,paso:'Enviar portafolio'})).form,'B');
  assert.equal(validateRecord(record('C',{perfil:'Visitante o turista',conoce:'No',viajaria:3})).form,'C');
});
test('requires registrar name, consent, required answers and valid dates',()=>{
  for (const patch of [{por:''},{registrar_consent:false},{capture_date:'2099-01-01'},{capture_date:'2026-02-30'},{captured_at:'invalid'},{d:{exp:'Destino'}}]) assert.throws(()=>validateRecord({...record(),...patch}));
});
test('blocks unauthorized personal contacts in A and B',()=>{
  assert.throws(()=>validateRecord(record('A',{exp:'Destino',idea:'Idea',contacto:'persona@example.org'})),/autorización/);
  const b={empresa:'Empresa',tipo:'Agencia de viajes',interes:4,paso:'Enviar portafolio',persona:'Persona',cargo:'Gerente',correo:'a@example.org'};
  assert.throws(()=>validateRecord(record('B',b)),/autorización/);
  assert.equal(validateRecord(record('B',{...b,autoriza:true})).d.correo,'a@example.org');
});
test('rejects unknown properties, invalid options, malformed values and scales',()=>{
  for(const d of [{exp:'D',idea:'I',cal:6},{exp:'D',idea:'I',prod:['unknown']},{exp:'D',idea:'I',injected:true},{exp:'D',idea:'x'.repeat(1501)},{exp:'D',idea:'I',cal:'4'}]) assert.throws(()=>validateRecord(record('A',d)));
  assert.throws(()=>validateRecord({...record(),form:'__proto__'}));
});
test('Colombia midnight and report boundaries exclude next day',()=>{
  assert.equal(colombiaDay(new Date('2026-10-30T04:59:59Z')),'2026-10-29');
  assert.equal(colombiaDay(new Date('2026-10-30T05:00:00Z')),'2026-10-30');
  assert.deepEqual(dayBounds('2026-10-29'),{start:'2026-10-29T05:00:00.000Z',end:'2026-10-30T05:00:00.000Z'});
});
test('CSV prevents spreadsheet formulas, quotes text and preserves all fields',()=>{
  for(const s of ['=HYPERLINK("x")',' +1','\t@SUM(1)','-2','\n=1']) assert.ok(csvCell(s).startsWith('"\''));
  assert.equal(csvCell('a"b'),'"a""b"');
  const csv=toCsv([validateRecord(record())]);
  assert.ok(csv.includes('C · Comentario')); assert.ok(csv.includes('Destino de prueba')); assert.ok(csv.startsWith('\ufeff'));
});
test('summary combines forms and buyer follow-up',()=>{
  const records=[validateRecord(record()),validateRecord(record('B',{empresa:'E',tipo:'Agencia de viajes',interes:4,paso:'Enviar portafolio'}))];
  assert.deepEqual(summaryStats(records),{total:2,byForm:{A:1,B:1,C:0},buyerInterest:'4.0',nextSteps:1});
});
