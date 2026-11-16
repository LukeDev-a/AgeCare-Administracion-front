const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,globals){const scope={exports:{},...globals};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope);return scope.exports;}
function harness(initial,options={}){
 let cursor=0,now=0,id=0;const states=[],timers=new Map(),all=[],cleanups=[];
 const react={useState(v){const i=cursor++;if(!(i in states))states[i]=typeof v==='function'?v():v;return[states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},useRef(v){return react.useState(()=>({current:v}))[0];},useCallback(fn){return react.useState(()=>fn)[0];},useEffect(fn){if(!cleanups.length)cleanups.push(fn());}};
 const api=load('src/hooks/useAutoFilters.ts',{require:()=>react,setTimeout(fn,delay){const task={id:++id,fn,at:now+delay};timers.set(task.id,task);all.push(task);return task.id;},clearTimeout(key){timers.delete(key);}});
 const render=()=>{cursor=0;return api.useAutoFilters(initial,options);};
 function tick(ms){now+=ms;for(const task of [...timers.values()])if(task.at<=now){timers.delete(task.id);task.fn();}}
 return{render,tick,all,unmount(){cleanups.forEach(fn=>fn?.());},api};
}
test('texto espera400ms y combina escritura rápida en una sola aplicación con página1',()=>{
 const h=harness({q:'',state:''},{delayedKeys:['q']});h.render().setPage(3);h.render().setField('q','A');h.tick(200);h.render().setField('q','Ana');
 assert.equal(h.render().draft.q,'Ana');assert.equal(h.render().filters.q,'');assert.equal(h.render().page,3);
 h.tick(399);assert.equal(h.render().filters.q,'');h.tick(1);
 assert.equal(h.render().filters.q,'Ana');assert.equal(h.render().page,1);assert.equal(h.render().pending,false);
});
test('selector aplica inmediatamente el borrador actual y cancela el temporizador anterior',()=>{
 const h=harness({q:'',state:''},{delayedKeys:['q']});h.render().setField('q','Ana');const old=h.all[0];
 h.render().setField('state','active');assert.equal(h.render().filters.q,'Ana');assert.equal(h.render().filters.state,'active');
 h.render().setPage(2);old.fn();assert.equal(h.render().page,2);
});
test('restablecer elimina texto pendiente, vuelve a defaults/página1 e impide reaplicación tardía',()=>{
 const h=harness({q:'',state:'pending'},{delayedKeys:['q']});h.render().setField('state','approved');h.render().setPage(4);h.render().setField('q','Pendiente');
 const old=h.all[0];h.render().reset();old.fn();h.tick(1000);
 assert.equal(JSON.stringify(h.render().draft),JSON.stringify({q:'',state:'pending'}));assert.equal(h.render().filters.q,'');assert.equal(h.render().page,1);
});
test('números incompletos o fuera de rango mantienen consulta válida hasta corregirse',()=>{
 const {integerFilter}=load('src/hooks/useAutoFilters.ts',{require:()=>({})});
 const h=harness({days:'30',state:''},{delayedKeys:['days'],validate:v=>integerFilter(v.days,1,365,'Días')});
 h.render().setPage(2);
 for(const value of ['', '0','366','1.5']){h.render().setField('days',value);h.tick(1000);assert.equal(h.render().filters.days,'30');assert.equal(h.render().page,2);assert.ok(h.render().error);}
 h.render().setField('state','resolved');assert.equal(h.render().filters.state,'');
 h.render().setField('days','7');h.tick(400);assert.equal(h.render().filters.days,'7');assert.equal(h.render().filters.state,'resolved');assert.equal(h.render().page,1);
});
test('abrir un borrador reemplaza filtros de forma inmediata y desmontar cancela callbacks pendientes',()=>{
 const h=harness({q:''},{delayedKeys:['q']});h.render().setField('q','Antigua');h.render().replace({q:'Borrador creado'});h.all[0].fn();assert.equal(h.render().filters.q,'Borrador creado');
 h.render().setField('q','No aplicar');h.unmount();h.all.at(-1).fn();assert.equal(h.render().filters.q,'Borrador creado');
});
test('auditoría valida UUID, fechas y90días antes de consultar sin rechazar filtros vacíos',()=>{
 const {validateAuditFilters}=load('src/lib/filterValidation.ts',{});
 const empty={q:'',actor_id:'',action:'',entity_type:'',entity_id:'',date_from:'',date_to:''};
 assert.equal(validateAuditFilters(empty),'');
 assert.ok(validateAuditFilters({...empty,entity_id:'123'}));
 assert.ok(validateAuditFilters({...empty,date_from:'inválida'}));
 assert.ok(validateAuditFilters({...empty,date_from:'2026-11-16T10:00',date_to:'2026-11-15T10:00'}));
 assert.ok(validateAuditFilters({...empty,date_from:'2026-01-01T10:00',date_to:'2026-11-15T10:00'}));
 assert.equal(validateAuditFilters({...empty,actor_id:'12345678-1234-1234-1234-123456789abc',date_from:'2026-11-01T10:00',date_to:'2026-11-15T10:00'}),'');
});
