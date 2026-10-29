import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { validateRecord } from '../../../public/shared/validation.js';

const allowedOrigins = new Set(['https://julian8811.github.io','https://remedios-travel-expo.vercel.app','http://127.0.0.1:4173','http://localhost:4173']);
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(url,key,{auth:{persistSession:false}});
Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':allowedOrigins.has(origin) ? origin : 'https://julian8811.github.io','Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const reply = (body:unknown, status=200) => new Response(JSON.stringify(body),{status,headers});
  if (origin && !allowedOrigins.has(origin)) return reply({error:'Origen no autorizado.'},403);
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return reply({error:'Método no permitido.'},405);
  if (!req.headers.get('content-type')?.startsWith('application/json')) return reply({error:'Se requiere JSON.'},415);
  try {
    const reader = req.body?.getReader(); let size=0; const chunks:Uint8Array[]=[];
    if (!reader) return reply({error:'Registro vacío.'},400);
    while (true) {
      const {done,value}=await reader.read(); if(done) break;
      size+=value.length; if(size>40000) { await reader.cancel(); return reply({error:'Registro demasiado grande.'},413); }
      chunks.push(value);
    }
    const bytes=new Uint8Array(size); let pos=0; for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
    let record;
    try { record=validateRecord(JSON.parse(new TextDecoder().decode(bytes))); }
    catch(e) { return reply({error:e instanceof Error ? e.message : 'Registro inválido.'},400); }
    // The gateway supplies the forwarded address. Store only a daily salted hash.
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+new Date().toISOString().slice(0,10)+ip));
    const sourceKey=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    const {data:allowed,error:limitError}=await db.rpc('allow_submission',{source_key:sourceKey});
    if(limitError) throw limitError;
    if(!allowed) return reply({error:'Demasiados envíos. Espera diez minutos y sincroniza de nuevo.'},429);
    const {error}=await db.from('registros').insert(record);
    // A duplicate UUID is an acknowledged retry; public callers receive no row data.
    if(error && error.code!=='23505') throw error;
    return reply({id:record.id,confirmed:true});
  } catch { return reply({error:'No se pudo guardar. Conserva el pendiente e intenta nuevamente.'},503); }
});
