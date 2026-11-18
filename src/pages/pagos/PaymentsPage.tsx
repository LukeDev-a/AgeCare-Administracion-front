import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../components/Modal';
import { useAutoFilters } from '../../hooks/useAutoFilters';
import { CHARGE_LABELS, date, money, paymentSummary, PLANS,
  plusDays, SUBSCRIPTION_LABELS, type Charge, type Subscription, type PaymentData } from './paymentData';
import { paymentColor, paymentStyles as s } from './paymentStyles';
import { fetchPayments, savePaymentOperation } from '../../api/payments';

type Selection = { kind: 'subscriptions' | 'charges'; id: string };
type Intent = 'cancel' | 'extend' | 'refund';
const actionNames = { cancel: 'Cancelar renovación', extend: 'Extender acceso', refund: 'Reembolsar cobro' };

export function PaymentsPage() {
  const { user } = useAuth();
  const [source, setSource] = useState<{ owner: string; data?: PaymentData; error?: string }>({ owner: '' });
  const [attempt, setAttempt] = useState(0);
  const owner = user?.role === 'admin' ? user.id : '';
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    fetchPayments(controller.signal).then(data => {
      if (!controller.signal.aborted) setSource({ owner, data });
    }).catch(e => {
      if (!controller.signal.aborted) setSource({ owner, error: e instanceof Error ? e.message : 'No se pudieron cargar las cuentas.' });
    });
    return () => controller.abort();
  }, [owner, attempt]);
  if (user?.role !== 'admin') return <p role="alert">No tienes permiso para consultar pagos y suscripciones.</p>;
  if (source.owner !== owner || !source.data) return <section className={s.panel}><h1 className="tw:mb-4 tw:text-2xl tw:font-bold">Pagos y suscripciones</h1>{source.owner === owner && source.error
    ? <><p role="alert">{source.error}</p><button type="button" className={`${s.button} tw:mt-4`} onClick={() => { setSource({ owner: '' }); setAttempt(a => a + 1); }}>Reintentar</button></>
    : <p role="status">Cargando suscripciones y cobros…</p>}</section>;
  return <PaymentsWorkspace key={owner} initialData={source.data} />;
}

