import { useEffect, useState, type FormEvent } from 'react';
import { createStaff, deleteStaff, fetchStaff, updateStaff, type StaffAccount, type StaffCreateInput, type StaffFilters, type StaffInput } from '../../api/staff';
import { useAuth } from '../../auth/AuthContext';
import { STAFF_ROLES } from '../../lib/staffMeta';
import { StaffTable } from './StaffTable';
import { StaffForm } from './StaffForm';
import { StaffDeleteDialog } from './StaffDeleteDialog';
import { cancelInvitation, resendInvitation } from '../../api/accountAccess';

const EMPTY: StaffFilters = { q: '', role: '', is_active: '', account_status: '' };
export function StaffPage() {
  const { user, updateProfile } = useAuth();
  const [draft, setDraft] = useState({ ...EMPTY });
  const [filters, setFilters] = useState({ ...EMPTY });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StaffAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<{ account: StaffAccount | null } | null>(null);
  const [deleting, setDeleting] = useState<StaffAccount | null>(null);
  const [inviting, setInviting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const data = await fetchStaff(filters, page, controller.signal);
        if (!controller.signal.aborted) {
          if (page > 1 && !data.items.length) { setPage(Math.max(1, Math.ceil(data.total / 25))); return; }
          setItems(data.items); setTotal(data.total);
        }
      } catch (exception) {
        if (!controller.signal.aborted) { setItems([]); setError(exception instanceof Error ? exception.message : 'No se pudieron cargar las cuentas.'); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [filters, page, revision]);
  function apply(event: FormEvent) { event.preventDefault(); setPage(1); setFilters({ ...draft }); }
  async function save(input: StaffInput | StaffCreateInput) {
    if (form?.account) {
      const updated = await updateStaff(form.account.id, input);
      if (updated.id === user?.id) updateProfile({ full_name: updated.full_name, email: updated.email });
      setNotice('Cuenta actualizada.');
    }
    else {
      if (!('require_mfa' in input)) throw new Error('Indica la configuración de MFA para la invitación.');
      await createStaff(input); setNotice('Cuenta creada. La invitación quedó en cola para enviarse por correo.');
    }
    setForm(null); setRevision(value => value + 1);
  }
  async function remove() {
    if (!deleting) return;
    await deleteStaff(deleting.id);
    setDeleting(null); setNotice('Cuenta eliminada. El historial de auditoría se conserva.'); setRevision(value => value + 1);
  }
  const pages = Math.max(1, Math.ceil(total / 25));
  async function invitationAction(account: StaffAccount, cancel: boolean) {
    if (inviting) return;
    if (cancel && !window.confirm(`¿Cancelar la invitación de ${account.full_name}? El enlace dejará de funcionar.`)) return;
    setInviting(true); setError(''); setNotice('');
    try {
      if (cancel) await cancelInvitation(account.id); else await resendInvitation(account.id);
      setNotice(cancel ? 'Invitación cancelada.' : 'Se encoló una nueva invitación. El enlace anterior dejó de funcionar.');
      setRevision(value => value + 1);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo gestionar la invitación.'); }
    finally { setInviting(false); }
  }
  return <section aria-label="Cuentas de la consola">
    <div className="card"><div className="card-head"><div><h2 className="card-title">Cuentas de la consola</h2><p className="card-sub">Administra las personas que pueden acceder y sus roles.</p></div><div className="audit-actions"><button className="theme-toggle" type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar</button><button className="action-button" type="button" onClick={() => { setNotice(''); setForm({ account: null }); }}>Crear cuenta</button></div></div>
      <form className="audit-filters" onSubmit={apply}>
        <label>Buscar<input placeholder="Nombre o correo" maxLength={120} value={draft.q} onChange={event => setDraft(value => ({ ...value, q: event.target.value }))} /></label>
        <label>Rol<select value={draft.role} onChange={event => setDraft(value => ({ ...value, role: event.target.value }))}><option value="">Todos</option>{Object.entries(STAFF_ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Estado<select value={draft.account_status} onChange={event => setDraft(value => ({ ...value, account_status: event.target.value }))}><option value="">Todos</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="pending">Pendientes de activación</option><option value="expired">Invitación vencida</option><option value="cancelled">Invitación cancelada</option></select></label>
        <div className="audit-actions"><button type="submit" className="action-button">Aplicar</button><button type="button" className="theme-toggle" onClick={() => { setDraft({ ...EMPTY }); setFilters({ ...EMPTY }); setPage(1); }}>Limpiar</button></div>
      </form>
    </div>
    {error && <p role="alert" className="audit-error">{error}</p>}{notice && <p role="status" className="staff-notice">{notice}</p>}
    <div className="card"><StaffTable items={items} loading={loading} currentId={user?.id} busy={!!form || !!deleting || inviting} onEdit={account => { setNotice(''); setForm({ account }); }} onDelete={setDeleting} onResend={account => void invitationAction(account, false)} onCancel={account => void invitationAction(account, true)} />
      <div className="audit-pagination"><span>{total} cuentas</span><div className="audit-actions"><button type="button" className="theme-toggle" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className="theme-toggle" disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    </div>
    {form && <StaffForm account={form.account} currentId={user?.id} onSave={save} onClose={() => setForm(null)} />}
    {deleting && <StaffDeleteDialog account={deleting} onConfirm={remove} onClose={() => setDeleting(null)} />}
  </section>;
}
