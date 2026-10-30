import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchRecentTickets, fetchRolesSummary, fetchRolesWeekly, fetchSupportSummary, fetchTicketsByCategory } from '../../api/usersSupport';
import { KpiCard } from '../../components/KpiCard';
import { fmt, formatDuration, percent } from '../../lib/format';
import { ROLE_META, roleLabel } from '../../lib/roleMeta';
import { TICKET_PRIORITY_META, TICKET_STATUS_META } from '../../lib/ticketMeta';
import { usersSupportDate, weeklyDayLabel, weeklyRangeLabel } from '../../lib/usersSupportMeta';
import { RoleWeeklyChart } from './RoleWeeklyChart';
import { TicketsCategoryChart } from './TicketsCategoryChart';

function useRemote<T>(key: string, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    let cancelled = false;
    load().then(data => { if (!cancelled) setState({ key, data, error: '' }); })
      .catch((error: unknown) => { if (!cancelled) setState({ key, data: null,
        error: error instanceof Error ? error.message : 'No fue posible consultar los datos.' }); });
    return () => { cancelled = true; };
  }, [key, load]);
  return state.key === key ? state : { key, data: null, error: '' };
}

const responseDelta = (value: number | null) => value == null ? 'Sin comparación disponible'
  : `${value > 0 ? '+' : ''}${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h frente a los 30 días anteriores`;
const resolvedDelta = (value: number | null) => value == null ? 'Sin comparación disponible'
  : `${value >= 0 ? '+' : ''}${percent(value)} frente a los 30 días anteriores`;

