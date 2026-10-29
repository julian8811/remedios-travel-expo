import { FORMS } from './forms.js';
export function csvCell(value) {
  let text = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(records) {
  const fields = Object.entries(FORMS).flatMap(([form, f]) => f.fields.map(field => ({form, field})));
  const rows = [['ID','Formulario','Registrado por','Fecha de captura','Recibido en servidor', ...fields.map(({form,field}) => `${form} · ${field.l}`)]];
  for (const r of records) rows.push([r.id, r.form, r.por, r.capture_date, r.received_at, ...fields.map(({form,field}) => form === r.form ? (field.t === 'consent' ? (r.d[field.id] ? 'Sí' : 'No') : r.d[field.id]) : '')]);
  return '\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
export function dayBounds(day) {
  const start = new Date(`${day}T00:00:00-05:00`);
  if (!Number.isFinite(+start) || start.toISOString().slice(0,10) !== day) throw new Error('Fecha inválida.');
  return { start: start.toISOString(), end: new Date(+start + 86400000).toISOString() };
}
export function summaryStats(records) {
  const byForm = Object.fromEntries(['A','B','C'].map(k => [k, records.filter(r => r.form === k).length]));
  const ratings = records.filter(r => r.form === 'B').map(r => r.d.interes).filter(Number.isFinite);
  return { total: records.length, byForm, buyerInterest: ratings.length ? (ratings.reduce((a,b) => a+b,0)/ratings.length).toFixed(1) : 'Sin datos', nextSteps: records.filter(r => r.form === 'B' && r.d.paso && r.d.paso !== 'Ninguno por ahora').length };
}
