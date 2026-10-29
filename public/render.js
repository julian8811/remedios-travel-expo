import {FORMS} from "./shared/forms.js";
export function createRenderer(ctx){
const {$,esc}=ctx; const ORDER=["A","B","C"],COLS={A:"var(--teal)",B:"var(--oro)",C:"var(--naranja)"};
function renderTabs(){$("#tabs").innerHTML=ORDER.map(function(k){return '<button type="button" role="tab" aria-selected="'+(k===ctx.cur)+'" data-k="'+k+'"><b>'+k+' · '+FORMS[k].name+'</b><span>'+FORMS[k].short+'</span></button>';}).join("");
 Array.prototype.forEach.call($("#tabs").children,function(b){b.onclick=function(){ctx.switchForm(b.dataset.k);};});}
function renderForm(){var F=FORMS[ctx.cur],h="";
 F.fields.forEach(function(f){var id="f_"+ctx.cur+"_"+f.id,req=f.req?' <span class="req">*</span>':"";
  if(f.t==="consent"){h+='<div class="q"><label class="consent"><input type="checkbox" id="'+id+'"><span>'+esc(f.l)+'</span></label></div>';return;}
  h+='<div class="q"><label class="lab" '+(["checks","radio","scale"].indexOf(f.t)<0?'for="'+id+'"':'')+'>'+esc(f.l)+req+'</label>'+(f.help?'<span class="help">'+esc(f.help)+'</span>':'');
  if(f.t==="textarea")h+='<textarea id="'+id+'" maxlength="1500" placeholder="'+esc(f.ph||"")+'"></textarea>';
  else if(f.t==="select")h+='<select id="'+id+'"><option value="">Elegir…</option>'+f.o.map(function(o){return '<option>'+esc(o)+'</option>';}).join("")+'</select>';
  else if(f.t==="checks"||f.t==="radio")h+='<div class="opts" role="group" aria-label="'+esc(f.l)+'">'+f.o.map(function(o,i){return '<label><input type="'+(f.t==="checks"?"checkbox":"radio")+'" name="'+id+'" value="'+esc(o)+'" id="'+id+'_'+i+'">'+esc(o)+'</label>';}).join("")+'</div>';
  else if(f.t==="scale")h+='<div class="scale" role="radiogroup" aria-label="'+esc(f.l)+'">'+[1,2,3,4,5].map(function(n){return '<label><input type="radio" name="'+id+'" value="'+n+'" id="'+id+'_'+n+'">'+n+'</label>';}).join("")+'</div><div class="scale-cap"><span>1 · '+esc(f.cap[0])+'</span><span>5 · '+esc(f.cap[1])+'</span></div>';
  else h+='<input type="'+(f.t==="number"?"number":f.t)+'" id="'+id+'" maxlength="200" '+(f.t==="number"?'min="0" max="9999" inputmode="numeric"':'')+(f.t==="tel"?' inputmode="tel"':'')+' placeholder="'+esc(f.ph||"")+'">';
  h+='</div>';});
 $("#form").innerHTML=h;$("#status").textContent="";}

function count(arr,key){var m={};arr.forEach(function(r){(r.d[key]||[]).forEach(function(v){m[v]=(m[v]||0)+1;});});return Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1];});}
function bars(el,data,max){if(!data.length){el.innerHTML='<p class="empty">Todavía sin respuestas.</p>';return;}var mx=Math.max.apply(null,data.map(function(d){return d[1];}));
 el.innerHTML=data.slice(0,max||8).map(function(d){return '<div class="row"><div class="lb">'+esc(d[0])+'</div><div class="track"><div class="fill" style="width:'+(100*d[1]/mx)+'%"></div></div><div class="v">'+d[1]+'</div></div>';}).join("");}
