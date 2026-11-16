const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
class Values{constructor(values){this.values=values;}get(key){return this.values[key]??null;}}
function load(file,deps={},globals={}){
 const scope={exports:{},AbortController,Error,FormData:Values,require:name=>deps[name]??(name==='./securityStyles'?load('src/pages/acceso/securityStyles.ts'):name==='../../components/PasswordField'?{PasswordField:()=>null}:name==='../../components/Modal'?{Modal:()=>null}:require(name)),...globals};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,scope);return scope.exports;
}
function nodes(n){if(!n||typeof n!=='object')return[];if(Array.isArray(n))return n.flatMap(nodes);return[n,...nodes(n.props?.children)];}
function mount(file,name,deps,props={},globals={}){
 let cursor=0,effectCursor=0;const states=[],effects=[],prev=[],cleanups=[];
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},
 useRef(initial){const i=cursor++;if(!(i in states))states[i]={current:initial};return states[i];},
 useEffect(fn,values){const i=effectCursor++;if(!prev[i]||values.some((v,j)=>v!==prev[i][j])){prev[i]=values;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}};
 const component=load(file,{...deps,react},globals)[name];
 const tree=()=>{cursor=0;effectCursor=0;return component(props);};
 return{tree,nodes:()=>nodes(tree()),async settle(){tree();effects.splice(0).forEach(fn=>fn());await new Promise(setImmediate);}};
}
const modalFile='src/pages/acceso/SecurityActionModal.tsx',pageFile='src/pages/acceso/SecurityPage.tsx';
function event(values){return{preventDefault(){},currentTarget:values};}
const active={mfa_enabled:true,mfa_required:false};

test('verificación muestra solo un método y rechaza falta de prueba o dos códigos antes de enviar',async()=>{
 const calls=[];const modal=mount(modalFile,'SecurityActionModal',{},{
 action:'recovery-codes',status:active,onClose(){},onConfirm:async proof=>calls.push(proof)});
 assert.ok(modal.nodes().some(n=>n.type==='input'&&n.props.name==='otp'));
 assert.ok(!modal.nodes().some(n=>n.type==='input'&&n.props.name==='recovery'));
 modal.nodes().find(n=>n.type==='select').props.onChange({target:{value:'recovery'}});
 assert.ok(!modal.nodes().some(n=>n.type==='input'&&n.props.name==='otp'));
 assert.ok(modal.nodes().some(n=>n.type==='input'&&n.props.name==='recovery'&&n.props.required));
 for(const values of [{password:'Ficticia123'},{password:'Ficticia123',otp:'123456',recovery:'ABC-DEF'}]){
  await modal.nodes().find(n=>n.type==='form').props.onSubmit(event(values));await new Promise(setImmediate);
 }
 assert.equal(calls.length,0);assert.match(modal.tree().props.error,/Usa solo uno/);
 modal.nodes().find(n=>n.type==='form').props.onSubmit(event({password:'Ficticia123',recovery:' ABC-DEF '}));
 await new Promise(setImmediate);assert.equal(calls.length,1);assert.equal(calls[0].recovery_code,'ABC-DEF');assert.equal(calls[0].otp_code,undefined);
});

test('modal bloquea repetición durante envío y conserva error para reintentar',async()=>{
 let fail;let calls=0;
 const modal=mount(modalFile,'SecurityActionModal',{},{
 action:'disable',status:active,onClose(){},onConfirm:()=>{calls++;return new Promise((_,reject)=>{fail=reject;});}});
 const form=()=>modal.nodes().find(n=>n.type==='form');
 form().props.onChange();assert.equal(modal.tree().props.dirty,true);
 form().props.onSubmit(event({password:'Ficticia123',otp:'123456'}));
 form().props.onSubmit(event({password:'Ficticia123',otp:'123456'}));
 assert.equal(calls,1);assert.equal(modal.tree().props.busy,true);
 fail(Error('Código inválido'));await new Promise(setImmediate);
 assert.equal(modal.tree().props.error,'Código inválido');assert.equal(modal.tree().props.busy,false);
 form().props.onSubmit(event({password:'Ficticia123',otp:'654321'}));assert.equal(calls,2);
 fail(Error('Segundo intento ficticio'));await new Promise(setImmediate);
});

