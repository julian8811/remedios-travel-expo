import { FORMS } from './forms.js';

export function colombiaDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function validateRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Registro inválido.');
  const { id, form, por, capture_date, captured_at, registrar_consent, d } = input;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Identificador inválido.');
  if (typeof form !== 'string' || !Object.hasOwn(FORMS, form)) throw new Error('Formulario inválido.');
  if (typeof por !== 'string' || !por.trim() || por.trim().length > 60) throw new Error('Escribe el nombre de quien registra (máximo 60 caracteres).');
  if (registrar_consent !== true) throw new Error('Falta la autorización de quien registra.');
  if (typeof capture_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(capture_date) || !Number.isFinite(Date.parse(capture_date)) || new Date(capture_date).toISOString().slice(0, 10) !== capture_date || capture_date > colombiaDay()) throw new Error('Fecha de captura inválida o futura.');
  if (typeof captured_at !== 'string' || !Number.isFinite(Date.parse(captured_at)) || Date.parse(captured_at) > Date.now() + 300000) throw new Error('Hora de captura inválida.');
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Respuestas inválidas.');
  const fields = FORMS[form].fields;
  if (Object.keys(d).some(key => !fields.some(f => f.id === key))) throw new Error('El formulario contiene campos desconocidos.');
  const answers = {};
  for (const f of fields) {
    let v = d[f.id] ?? (f.t === 'checks' ? [] : f.t === 'consent' ? false : '');
    if (f.t === 'checks') {
      if (!Array.isArray(v) || v.length > f.o.length || new Set(v).size !== v.length || v.some(x => !f.o.includes(x))) throw new Error(`Opciones inválidas: ${f.l}`);
    } else if (f.t === 'consent') {
      if (typeof v !== 'boolean') throw new Error(`Autorización inválida: ${f.l}`);
    } else if (f.t === 'scale') {
      if (v !== '' && (!Number.isInteger(v) || v < 1 || v > 5)) throw new Error(`Escala inválida: ${f.l}`);
    } else if (f.t === 'number') {
      if (v !== '' && (!Number.isInteger(v) || v < 0 || v > 9999)) throw new Error(`Número inválido: ${f.l}`);
    } else {
      if (typeof v !== 'string') throw new Error(`Texto inválido: ${f.l}`);
      v = v.trim();
      if (v.length > (f.t === 'textarea' ? 1500 : 200)) throw new Error(`Texto demasiado largo: ${f.l}`);
      if ((f.t === 'select' || f.t === 'radio') && v && !f.o.includes(v)) throw new Error(`Opción inválida: ${f.l}`);
      if (f.t === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('Correo inválido.');
    }
    if (f.req && (v === '' || (Array.isArray(v) && !v.length))) throw new Error(`Falta: ${f.l}`);
    answers[f.id] = v;
  }
  if (form === 'B' && !answers.autoriza && ['persona','cargo','tel','correo'].some(k => answers[k])) throw new Error('Se necesita autorización para guardar el contacto del comprador.');
  if (form === 'A' && answers.contacto && !answers.autoriza) throw new Error('Se necesita autorización para guardar el contacto del stand.');
  return { id, form, por: por.trim(), capture_date, captured_at: new Date(captured_at).toISOString(), registrar_consent: true, schema_version: 1, d: answers };
}