function avg(a){return a.length?(a.reduce(function(s,x){return s+x;},0)/a.length):null;}
function renderResults(){var R=ctx.records,by={A:[],B:[],C:[]};R.forEach(function(r){if(by[r.form])by[r.form].push(r);});
 $("#hNum").textContent=R.length;$("#hSub").textContent=by.A.length+" stands · "+by.B.length+" compradores · "+by.C.length+" entrevistas";
 var iB=avg(by.B.map(function(r){return +r.d.interes||0;}).filter(Boolean)),iC=avg(by.C.map(function(r){return +r.d.viajaria||0;}).filter(Boolean)),
  noC=by.C.filter(function(r){return r.d.conoce==="No";}).length,pasos=by.B.filter(function(r){return r.d.paso&&r.d.paso!=="Ninguno por ahora";}).length;
 var K=[["var(--teal)",by.A.length,"stands de otros destinos analizados"],["var(--oro)",pasos+" de "+by.B.length,"compradores con un próximo paso acordado"+(iB?" · interés medio "+iB.toFixed(1)+"/5":"")],
  ["var(--naranja)",by.C.length?Math.round(100*noC/by.C.length)+" %":"—","del público entrevistado no ha oído de Remedios"],["var(--petroleo)",iC?iC.toFixed(1)+"/5":"—","probabilidad media de viajar a Remedios"]];
 $("#kpis").innerHTML=K.map(function(k){return '<div class="kpi" style="--c:'+k[0]+'"><b>'+k[1]+'</b><span>'+k[2]+'</span></div>';}).join("");
 var people=Object.create(null);R.forEach(function(r){var p=r.por||"Sin nombre";people[p]=people[p]||{A:0,B:0,C:0,days:{}};people[p][r.form]++;});
 var ps=Object.keys(people).sort();
 $("#tWho").innerHTML='<thead><tr><th>Persona</th><th class="n">A · Stands</th><th class="n">B · Compradores</th><th class="n">C · Entrevistas</th><th class="n">Total</th></tr></thead><tbody>'+
  (ps.length?ps.map(function(p){var x=people[p];return '<tr><td class="it">'+esc(p)+'</td><td class="n">'+x.A+'</td><td class="n">'+x.B+'</td><td class="n">'+x.C+'</td><td class="n"><b>'+(x.A+x.B+x.C)+'</b></td></tr>';}).join(""):'<tr><td colspan="5" class="empty">Aún no hay registros compartidos.</td></tr>')+'</tbody>';
 bars($("#bProd"),count(by.B.concat(by.C),"prod"));
 bars($("#bBar"),count(by.C,"frena"));
 bars($("#bNeed"),count(by.B,"necesita"));
 var ideas=by.A.filter(function(r){return r.d.idea;}).slice(0,8);
 $("#ideas").innerHTML=ideas.length?'<ol class="recs">'+ideas.map(function(r){return '<li><b>'+esc(r.d.exp)+':</b> '+esc(r.d.idea)+'</li>';}).join("")+'</ol>':'<p class="empty">Todavía sin ideas registradas.</p>';
 renderList();}
function renderList(){var R=RECS;
 if(!R.length){$("#list").innerHTML='<div class="card"><p class="empty">Aquí aparecerán los registros a medida que la delegación los guarde.</p></div>';return;}
 $("#list").innerHTML=ORDER.map(function(k){var rs=R.filter(function(r){return r.form===k;});if(!rs.length)return "";
  return '<div class="card" style="margin-bottom:14px;border-top:4px solid '+COLS[k]+'"><h3>'+k+' · '+FORMS[k].name+' <span class="tag t-ok">'+rs.length+'</span></h3>'+rs.map(function(r){
   var F=FORMS[k],t=r.d[F.title]||"(sin título)";
   return '<details class="rec"><summary><b>'+esc(t)+'</b><span>'+esc(r.por||"")+' · '+esc(r.fecha||"")+'</span></summary><dl>'+F.fields.map(function(f){var v=r.d[f.id];if(v===""||v==null||(Array.isArray(v)&&!v.length))return "";if(f.t==="consent")v=v?"Sí":"No";return '<dt>'+esc(f.l)+'</dt><dd>'+esc(Array.isArray(v)?v.join(", "):v)+'</dd>';}).join("")+'</dl></details>';}).join("")+'</div>';}).join("");}

return {renderTabs,renderForm,renderResults};
}