test('no permite desactivar MFA obligatorio ni renovar sin autenticador configurado',()=>{
 for(const [action,status] of [['disable',{mfa_enabled:true,mfa_required:true}],['recovery-codes',{mfa_enabled:false,mfa_required:false}],['setup',active]]){
  const modal=mount(modalFile,'SecurityActionModal',{}, {action,status,onConfirm(){throw Error('No debe ejecutarse');},onClose(){}});
  assert.equal(modal.tree(),null);
 }
});

function page(status){
 const calls=[],navigation=[],storage=[],cleared=[];
 function SecurityActionModal(){return null;}function RecoveryCodes(){return null;}
 const mounted=mount(pageFile,'SecurityPage',{
 'react-router-dom':{useNavigate:()=> (...args)=>navigation.push(args)},
 '../../api/accountAccess':{accessRequest:async(path,body,auth)=>{calls.push({path,body,auth});return path==='/auth/me'?status:path.endsWith('/setup')?{enrollment_token:'token-limitado-ficticio'}:{recovery_codes:['CODIGO-FICTICIO']};}},
 '../../api/client':{clearSession:()=>cleared.push(true)},
 '../../components/RecoveryCodes':{RecoveryCodes},'./SecurityActionModal':{SecurityActionModal},
 },{},{sessionStorage:{setItem:(...args)=>storage.push(args)}});
 return{...mounted,calls,navigation,storage,cleared,SecurityActionModal,RecoveryCodes};
}
test('renueva con credenciales en el cuerpo y muestra códigos solo en memoria hasta confirmación',async()=>{
 const p=page(active);await p.settle();assert.equal(p.calls.length,1);
 p.nodes().find(n=>n.type==='button'&&n.props.children==='Renovar códigos de recuperación').props.onClick();
 const proof={password:'Ficticia123',otp_code:'123456'};
 await p.nodes().find(n=>n.type===p.SecurityActionModal).props.onConfirm(proof);
 assert.equal(p.calls[1].path,'/auth/mfa/recovery-codes');assert.equal(p.calls[1].body,proof);assert.equal(p.calls[1].auth,true);
 assert.equal(p.storage.length,0);assert.equal(p.navigation.length,0);
 const codes=p.nodes().find(n=>n.type===p.RecoveryCodes);assert.equal(codes.props.variant,'console');assert.equal(codes.props.codes[0],'CODIGO-FICTICIO');
 codes.props.onDone();assert.ok(!p.nodes().some(n=>n.type===p.RecoveryCodes));
});

test('configurar usa token limitado y desactivar limpia la sesión y vuelve a iniciar sesión',async()=>{
 const setup=page({mfa_enabled:false,mfa_required:true});await setup.settle();
 setup.nodes().find(n=>n.type==='button'&&n.props.children==='Configurar autenticador').props.onClick();
 await setup.nodes().find(n=>n.type===setup.SecurityActionModal).props.onConfirm({password:'Ficticia123'});
 assert.equal(setup.calls[1].path,'/auth/mfa/setup');assert.equal(Object.keys(setup.calls[1].body).join(','),'password');
 assert.deepEqual(setup.storage,[['agecare-mfa-enrollment','token-limitado-ficticio']]);assert.equal(setup.navigation[0][0],'/configurar-mfa');
 const disabled=page(active);await disabled.settle();
 disabled.nodes().find(n=>n.type==='button'&&n.props.children==='Desactivar MFA').props.onClick();
 await disabled.nodes().find(n=>n.type===disabled.SecurityActionModal).props.onConfirm({password:'Ficticia123',recovery_code:'ABC-DEF'});
 assert.equal(disabled.calls[1].path,'/auth/mfa/disable');assert.equal(disabled.cleared.length,1);
 assert.equal(disabled.navigation[0][0],'/login');assert.equal(disabled.navigation[0][1].replace,true);
 const required=page({...active,mfa_required:true});await required.settle();assert.ok(!required.nodes().some(n=>n.type==='button'&&n.props.children==='Desactivar MFA'));
});
