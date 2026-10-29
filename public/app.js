import { config } from './config.js';
import { FORMS } from './shared/forms.js';
import { validateRecord, colombiaDay } from './shared/validation.js';
import { toCsv } from './shared/report.js';
import { createRenderer } from './render.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY = 'remedios_pending_v1';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
const ctx = { $, esc, cur: 'A', records: [], switchForm };
const renderer = createRenderer(ctx);
const db = config.key ? window.supabase.createClient(config.url, config.key, {auth:{persistSession:false, detectSessionInUrl:true}}) : null;
let busy = false;
let admin = false;
const drafts = {};
$('#who').value = read('remedios_registrar', '');
$('#captureDate').value = colombiaDay();
$('#captureDate').max = colombiaDay();
$('#who').addEventListener('change', () => {
  try { write('remedios_registrar', $('#who').value.trim()); $('#whoMsg').textContent = 'Guardado en este dispositivo.'; }
  catch { $('#whoMsg').textContent = 'No se pudo recordar el nombre en este dispositivo.'; }
});
function status(text, error = false) { $('#status').textContent = text; $('#status').className = 'status ' + (error ? 'err' : 'okk'); }
function collect() {
  const d = {};
  for (const f of FORMS[ctx.cur].fields) {
    const id = `f_${ctx.cur}_${f.id}`;
    if (f.t === 'checks') d[f.id] = [...document.querySelectorAll(`input[name="${id}"]:checked`)].map(x => x.value);
    else if (f.t === 'radio' || f.t === 'scale') {
      const value = document.querySelector(`input[name="${id}"]:checked`)?.value ?? '';
      d[f.id] = f.t === 'scale' && value !== '' ? Number(value) : value;
    } else if (f.t === 'consent') d[f.id] = document.getElementById(id).checked;
    else { const value = document.getElementById(id).value.trim(); d[f.id] = f.t === 'number' && value !== '' ? Number(value) : value; }
  }
  return d;
}
function restore(d) {
  if (!d) return;
  for (const f of FORMS[ctx.cur].fields) {
    const id = `f_${ctx.cur}_${f.id}`, value = d[f.id];
    if (['checks','radio','scale'].includes(f.t)) document.querySelectorAll(`input[name="${id}"]`).forEach(el => { el.checked = Array.isArray(value) ? value.includes(el.value) : String(value) === el.value; });
    else if (f.t === 'consent') document.getElementById(id).checked = value === true;
    else document.getElementById(id).value = value ?? '';
  }
}
function switchForm(type) {
  if (busy) return;
  drafts[ctx.cur] = collect(); ctx.cur = type;
  $('#formType').value = type; renderer.renderTabs(); renderer.renderForm(); restore(drafts[type]);
}
$('#formType').onchange = e => switchForm(e.target.value);
$('#form').onsubmit = e => { e.preventDefault(); $('#save').click(); };
function pending() {
  const records = read(KEY, []);
  if (!Array.isArray(records)) throw new Error('El almacenamiento de pendientes no es válido.');
  return records;
}
function renderPending() {
  const records = pending(); $('#pendBox').hidden = !records.length;
  $('#pendTxt').textContent = `${records.length} registros pendientes, guardados solo en este dispositivo. No borres los datos del navegador antes de sincronizar.`;
  $('#upPend').hidden = !db; $('#upPend').disabled = busy;
}
async function transmit(record) {
  const response = await fetch(`${config.url}/functions/v1/submit`, {
    method:'POST', headers:{'Content-Type':'application/json','apikey':config.key}, body:JSON.stringify(record), signal:AbortSignal.timeout(15000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo confirmar el envío. Intenta sincronizar de nuevo.');
  if (result.id !== record.id) throw new Error('El servidor no confirmó el registro.');
}
async function sync() {
  if (!db || busy || !navigator.onLine) return;
  busy = true; $('#save').disabled = true; renderPending();
  let error = '';
  try {
    for (const record of pending()) {
      try { await transmit(validateRecord(record)); write(KEY, pending().filter(r => r.id !== record.id)); }
      catch (e) { error = e.message; break; }
    }
  } finally {
    busy = false; $('#save').disabled = false; renderPending();
  }
  status(error || (pending().length ? 'Hay registros pendientes de sincronizar.' : 'Registros confirmados en el servidor.'), Boolean(error));
  if (admin) await loadResults();
}
$('#upPend').onclick = sync;
$('#save').onclick = async () => {
  if (busy) return;
  try {
    const record = validateRecord({ id:crypto.randomUUID(), form:ctx.cur, por:$('#who').value, capture_date:$('#captureDate').value, captured_at:new Date().toISOString(), registrar_consent:$('#registrarConsent').checked, d:collect() });
    // Persist before sending. The same UUID survives network failures and retries.
    write(KEY, [...pending(),record]); drafts[ctx.cur] = null;
    renderer.renderForm(); renderPending(); status('Guardado en este dispositivo; pendiente de confirmación del servidor.');
    await sync();
  } catch (e) { status(e.message, true); }
};
$('#clearF').onclick = () => { if (!busy) { drafts[ctx.cur] = null; renderer.renderForm(); } };
$('#copyPend').onclick = async () => {
  const text = pending().map(r => [`${r.form} · ${FORMS[r.form].name}`, `Registró: ${r.por} · ${r.capture_date}`, ...FORMS[r.form].fields.map(f => `${f.l}: ${Array.isArray(r.d[f.id]) ? r.d[f.id].join(', ') : r.d[f.id]}`)].join('\n')).join('\n\n');
  try { await navigator.clipboard.writeText(text); status('Pendientes copiados. Compártelos solo con el equipo autorizado.'); }
  catch { $('#pendCopy').value = text; $('#pendCopy').hidden = false; $('#pendCopy').focus(); $('#pendCopy').select(); }
};
async function loadResults() {
  if (!admin) return;
  $('#refresh').disabled = true;
  try {
    const records = [];
    for (let offset = 0; ; offset += 500) {
      const {data,error} = await db.from('registros').select('*').order('received_at',{ascending:false}).order('id').range(offset,offset+499);
      if (error) throw error; records.push(...data); if (data.length < 500) break;
    }
    ctx.records = records.map(r => ({...r, fecha:new Date(r.captured_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}));
    renderer.renderResults(); $('#authMsg').textContent = `${records.length} registros consultados. Fechas en hora de Colombia.`;
  } catch { $('#authMsg').textContent = 'No se pudieron consultar los resultados. Intenta actualizar de nuevo.'; }
  finally { $('#refresh').disabled = false; }
}
async function updateAuth(session) {
  admin = false;
  if (session) {
    const {data,error} = await db.from('administradores').select('user_id').eq('user_id',session.user.id).maybeSingle();
    admin = !error && Boolean(data);
  }
  document.querySelectorAll('.admin-only').forEach(el => { el.hidden = !admin; });
  $('#logout').hidden = !session; $('#refresh').hidden = !admin;
  if (admin) await loadResults();
  else {
    ctx.records = []; $('#list').replaceChildren(); $('#kpis').replaceChildren(); $('#hNum').textContent = 'A · B · C'; $('#hSub').textContent = 'Resultados privados';
    if (session) $('#authMsg').textContent = 'Esta cuenta no está autorizada para consultar resultados.';
  }
}
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  if (!db) { $('#authMsg').textContent = 'El acceso se habilitará al completar la configuración.'; return; }
  $('#login').disabled = true;
  try {
    const {error} = await db.auth.signInWithOtp({email:$('#adminEmail').value.trim(), options:{shouldCreateUser:true, emailRedirectTo:new URL('./',location.href).href}});
    $('#authMsg').textContent = error ? 'No se pudo enviar el enlace. El coordinador debe tener una cuenta creada y el correo de acceso configurado en Supabase.' : 'Revisa el correo autorizado y abre el enlace en este dispositivo. Si no llega, comprueba la configuración del remitente.';
  } finally { $('#login').disabled = false; }
};
$('#logout').onclick = async () => { await db.auth.signOut(); await updateAuth(null); $('#authMsg').textContent = 'Sesión cerrada.'; };
$('#refresh').onclick = loadResults;
$('#csv').onclick = () => {
  if (!admin || !ctx.records.length) return;
  const url = URL.createObjectURL(new Blob([toCsv(ctx.records)],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = `remedios_travel_expo_${colombiaDay()}.csv`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
renderer.renderTabs(); renderer.renderForm(); renderPending();
$('#dbNote').textContent = db ? 'Captura pública habilitada. Los resultados y contactos son privados. Sin conexión, los registros quedan pendientes en este dispositivo.' : 'Configuración del servidor pendiente. Puedes capturar y conservar registros en este dispositivo.';
if (db) {
  const {data:{session}} = await db.auth.getSession(); await updateAuth(session);
  db.auth.onAuthStateChange((_event,session) => { setTimeout(()=>updateAuth(session),0); });
  window.addEventListener('online',sync);
  if (pending().length) await sync();
}