export function PaymentsWorkspace({ initialData }: { initialData: PaymentData }) {
  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Selection['kind']>('subscriptions');
  const { draft, filters, page, setPage, setField, reset } = useAutoFilters({ q: '', state: '', plan: '' }, { delayedKeys: ['q'] });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  if (user?.role !== 'admin') return <p role="alert">No tienes permiso para consultar pagos y suscripciones.</p>;

  const summary = paymentSummary(data);
  const rows = (tab === 'subscriptions' ? data.subscriptions : data.charges).filter(row =>
    (!filters.state || row.state === filters.state) && (!filters.plan || row.plan === filters.plan)
    && `${row.code || row.id} ${row.name} ${row.email}`.toLocaleLowerCase('es').includes(filters.q.trim().toLocaleLowerCase('es')));
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * 8, currentPage * 8);
  const record = selection?.kind === 'subscriptions' ? data.subscriptions.find(row => row.id === selection.id)
    : data.charges.find(row => row.id === selection?.id);
  const states = tab === 'subscriptions' ? SUBSCRIPTION_LABELS : CHARGE_LABELS;

  function clearIntent() { setIntent(null); setReason(''); setDays('7'); setConfirmed(false); setError(''); }
  function open(next: Selection) { clearIntent(); setSelection(next); }
  async function perform() {
    if (!record || !intent || !confirmed || busy) return;
    setBusy(true); setError('');
    try {
      if (!record.version) throw new Error('Recarga el módulo para obtener la versión vigente del registro.');
      const next = await savePaymentOperation({ type: intent, id: record.id, reason, actor: user?.full_name || 'Administrador', days: Number(days) }, record.version);
      setData(next);
      setNotice(intent === 'cancel' ? 'Renovación cancelada. La cuenta conserva su acceso hasta el fin del período.'
        : intent === 'extend' ? `Acceso extendido ${days} días. Se actualizó la fecha de vencimiento.`
        : 'Reembolso completo registrado. La suscripción conserva su estado.');
      clearIntent();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }

  return <section className="tw:space-y-7 tw:text-base tw:leading-relaxed tw:text-ink">
    <header><p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Gestión de suscripciones</p>
      <h1 className="tw:text-3xl tw:font-bold">Pagos y suscripciones</h1>
      <p className="tw:mt-2 tw:text-muted">Consulta las suscripciones y los cobros. Gestiona renovaciones, extensiones y reembolsos.</p></header>
    <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-4">
      <Metric title="Ingreso mensual recurrente" value={money(summary.mrr)} hint={`${summary.active} suscripciones activas · CLP por mes`} />
      <Metric title="Suscripciones con pago pendiente" value={String(summary.overdue)} hint={`${summary.pending} cobros pendientes`} />
      <Metric title="Aprobación de cobros · 30 días" value={summary.approval === null ? 'Sin datos' : `${summary.approval.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`} hint={`Ingreso neto: ${money(summary.net)}`} />
      <Metric title="Renovaciones · Próximos 7 días" value={String(summary.renewals)} hint={`Importe previsto: ${money(summary.renewalAmount)}`} />
    </div>
    {notice && <p className={s.notice} role="status">{notice}</p>}
    <div className={s.actions} role="group" aria-label="Tipo de registro">
      {(['subscriptions', 'charges'] as const).map(kind => <button key={kind} type="button" className={`${s.tab} ${tab === kind ? s.tabSelected : s.tabIdle}`} aria-pressed={tab === kind}
        onClick={() => { setTab(kind); reset(); setNotice(''); }}>{kind === 'subscriptions' ? 'Suscripciones' : 'Cobros'}</button>)}
    </div>
    <div className={`${s.panel} tw:space-y-5`}>
      <div className="tw:grid tw:items-end tw:gap-4 tw:lg:grid-cols-[2fr_1fr_1fr_auto]">
        <label className={s.label}>Buscar cuenta o registro<input className={s.field} value={draft.q} maxLength={120} placeholder="Nombre, correo o identificador" onChange={e => setField('q', e.target.value)} /></label>
        <label className={s.label}>Estado<select className={s.field} value={draft.state} onChange={e => setField('state', e.target.value)}><option value="">Todos los estados</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className={s.label}>Plan<select className={s.field} value={draft.plan} onChange={e => setField('plan', e.target.value)}><option value="">Todos los planes</option>{PLANS.map(plan => <option key={plan}>{plan}</option>)}</select></label>
        <button className={s.button} type="button" onClick={reset}>Restablecer filtros</button>
      </div>
      <div className={s.scroll}><table className={s.table}><thead><tr><th>Registro</th><th>Cuenta</th><th>Plan</th><th>{tab === 'subscriptions' ? 'Precio mensual' : 'Importe'}</th><th>Estado</th><th>{tab === 'subscriptions' ? 'Fin del período' : 'Fecha del cobro'}</th><th>Acción</th></tr></thead><tbody>
        {visible.map(row => <tr key={row.id}><td>{row.code || row.id}</td><td><p className="tw:font-semibold">{row.name}</p><p className={s.muted}>{row.email}</p></td><td>{row.plan}</td><td>{money('price' in row ? row.price : row.amount)}</td>
          <td><Status record={row} /></td><td>{date('endsAt' in row ? row.endsAt : row.at)}</td><td><button type="button" className={s.button} onClick={() => open({ kind: tab, id: row.id })}>Ver detalle</button></td></tr>)}
      </tbody></table></div>
      {!rows.length && <div className="tw:py-10 tw:text-center"><h2 className="tw:text-xl tw:font-bold">No hay resultados</h2><p className={s.muted}>Prueba con otro nombre, estado o plan.</p></div>}
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><p className={s.muted}>{rows.length} registros</p><div className={s.actions}><button type="button" className={s.button} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage} de {pages}</span><button type="button" className={s.button} disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></div></div>
    </div>
    {record && <Modal title={'price' in record ? 'Gestionar suscripción' : 'Detalle del cobro'} onClose={() => { setSelection(null); clearIntent(); }} dirty={!!intent} busy={busy} error={error}>
      <div className="tw:space-y-5" inert={busy} aria-busy={busy}>
        <div className="tw:flex tw:flex-wrap tw:justify-between tw:gap-3"><div><h3 className="tw:text-2xl tw:font-bold">{record.name}</h3><p className={s.muted}>{record.email} · {record.code || record.id}</p></div><Status record={record} /></div>
        <p className={s.notice}>Cuenta de la aplicación: <strong>{record.name}</strong> · {record.accountActive ? 'Activa' : 'Inactiva'}</p>
        <dl className="tw:grid tw:gap-4 tw:sm:grid-cols-3"><Detail label="Plan" value={record.plan} /><Detail label={'price' in record ? 'Precio por cuenta / mes' : 'Importe del cobro'} value={money('price' in record ? record.price : record.amount)} />
          <Detail label={'endsAt' in record ? 'Fin del período' : 'Fecha del cobro'} value={date('endsAt' in record ? record.endsAt : record.at)} /></dl>
        {'price' in record ? <>
          <p className={s.notice}>{record.state === 'cancelled' ? `La renovación está cancelada. El período de acceso termina el ${date(record.endsAt)}.` : record.state === 'past_due' ? 'Tiene un pago pendiente. Extender la fecha no marca el cobro como pagado.' : 'Se renueva mensualmente al finalizar el período.'}</p>
          {!intent && record.state !== 'cancelled' && <div className={s.actions}><button type="button" className={s.button} onClick={() => setIntent('extend')}>Extender acceso</button><button type="button" className={`${s.button} tw:text-negative`} onClick={() => setIntent('cancel')}>Cancelar renovación</button></div>}
          <section className={s.section}><h4 className="tw:font-bold">Cobros de esta suscripción</h4>{data.charges.filter(c => c.subscriptionId === record.id).map(c => <div key={c.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><p>{c.code || c.id} · {money(c.amount)} · {CHARGE_LABELS[c.state]}</p><button className={s.button} disabled={!!intent} type="button" onClick={() => open({ kind: 'charges', id: c.id })}>Ver cobro</button></div>)}</section>
        </> : <>
          <p className={s.notice}>Un reembolso devuelve el importe completo de este cobro. No cancela la suscripción ni cambia su fecha de acceso.</p>
          {!intent && <div className={s.actions}>{record.state === 'approved' && <button type="button" className={`${s.button} tw:text-negative`} onClick={() => setIntent('refund')}>Reembolsar cobro</button>}<button type="button" className={s.button} onClick={() => open({ kind: 'subscriptions', id: record.subscriptionId })}>Ver suscripción</button></div>}
        </>}
        {intent && <section className={`${s.section} tw:border-brand`} aria-label="Confirmar operación">
          <h4 className="tw:text-xl tw:font-bold">{actionNames[intent]}</h4>
          <p>{intent === 'cancel' ? 'Se detendrá la próxima renovación. La cuenta y los cobros anteriores se conservarán; el acceso continúa hasta el fin del período.' : intent === 'extend' ? 'Añade días al final del período actual, sin generar un cobro ni resolver pagos pendientes.' : `Se registrará un reembolso completo de ${money('amount' in record ? record.amount : 0)}. No se puede repetir sobre el mismo cobro.`}</p>
          {intent === 'extend' && 'endsAt' in record && <><label className={s.label}>Días adicionales (1–90)<input type="number" min={1} max={90} step={1} className={s.field} value={days} onChange={e => { setDays(e.target.value); setConfirmed(false); }} /></label>{Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 90 && <p className={s.notice}>Nueva fecha de fin: <strong>{date(plusDays(record.endsAt, Number(days)))}</strong></p>}</>}
          <label className={s.label}>Motivo de la operación<textarea className={s.field} rows={3} minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explica el motivo (5–500 caracteres)" /></label>
          <label className="tw:flex tw:items-start tw:gap-3"><input type="checkbox" className="tw:mt-1 tw:size-5" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />He revisado la cuenta, el registro y el efecto de esta operación.</label>
          <div className={s.actions}><button type="button" className={s.button} onClick={clearIntent}>Volver al detalle</button><button type="button" className={`${s.button} ${intent === 'extend' ? 'tw:text-brand-ink' : 'tw:text-negative'}`} disabled={!confirmed || reason.trim().length < 5 || reason.trim().length > 500 || (intent === 'extend' && (!Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 90))} onClick={perform}>Confirmar operación</button></div>
        </section>}
        <section className={s.section}><h4 className="tw:font-bold">Movimientos del registro</h4>{record.history.length ? <ol className="tw:space-y-4">{record.history.map((entry, i) => <li key={i} className={s.notice}><p className="tw:font-semibold">{entry.description}</p><p className={s.muted}>{entry.actor} · {date(entry.at)}</p><p className="tw:mt-2 tw:whitespace-pre-wrap tw:break-words">{entry.reason}</p></li>)}</ol> : <p className={s.muted}>Sin cambios administrativos registrados.</p>}</section>
        <details className={s.muted}><summary>Identificador de la cuenta vinculada</summary><p className="tw:mt-2 tw:break-all">{record.userId}</p></details>
      </div>
    </Modal>}
  </section>;
}

function Metric({ title, value, hint }: { title: string; value: string; hint: string }) {
  return <div className={s.panel}><h2 className={s.muted}>{title}</h2><p className="tw:my-3 tw:text-3xl tw:font-bold">{value}</p><p className={s.muted}>{hint}</p></div>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <div className={s.notice}><dt className={s.muted}>{label}</dt><dd className="tw:mt-1 tw:font-semibold">{value}</dd></div>;
}
function Status({ record }: { record: Subscription | Charge }) {
  return <span className={`${s.badge} ${paymentColor(record.state)}`}>{'price' in record ? SUBSCRIPTION_LABELS[record.state] : CHARGE_LABELS[record.state]}</span>;
}
