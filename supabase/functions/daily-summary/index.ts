import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { colombiaDay } from '../../../public/shared/validation.js';
import { dayBounds, toCsv, summaryStats } from '../../../public/shared/report.js';
import nodemailer from 'npm:nodemailer@10.3.1';

const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req => {
  const reply=(body:unknown,status=200)=>Response.json(body,{status});
  if(req.method!=='POST') return reply({error:'Method not allowed'},405);
  const secret=req.headers.get('x-cron-secret');
  if(!secret) return reply({error:'Unauthorized'},401);
  const {data:authorized,error:authError}=await db.rpc('authorize_summary',{supplied_secret:secret});
  if(authError || !authorized) return reply({error:'Unauthorized'},401);
  const password=Deno.env.get('GMAIL_APP_PASSWORD');
  if(!password) return reply({status:'disabled',reason:'Configure GMAIL_APP_PASSWORD in Edge Function secrets.'});
  const day=colombiaDay(new Date(Date.now()-86400000));
  const {data:claimed,error:claimError}=await db.rpc('claim_summary',{report_day:day});
  if(claimError) return reply({error:'Cannot claim digest'},503);
  if(!claimed) return reply({status:'already_claimed'});
  try {
    const {start,end}=dayBounds(day); const records=[];
    for(let offset=0;;offset+=500){
      const {data,error}=await db.from('registros').select('*').gte('received_at',start).lt('received_at',end).order('received_at').order('id').range(offset,offset+499);
      if(error) throw error;
      records.push(...data); if(data.length<500) break;
    }
    if(!records.length){
      const {error}=await db.from('summary_runs').update({status:'empty',updated_at:new Date().toISOString()}).eq('report_date',day);
      if(error) throw error; return reply({status:'empty'});
    }
    const stats=summaryStats(records);
    const text=`Remedios en Colombia Travel Expo · ${day}\n\n${stats.total} registros recibidos (hora de Colombia).\nA · Stands: ${stats.byForm.A}\nB · Compradores: ${stats.byForm.B}\nC · Percepción: ${stats.byForm.C}\nInterés medio de compradores: ${stats.buyerInterest}/5\nCompradores con próximo paso: ${stats.nextSteps}\n\nEl CSV adjunto contiene todos los campos de los registros recibidos ese día, incluidos los capturados antes y sincronizados ahora. Manejo exclusivo del coordinador.\nResultados: https://julian8811.github.io/remedios-travel-expo/#admin`;
    const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:'montoya8811@gmail.com',pass:password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
    const result=await transport.sendMail({from:'montoya8811@gmail.com',to:'jose.gomez.lopez@colmayor.edu.co',subject:`Remedios Travel Expo · Recopilación ${day} · ${stats.total} registros`,text,messageId:`<remedios-${day}@gmail.com>`,attachments:[{filename:`remedios_${day}.csv`,content:toCsv(records),contentType:'text/csv; charset=utf-8'}]});
    const {error}=await db.from('summary_runs').update({status:'sent',provider_id:result.messageId,updated_at:new Date().toISOString()}).eq('report_date',day);
    if(error) throw error;
    return reply({status:'sent',id:result.messageId});
  } catch(e) {
    const message=e instanceof Error?e.message:'Digest failed';
    await db.from('summary_runs').update({status:'failed',error:message.slice(0,200),updated_at:new Date().toISOString()}).eq('report_date',day);
    return reply({error:'Digest failed; scheduled retry pending'},503);
  }
});