export function UsuariosPage() {
  const [days, setDays] = useState(30);
  const [weeks, setWeeks] = useState(8);
  const [categoryDays, setCategoryDays] = useState(30);
  const [reload, setReload] = useState(0);
  const rolesLoad = useCallback(() => fetchRolesSummary(days), [days]);
  const weeklyLoad = useCallback(() => fetchRolesWeekly(weeks), [weeks]);
  const categoryLoad = useCallback(() => fetchTicketsByCategory(categoryDays), [categoryDays]);
  const rolesState = useRemote(`roles:${days}:${reload}`, rolesLoad);
  const weeklyState = useRemote(`weekly:${weeks}:${reload}`, weeklyLoad);
  const supportState = useRemote(`support:${reload}`, fetchSupportSummary);
  const categoryState = useRemote(`categories:${categoryDays}:${reload}`, categoryLoad);
  const recentState = useRemote(`recent:${reload}`, fetchRecentTickets);
  const roles = rolesState.data, weekly = weeklyState.data, support = supportState.data;
  const categories = categoryState.data, recent = recentState.data;
  function applyNumber(event: FormEvent<HTMLFormElement>, name: string, setValue: (value: number) => void) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setValue(Number(data.get(name)));
  }
  return <>
    <div className="filter-row">
      <button type="button" className="action-button" onClick={() => setReload(value => value+1)}>Actualizar vista</button>
      <span className="mini-note">Usuarios de la aplicación móvil y atención de soporte.</span>
    </div>
    <section className="card">
      <div className="card-title">Actividad por perfil</div>
      <label>Período de actividad <select value={days} onChange={event => setDays(Number(event.target.value))}>
        <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option>
      </select></label>
      <p className="mini-note">Una cuenta puede tener varios perfiles. No se deben sumar estas cifras como usuarios únicos globales.</p>
      {rolesState.error && <p role="alert">{rolesState.error}</p>}
      {!roles && !rolesState.error && <p>Cargando perfiles...</p>}
      {roles && <>
        <p className="card-sub">Período aplicado: {roles.days} días · Calculado: {usersSupportDate(roles.computed_at)} · Santiago</p>
        {!roles.roles.length && <p>Sin datos de actividad por perfil.</p>}
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>{roles.roles.map(role => <div key={role.role} className="kpi" style={{ borderTop: `3px solid ${ROLE_META[role.role]?.color ?? 'var(--brand)'}` }}>
          <div className="kpi-label">{roleLabel(role.role)} · activos en {roles.days} días</div>
          <div className="kpi-value">{fmt(role.active_users)}</div>
          <div className={`kpi-delta ${role.growth_8w >= 0 ? 'up' : 'down'}`}>{role.growth_8w >= 0 ? '+' : ''}{percent(role.growth_8w)} en 8 semanas</div>
        </div>)}</div>
        <div style={{ overflowX: 'auto' }}><table className="data">
          <thead><tr><th>Perfil</th><th>Activos · {roles.days} días</th><th>Sesiones / semana</th><th>Duración media</th><th>Retención · 30 días</th></tr></thead>
          <tbody>{roles.roles.map(role => <tr key={role.role}><td>{roleLabel(role.role)}</td><td>{fmt(role.active_users)}</td>
            <td>{role.sessions_per_week.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</td><td>{formatDuration(role.avg_session_seconds)}</td><td>{percent(role.retention_30d)}</td></tr>)}</tbody>
        </table></div>
        <p className="mini-note">El crecimiento compara ocho semanas y la retención conserva su ventana de 30 días, aunque cambies el período de actividad.</p>
      </>}
    </section>
    <section className="card">
      <div className="card-title">Usuarios activos semanales por perfil</div>
      <form className="tickets-toolbar" onSubmit={event => applyNumber(event, 'weeks', setWeeks)}>
        <label>Cantidad de semanas a mostrar<input type="number" name="weeks" min={2} max={26} defaultValue={8} required /></label>
        <button type="submit" className="action-button">Consultar semanas</button>
      </form>
      {weeklyState.error && <p role="alert">{weeklyState.error}</p>}
      {!weekly && !weeklyState.error && <p>Cargando actividad semanal...</p>}
      {weekly && <>
        <p className="card-sub">Semanas solicitadas: {weeks} · Disponibles: {weekly.weeks.length} · Calculado: {usersSupportDate(weekly.computed_at)} · Santiago</p>
        {!!weekly.weeks.length && !weekly.week_details && <p className="mini-note">Fechas de las semanas no disponibles.</p>}
        {!!weekly.week_details?.length && weekly.week_details.length === weekly.weeks.length && <>
          <p>Período mostrado: {weeklyDayLabel(weekly.week_details[0].start_date)} al {weeklyDayLabel(weekly.week_details[weekly.week_details.length-1].end_date)}.</p>
          {weekly.week_details.some(period => period.is_current_week) && <p role="status">* Semana en curso · datos parciales.</p>}
          <details><summary>Ver rangos semanales</summary><ul>{weekly.week_details.map(period => <li key={period.start_date}>
            {weeklyRangeLabel(period)}{period.is_current_week ? ' · En curso · datos parciales' : ''}
          </li>)}</ul></details>
        </>}
        <div className="legend">{weekly.series.map(series => <span className="item" key={series.role}><span className="linekey" style={{ borderColor: ROLE_META[series.role]?.color ?? 'var(--ink)' }} />{roleLabel(series.role)}</span>)}</div>
        <RoleWeeklyChart weekly={weekly} />
      </>}
    </section>
    <section className="card">
      <div className="card-title">Resumen de soporte</div>
      {supportState.error && <p role="alert">{supportState.error}</p>}
      {!support && !supportState.error && <p>Cargando resumen de soporte...</p>}
      {support && <>
        <p className="card-sub">Calculado: {usersSupportDate(support.computed_at)} · Santiago</p>
        <h3>Estado actual de la cola</h3>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
          <KpiCard label="Tickets abiertos" value={fmt(support.open)} note="Conteo actual" />
          <KpiCard label="En curso" value={fmt(support.in_progress)} note="Conteo actual" />
          <KpiCard label="Esperando al usuario" value={fmt(support.waiting_user)} note="Conteo actual" />
        </div>
        <h3>Resultados de los últimos 30 días</h3>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
          <KpiCard label="Resueltos · 30 días" value={fmt(support.resolved_30d)} deltaText={resolvedDelta(support.deltas.resolved_mom_pct)} note="Según la fecha de resolución" />
          <KpiCard label="Primera respuesta · promedio" value={`${support.first_response_hours_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h`}
            deltaText={responseDelta(support.deltas.first_response_mom_hours)} note={support.first_response_hours_avg === 0
              ? 'Con este valor no se puede distinguir entre ausencia de respuestas y un promedio de cero horas.' : 'Tickets creados en los últimos 30 días'} />
          <KpiCard label="Satisfacción (CSAT)" value={support.csat_avg == null ? 'Sin datos' : `${support.csat_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} / 5`}
            deltaText={`${fmt(support.csat_count)} encuestas`} note={support.csat_avg == null ? 'Sin encuestas disponibles' : 'Tickets resueltos en los últimos 30 días'} />
        </div>
      </>}
    </section>
    <div className="grid g2">
      <section className="card">
        <div className="card-title">Tickets por categoría</div>
        <form className="tickets-toolbar" onSubmit={event => applyNumber(event, 'days', setCategoryDays)}>
          <label>Últimos días<input type="number" name="days" min={1} max={365} defaultValue={30} required /></label>
          <button type="submit" className="action-button">Consultar categorías</button>
        </form>
        {categoryState.error && <p role="alert">{categoryState.error}</p>}
        {!categories && !categoryState.error && <p>Cargando categorías...</p>}
        {categories && <>
          <p className="card-sub">Últimos {categories.days} días · {fmt(categories.total)} tickets</p>
          {!categories.categories.length ? <p>No hay tickets por categoría para este período.</p> : <>
            <TicketsCategoryChart categories={categories.categories} />
            <table className="data"><thead><tr><th>Categoría</th><th>Tickets</th><th>Porcentaje</th></tr></thead>
              <tbody>{categories.categories.map(category => <tr key={category.category}><td>{category.name}</td><td>{fmt(category.count)}</td><td>{percent(category.share)}</td></tr>)}</tbody>
            </table>
          </>}
        </>}
      </section>
      <section className="card">
        <div className="card-title">Tickets recientes</div><div className="card-sub">Los seis más nuevos de la cola</div>
        {recentState.error && <p role="alert">{recentState.error}</p>}
        {!recent && !recentState.error && <p>Cargando tickets...</p>}
        {recent && !recent.items.length && <p>No hay tickets recientes.</p>}
        <div style={{ overflowX: 'auto' }}><table className="data"><thead><tr><th>Id</th><th>Asunto</th><th>Perfil</th><th>Prioridad</th><th>Estado</th></tr></thead>
          <tbody>{recent?.items.slice(0, 6).map(ticket => {
            const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
            const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;
            return <tr key={ticket.number}><td>#{ticket.number}</td><td>{ticket.subject}</td><td>{ticket.requester.role ? roleLabel(ticket.requester.role) : 'Sin perfil'}</td>
              <td><span className={`chip ${priority.className}`}>{priority.label}</span></td><td><span className={`chip ${status.className}`}>{status.icon} {status.label}</span></td></tr>;
          })}</tbody></table></div>
      </section>
    </div>
  </>;
}
