import { useEffect, useState } from 'react';
import { createStaff, deleteStaff, fetchStaff, updateStaff, type StaffAccount, type StaffCreateInput, type StaffFilters, type StaffInput } from '../../api/staff';
import { useAuth } from '../../auth/AuthContext';
import { STAFF_ROLES } from '../../lib/staffMeta';
import { useAutoFilters } from '../../hooks/useAutoFilters';
import { StaffTable } from './StaffTable';
import { StaffForm } from './StaffForm';
import { StaffDeleteDialog } from './StaffDeleteDialog';
import { cancelInvitation, resendInvitation } from '../../api/accountAccess';
import { MfaRecoveryPanel } from './MfaRecoveryPanel';
import { StaffInvitationDialog } from './StaffInvitationDialog';
import { staffStyles as s } from './staffStyles';

const EMPTY: StaffFilters = { q: '', role: '', is_active: '', account_status: '' };
export function StaffPage() {
  const { user, updateProfile } = useAuth();
  const [section, setSection] = useState<'accounts' | 'recovery'>('accounts');
  const { draft, filters, page, setPage, setField, reset } = useAutoFilters(EMPTY, { delayedKeys: ['q'] });
  const [items, setItems] = useState<StaffAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<{ account: StaffAccount | null } | null>(null);
  const [deleting, setDeleting] = useState<StaffAccount | null>(null);
  const [invitation, setInvitation] = useState<{ account: StaffAccount; cancel: boolean } | null>(null);
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
  }, [filters, page, revision, setPage]);
  async function save(input: StaffInput | StaffCreateInput) {
    if (form?.account) {
      const updated = await updateStaff(form.account.id, input);
      if (updated.id === user?.id) updateProfile({ full_name: updated.full_name, email: updated.email });
      setNotice('Cuenta actualizada.');
    } else {
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
  async function invitationAction() {
    if (!invitation) return;
    if (invitation.cancel) await cancelInvitation(invitation.account.id); else await resendInvitation(invitation.account.id);
    setNotice(invitation.cancel ? 'Invitación cancelada. El enlace dejó de funcionar.' : 'Se encoló una nueva invitación. El enlace anterior dejó de funcionar.');
    setInvitation(null); setRevision(value => value + 1);
  }
  return <section aria-label="Cuentas de la consola" className="tw:mx-auto tw:max-w-[1500px] tw:space-y-6">
    <header className={s.panel}><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div className="tw:space-y-2"><p className="tw:text-xs tw:font-bold tw:uppercase tw:tracking-wider tw:text-brand-ink">Accesos del equipo</p><h2 className="tw:text-3xl tw:font-bold tw:tracking-tight">Cuentas de la consola</h2><p className={s.muted}>Gestiona al personal que accede a la consola y su verificación en dos pasos.</p></div>{section === 'accounts' && <button className={`${s.button} ${s.primary}`} type="button" onClick={() => { setNotice(''); setForm({ account: null }); }}>Crear cuenta</button>}</div>
      <nav aria-label="Secciones de cuentas" className={`${s.actions} tw:rounded-xl tw:bg-canvas tw:p-2`}><button type="button" className={`${s.button} ${section === 'accounts' ? s.primary : ''}`} aria-pressed={section === 'accounts'} aria-controls="staff-accounts" onClick={() => setSection('accounts')}>Gestionar cuentas</button><button type="button" className={`${s.button} ${section === 'recovery' ? s.primary : ''}`} aria-pressed={section === 'recovery'} aria-controls="staff-recovery" onClick={() => setSection('recovery')}>Recuperación de MFA</button></nav>
    </header>
    <div id="staff-accounts" hidden={section !== 'accounts'} className="tw:space-y-6">
      {notice && <p role="status" className={`${s.notice} tw:text-positive`}>{notice}</p>}
      <section className={s.panel} aria-label="Buscar cuentas"><div><h3 className={s.heading}>Encuentra una cuenta</h3><p className={s.muted}>Busca por nombre o correo y combina los filtros que necesites.</p></div>
        <div className="tw:grid tw:items-end tw:gap-4 tw:md:grid-cols-2 tw:xl:grid-cols-[2fr_1fr_1.4fr_auto]">
          <label className={s.label}>Nombre o correo<input className={s.field} type="search" placeholder="Ej.: Ana González" maxLength={120} value={draft.q} onChange={event => setField('q', event.target.value)} /></label>
          <label className={s.label}>Rol<select className={s.field} aria-label="Rol" value={draft.role} onChange={event => setField('role', event.target.value)}><option value="">Todos los roles</option>{Object.entries(STAFF_ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={s.label}>Estado de la cuenta<select className={s.field} aria-label="Estado de la cuenta" value={draft.account_status} onChange={event => setField('account_status', event.target.value)}><option value="">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="pending">Pendientes de activación</option><option value="expired">Invitación vencida</option><option value="cancelled">Invitación cancelada</option></select></label>
          <div className={s.actions}><button type="button" className={s.button} onClick={reset}>Restablecer filtros</button></div>
        </div>
      </section>
      <section className={s.panel} aria-label="Listado de cuentas"><div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><div><h3 className={s.heading}>Personal de la consola</h3><p className={s.muted}>{loading ? 'Consultando las cuentas…' : error ? 'No se pudo consultar el listado.' : `${total} cuentas encontradas con los filtros aplicados.`}</p></div><button className={s.button} type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar cuentas</button></div>
        {error ? <div role="alert" className={s.error}><p>{error}</p><button className={`${s.button} tw:mt-3`} onClick={() => setRevision(value => value + 1)}>Reintentar consulta</button></div> : <><StaffTable items={items} loading={loading} currentId={user?.id} busy={!!form || !!deleting || !!invitation} onEdit={account => { setNotice(''); setForm({ account }); }} onDelete={setDeleting} onResend={account => setInvitation({ account, cancel: false })} onCancel={account => setInvitation({ account, cancel: true })} />
          {!loading && <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><p className={s.muted}>Página {page} de {pages} · {total} cuentas</p><div className={s.actions}><button type="button" className={s.button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button type="button" className={s.button} disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>}</>}
      </section>
    </div>
    <div id="staff-recovery" hidden={section !== 'recovery'}><MfaRecoveryPanel mfaEnabled={!!user?.mfa_enabled} /></div>
    {form && <StaffForm account={form.account} currentId={user?.id} onSave={save} onClose={() => setForm(null)} />}
    {deleting && <StaffDeleteDialog account={deleting} onConfirm={remove} onClose={() => setDeleting(null)} />}
    {invitation && <StaffInvitationDialog account={invitation.account} cancel={invitation.cancel} onConfirm={invitationAction} onClose={() => setInvitation(null)} />}
  </section>;
}
