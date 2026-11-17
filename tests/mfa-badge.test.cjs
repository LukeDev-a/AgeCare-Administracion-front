const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,deps={},globals={}){const scope={exports:{},Event,AbortController,Error,require:name=>deps[name]??require(name),...globals};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,scope);return scope.exports;}
const events={MFA_RECOVERY_CHANGED:'changed',MFA_RECOVERY_UPDATED:'updated'};
test('contador recorre páginas, deduplica y excluye decididas, vencidas y la solicitud propia',async()=>{
 const calls=[];const item=(id,status='pending',can_decide=true)=>({id,status,can_decide});
 const api=load('src/api/mfaRecovery.ts',{'./accountAccess':{accessRequest:async(...args)=>{calls.push(args);return args[0].endsWith('page=1')?{total:26,items:[item('a'),item('own','pending',false),item('old','expired'),item('decided','approved')]}:{total:26,items:[item('a'),item('b')]};}}});
 const signal=new AbortController().signal;
 assert.equal(await api.fetchPendingMfaCount(signal),2);assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c[2]===true&&c[3]===signal&&c[4]===true));
});
test('una página fallida no devuelve un contador parcial',async()=>{
 const api=load('src/api/mfaRecovery.ts',{'./accountAccess':{accessRequest:async path=>{if(path.endsWith('page=2'))throw Error('Sin conexión');return{total:26,items:[{id:'a',status:'pending',can_decide:true}]};}}});
 await assert.rejects(api.fetchPendingMfaCount(),/Sin conexión/);
});
test('insignia oculta cero/desconocido y abrevia99+ manteniendo el valor accesible',()=>{
 for(const [count,visible]of [[null,false],[0,false],[2,true],[125,true]]){
  const {MfaRecoveryBadge}=load('src/components/MfaRecoveryBadge.tsx',{react:{useContext:()=>count},'../context/MfaRecoveryCountContext':{MfaRecoveryCountContext:{}}});
  const html=renderToStaticMarkup(React.createElement(MfaRecoveryBadge));assert.equal(!!html,visible);
  if(count===125){assert.match(html,/99\+/);assert.match(html,/125 solicitudes/);}
 }
});
function provider(){
 let actor={id:'admin1',role:'admin',permissions:['staff']},cursor=0,ei=0,interval,timeout;const states=[],previous=[],effects=[],cleanup=[],calls=[];
 const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';
 Object.assign(win,{setInterval:fn=>{interval=fn;return 1;},clearInterval(){interval=undefined;},setTimeout:fn=>{timeout=fn;return 2;},clearTimeout(){timeout=undefined;}});
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect(fn,deps){const i=ei++;if(!previous[i]||deps.some((v,j)=>v!==previous[i][j])){previous[i]=deps;effects.push(()=>{cleanup[i]?.();cleanup[i]=fn();});}}};
 const {MfaRecoveryNotifications}=load('src/components/MfaRecoveryNotifications.tsx',{react,'../auth/AuthContext':{useAuth:()=>({user:actor})},'../api/mfaRecovery':{fetchPendingMfaCount:signal=>new Promise((resolve,reject)=>calls.push({signal,resolve,reject}))},'../context/MfaRecoveryCountContext':{MfaRecoveryCountContext:{Provider:()=>null}},'../lib/mfaRecoveryEvents':events},{window:win,document:doc});
 const render=()=>{cursor=0;ei=0;return MfaRecoveryNotifications({children:'contenido'});};
 return{render,calls,win,doc,interval:()=>interval?.(),timeout:()=>timeout?.(),actor:v=>{actor=v;},async settle(){render();effects.splice(0).forEach(fn=>fn());await new Promise(setImmediate);},unmount(){cleanup.forEach(fn=>fn?.());}};
}
test('solo admin con permiso consulta; cuenta se actualiza por evento, pausa oculta y borra un fallo',async()=>{
 const p=provider();await p.settle();p.calls[0].resolve(3);await new Promise(setImmediate);assert.equal(p.render().props.value,3);
 p.doc.visibilityState='hidden';p.interval();assert.equal(p.calls.length,1);
 p.doc.visibilityState='visible';p.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(p.calls.length,2);
 p.calls[1].reject(Error('Falló'));await new Promise(setImmediate);assert.equal(p.render().props.value,null);
 p.win.dispatchEvent(new Event('changed'));assert.equal(p.calls.length,3);p.calls[2].resolve(1);await new Promise(setImmediate);assert.equal(p.render().props.value,1);
 p.actor({id:'editor',role:'editor',permissions:[]});assert.equal(p.render().props.value,null);await p.settle();p.interval();assert.equal(p.calls.length,3);
 p.unmount();
});
test('cambio durante consulta se vuelve a consultar y una respuesta de otra sesión se descarta',async()=>{
 const p=provider();await p.settle();p.win.dispatchEvent(new Event('changed'));assert.equal(p.calls.length,1);p.calls[0].resolve(2);await new Promise(setImmediate);assert.equal(p.calls.length,2);
 p.actor({id:'admin2',role:'admin',permissions:['staff']});assert.equal(p.render().props.value,null);await p.settle();assert.equal(p.calls[1].signal.aborted,true);
 p.calls[1].resolve(50);p.calls[2].resolve(4);await new Promise(setImmediate);assert.equal(p.render().props.value,4);p.unmount();assert.equal(p.calls[2].signal.aborted,true);
});
