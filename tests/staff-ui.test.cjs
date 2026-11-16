const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,deps={}) {
  const scope={exports:{},AbortController,Error,require:name=>deps[name]??(name==='./staffStyles'?load('src/pages/cuentas/staffStyles.ts'):name==='../../lib/staffMeta'?load('src/lib/staffMeta.ts'):require(name))};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,scope);
  return scope.exports;
}
function hooks(){let cursor=0;const states=[],effects=[];return{reset(){cursor=0;},effects,react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect(fn){effects.push(fn);}}};}
function nodes(n){if(!n||typeof n!=='object')return[];if(Array.isArray(n))return n.flatMap(nodes);return[n,...nodes(n.props?.children)];}
function Modal({children}){return React.createElement('div',null,children);}
const account={id:'self',full_name:'Ana González',email:'ana@example.org',role:'admin',is_active:true,account_status:'active',mfa_required:true,mfa_enabled:true,created_at:'2026-11-01T12:00:00Z',last_login_at:null};

test('edición protege datos sin guardar, conserva valores ante fallo y mantiene bloqueos de cuenta propia',async()=>{
 const state=hooks(),calls=[];
 const {StaffForm}=load('src/pages/cuentas/StaffForm.tsx',{react:state.react,'../../components/Modal':{Modal},'../../api/accountAccess':{fetchStaffPolicy:async()=>({mfa_required_roles:['admin'],allowed_email_domains:['example.org'],invitation_hours:24})}});
 const props={account,currentId:'self',onClose(){},onSave:async body=>{calls.push(body);throw Error('Fallo de guardado');}};
 const render=()=>{state.reset();return StaffForm(props);};
 let tree=render();assert.equal(tree.props.dirty,false);
 state.effects.splice(0).forEach(fn=>fn());await new Promise(r=>setImmediate(r));
 tree=render();const controls=nodes(tree);
 assert.ok(controls.filter(n=>n.type==='select').every(n=>n.props.disabled));
 controls.find(n=>n.type==='input'&&n.props.autoComplete==='name').props.onChange({target:{value:'  Ana actualizada  '}});
 tree=render();assert.equal(tree.props.dirty,true);
 await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 tree=render();assert.equal(tree.props.error,'Fallo de guardado');assert.equal(tree.props.dirty,true);
 assert.equal(nodes(tree).find(n=>n.type==='input'&&n.props.autoComplete==='name').props.value,'  Ana actualizada  ');
 assert.equal(calls[0].full_name,'Ana actualizada');assert.equal(calls[0].role,'admin');
});

test('invitación requiere confirmación y permite reintentar conservando el modal',async()=>{
 const state=hooks();let calls=0;
 const {StaffInvitationDialog}=load('src/pages/cuentas/StaffInvitationDialog.tsx',{react:state.react,'../../components/Modal':{Modal}});
 const props={account,cancel:true,onClose(){},onConfirm:async()=>{calls++;if(calls===1)throw Error('No se pudo cancelar');}};
 const render=()=>{state.reset();return StaffInvitationDialog(props);};
 let tree=render();assert.equal(calls,0);
 await nodes(tree).find(n=>n.type==='button'&&n.props.children==='Confirmar cancelación').props.onClick();
 await new Promise(r=>setImmediate(r));
 tree=render();assert.equal(tree.props.error,'No se pudo cancelar');
 await nodes(tree).find(n=>n.type==='button'&&n.props.children==='Confirmar cancelación').props.onClick();
 await new Promise(r=>setImmediate(r));
 assert.equal(calls,2);
});

test('tabla distingue estado de acceso y MFA, protege autoeliminación y muestra invitaciones según estado',()=>{
 const {StaffTable}=load('src/pages/cuentas/StaffTable.tsx');
 const props={items:[account,{...account,id:'pending',full_name:'Luis Torres',account_status:'pending',is_active:false,mfa_enabled:false,invitation_delivery_status:'queued'}],loading:false,currentId:'self',busy:false,onEdit(){},onDelete(){},onResend(){},onCancel(){}};
 const tree=StaffTable(props),all=nodes(tree),html=renderToStaticMarkup(tree);
 assert.ok(all.find(n=>n.type==='button'&&n.props['aria-label']==='Eliminar cuenta de Ana González').props.disabled);
 assert.equal(all.filter(n=>n.type==='button'&&n.props.children==='Cancelar invitación').length,1);
 assert.match(html,/Pendiente de activación/);assert.match(html,/Correo en cola/);assert.match(html,/Obligatoria · sin configurar/);assert.match(html,/Sin accesos registrados/);
});
