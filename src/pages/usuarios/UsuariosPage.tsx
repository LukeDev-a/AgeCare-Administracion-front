import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchRecentTickets, fetchRolesSummary, fetchRolesWeekly, fetchSupportSummary, fetchTicketsByCategory } from '../../api/usersSupport';
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
  const [section, setSection] = useState('activity');
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
  return <div className="tw:space-y-7 tw:text-base tw:leading-relaxed tw:text-ink">
    <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
      <div>
        <p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Analítica de la aplicación</p>
        <h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Usuarios y soporte</h1>
        <p className="tw:mt-2 tw:max-w-2xl tw:text-muted">Conoce la actividad de los usuarios de la app móvil y cómo avanza su atención.</p>
      </div>
      <button type="button" className={button} onClick={() => setReload(value => value+1)}><span aria-hidden="true">↻ </span>Actualizar vista</button>
    </header>
    <nav aria-label="Secciones de usuarios y soporte" className="tw:flex tw:flex-wrap tw:gap-2 tw:rounded-2xl tw:bg-canvas tw:p-2">
      {[['activity', 'Actividad de usuarios'], ['support', 'Atención de soporte']].map(([key, label]) => <button
        key={key} type="button" aria-pressed={section === key} aria-controls={`users-${key}`}
        className={`${button} ${section === key ? 'tw:border-brand tw:bg-brand-soft tw:text-brand-ink' : ''}`}
        onClick={() => setSection(key)}>{label}</button>)}
    </nav>
    <div id="users-activity" hidden={section !== 'activity'} className="tw:space-y-7">
    <section className={panel} aria-label="Actividad por perfil" aria-busy={!roles && !rolesState.error}>
      <div className={sectionHead}>
      <div><h2 className={heading}>Actividad por perfil</h2>
      <p className={description}>Consulta cuántas personas usan la app y sus hábitos de uso según su perfil.</p></div>
      <label className={label}>Período de actividad <select className={field} value={days} onChange={event => setDays(Number(event.target.value))}>
        <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option>
      </select></label></div>
      <p className={notice}>Una cuenta puede tener varios perfiles. No se deben sumar estas cifras como usuarios únicos globales.</p>
      {rolesState.error && <p role="alert" className={errorStyle}>{rolesState.error}</p>}
      {!roles && !rolesState.error && <p role="status" className={notice}>Cargando perfiles...</p>}
      {roles && <>
        <p className={description}>Período aplicado: {roles.days} días</p>
        {!roles.roles.length && <p>Sin datos de actividad por perfil.</p>}
        <div className="tw:my-5 tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-4">{roles.roles.map(role => <div key={role.role} className={metric} style={{ borderTop: `3px solid ${ROLE_META[role.role]?.color ?? 'var(--brand)'}` }}>
          <h3 className="tw:font-semibold tw:text-muted">{roleLabel(role.role)}</h3>
          <p className="tw:my-2 tw:text-3xl tw:font-bold tw:tabular-nums">{fmt(role.active_users)}</p>
          <p className="tw:text-sm tw:text-muted">Activos en {roles.days} días</p>
          <p className="tw:mt-3 tw:text-sm tw:font-semibold">{role.growth_8w >= 0 ? '+' : ''}{percent(role.growth_8w)} en 8 semanas</p>
        </div>)}</div>
        <div className={tableWrap}><table className={table}>
          <thead><tr><th>Perfil</th><th>Activos · {roles.days} días</th><th>Sesiones / semana</th><th>Duración media</th><th>Retención · 30 días</th></tr></thead>
          <tbody>{roles.roles.map(role => <tr key={role.role}><td>{roleLabel(role.role)}</td><td>{fmt(role.active_users)}</td>
            <td>{role.sessions_per_week.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</td><td>{formatDuration(role.avg_session_seconds)}</td><td>{percent(role.retention_30d)}</td></tr>)}</tbody>
        </table></div>
        <details className={notice}><summary className="tw:cursor-pointer tw:font-semibold">Cómo interpretar estos indicadores</summary>
          <dl className="tw:mt-4 tw:grid tw:gap-4 tw:sm:grid-cols-2">
            <div><dt className="tw:font-semibold">Sesiones por semana</dt><dd>Promedio de sesiones informado para cada perfil.</dd></div>
            <div><dt className="tw:font-semibold">Duración media</dt><dd>Tiempo promedio que dura una sesión.</dd></div>
            <div><dt className="tw:font-semibold">Retención a 30 días</dt><dd>Mide la continuidad de uso de cada perfil a 30 días.</dd></div>
            <div><dt className="tw:font-semibold">Crecimiento</dt><dd>El crecimiento compara ocho semanas y la retención conserva su ventana de 30 días, aunque cambies el período de actividad.</dd></div>
          </dl>
        </details>
        <Updated value={roles.computed_at} />
      </>}
    </section>
    <section className={panel} aria-label="Usuarios activos semanales por perfil" aria-busy={!weekly && !weeklyState.error}>
      <div className={sectionHead}>
      <div><h2 className={heading}>Usuarios activos semanales por perfil</h2><p className={description}>Compara cómo cambia la actividad de cada perfil de una semana a otra.</p></div>
      <form className={toolbar} onSubmit={event => applyNumber(event, 'weeks', setWeeks)}>
        <label className={label}>Cantidad de semanas a mostrar<input className={field} type="number" name="weeks" min={2} max={26} defaultValue={8} required /><span className="tw:text-sm tw:font-normal tw:text-muted">Entre 2 y 26 semanas</span></label>
        <button type="submit" className={button}>Consultar semanas</button>
      </form></div>
      {weeklyState.error && <p role="alert" className={errorStyle}>{weeklyState.error}</p>}
      {!weekly && !weeklyState.error && <p role="status" className={notice}>Cargando actividad semanal...</p>}
      {weekly && <>
        <p className={description}>Semanas solicitadas: {weeks} · Disponibles: {weekly.weeks.length}</p>
        {!!weekly.weeks.length && !weekly.week_details && <p className="mini-note">Fechas de las semanas no disponibles.</p>}
        {!!weekly.week_details?.length && weekly.week_details.length === weekly.weeks.length && <>
          <p className={notice}>Período mostrado: {weeklyDayLabel(weekly.week_details[0].start_date)} al {weeklyDayLabel(weekly.week_details[weekly.week_details.length-1].end_date)}.</p>
          {weekly.week_details.some(period => period.is_current_week) && <p role="status" className="tw:my-3 tw:text-muted">* Semana en curso · datos parciales.</p>}
          <details className="tw:my-4"><summary className="tw:cursor-pointer tw:font-semibold">Ver rangos semanales</summary><ul className="tw:mt-3 tw:space-y-2">{weekly.week_details.map(period => <li key={period.start_date}>
            {weeklyRangeLabel(period)}{period.is_current_week ? ' · En curso · datos parciales' : ''}
          </li>)}</ul></details>
        </>}
        <div className="tw:my-5 tw:flex tw:flex-wrap tw:gap-x-6 tw:gap-y-3">{weekly.series.map(series => <span className="tw:inline-flex tw:items-center tw:gap-2 tw:font-medium" key={series.role}><span aria-hidden="true" className="tw:h-3 tw:w-3 tw:rounded-full" style={{ backgroundColor: ROLE_META[series.role]?.color ?? 'var(--ink)' }} />{roleLabel(series.role)}</span>)}</div>
        <RoleWeeklyChart weekly={weekly} />
        <Updated value={weekly.computed_at} />
      </>}
    </section>
    </div>
    <div id="users-support" hidden={section !== 'support'} className="tw:space-y-7">
    <section className={panel} aria-label="Resumen de soporte" aria-busy={!support && !supportState.error}>
      <h2 className={heading}>Resumen de soporte</h2>
      <p className={description}>Distingue los casos que necesitan atención ahora de los resultados de los últimos 30 días.</p>
      {supportState.error && <p role="alert" className={errorStyle}>{supportState.error}</p>}
      {!support && !supportState.error && <p role="status" className={notice}>Cargando resumen de soporte...</p>}
      {support && <>
        <h3 className="tw:mb-4 tw:mt-6 tw:text-lg tw:font-semibold">Estado actual de la cola</h3>
        <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3">
          <KpiCard label="Tickets abiertos" value={fmt(support.open)} note="Casos con estado Abierto" />
          <KpiCard label="En curso" value={fmt(support.in_progress)} note="Casos que el equipo está atendiendo" />
          <KpiCard label="Esperando al usuario" value={fmt(support.waiting_user)} note="Casos pendientes de respuesta del solicitante" />
        </div>
        <h3 className="tw:mb-4 tw:mt-7 tw:text-lg tw:font-semibold">Resultados de los últimos 30 días</h3>
        <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3">
          <KpiCard label="Resueltos · 30 días" value={fmt(support.resolved_30d)} deltaText={resolvedDelta(support.deltas.resolved_mom_pct)} note="Según la fecha de resolución" />
          <KpiCard label="Primera respuesta · promedio" value={`${support.first_response_hours_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h`}
            deltaText={responseDelta(support.deltas.first_response_mom_hours)} note={support.first_response_hours_avg === 0
              ? 'Con este valor no se puede distinguir entre ausencia de respuestas y un promedio de cero horas.' : 'Tickets creados en los últimos 30 días'} />
          <KpiCard label="Satisfacción (CSAT)" value={support.csat_avg == null ? 'Sin datos' : `${support.csat_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} / 5`}
            deltaText={`${fmt(support.csat_count)} encuestas`} note={support.csat_avg == null ? 'Sin encuestas disponibles' : 'Tickets resueltos en los últimos 30 días'} />
        </div>
        <Updated value={support.computed_at} />
      </>}
    </section>
    <div className="tw:grid tw:gap-7">
      <section className={panel} aria-label="Tickets por categoría" aria-busy={!categories && !categoryState.error}>
        <h2 className={heading}>Tickets por categoría</h2>
        <p className={description}>Identifica los motivos de consulta más frecuentes en el período elegido.</p>
        <form className={toolbar} onSubmit={event => applyNumber(event, 'days', setCategoryDays)}>
          <label className={label}>Últimos días<input className={field} type="number" name="days" min={1} max={365} defaultValue={30} required /><span className="tw:text-sm tw:font-normal tw:text-muted">Entre 1 y 365 días</span></label>
          <button type="submit" className={button}>Consultar categorías</button>
        </form>
        {categoryState.error && <p role="alert" className={errorStyle}>{categoryState.error}</p>}
        {!categories && !categoryState.error && <p role="status" className={notice}>Cargando categorías...</p>}
        {categories && <>
          <p className={notice}>Últimos {categories.days} días · {fmt(categories.total)} tickets</p>
          {!categories.categories.length ? <p>No hay tickets por categoría para este período.</p> : <>
            <TicketsCategoryChart categories={categories.categories} />
            <div className={tableWrap}><table className={table}><thead><tr><th>Categoría</th><th>Tickets</th><th>Porcentaje</th></tr></thead>
              <tbody>{categories.categories.map(category => <tr key={category.category}><td>{category.name}</td><td>{fmt(category.count)}</td><td>{percent(category.share)}</td></tr>)}</tbody>
            </table></div>
          </>}
        </>}
      </section>
      <section className={panel} aria-label="Tickets recientes" aria-busy={!recent && !recentState.error}>
        <h2 className={heading}>Tickets recientes</h2><p className={description}>Los seis más nuevos de la cola. Para responder o cambiar su estado, entra a Tickets de soporte en el menú.</p>
        {recentState.error && <p role="alert" className={errorStyle}>{recentState.error}</p>}
        {!recent && !recentState.error && <p role="status" className={notice}>Cargando tickets...</p>}
        {recent && !recent.items.length && <p>No hay tickets recientes.</p>}
        <div className={tableWrap}><table className={table}><thead><tr><th>N.º</th><th>Asunto</th><th>Perfil</th><th>Prioridad</th><th>Estado</th></tr></thead>
          <tbody>{recent?.items.slice(0, 6).map(ticket => {
            const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
            const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;
            return <tr key={ticket.number}><td>#{ticket.number}</td><td>{ticket.subject}</td><td>{ticket.requester.role ? roleLabel(ticket.requester.role) : 'Sin perfil'}</td>
              <td><span className={`chip ${priority.className}`}>{priority.label}</span></td><td><span className={`chip ${status.className}`}>{status.icon} {status.label}</span></td></tr>;
          })}</tbody></table></div>
      </section>
    </div>
    </div>
  </div>;
}

function Updated({ value }: { value: string }) {
  return <p className="tw:mt-6 tw:flex tw:flex-wrap tw:gap-x-2 tw:gap-y-1 tw:border-t tw:border-solid tw:border-stroke tw:pt-4 tw:text-sm tw:text-muted">
    Última actualización de los indicadores <strong className="tw:font-semibold tw:text-ink">{usersSupportDate(value)}</strong> <span>(hora de Santiago)</span>
  </p>;
}

function KpiCard({ label, value, note, deltaText }: { label: string; value: string; note?: string; deltaText?: string }) {
  return <div className={metric}><h4 className="tw:font-semibold tw:text-muted">{label}</h4>
    <p className="tw:my-3 tw:text-3xl tw:font-bold tw:tabular-nums">{value}</p>
    {deltaText && <p className="tw:mt-3 tw:text-sm tw:font-medium">{deltaText}</p>}
    {note && <p className="tw:mt-2 tw:text-sm tw:leading-relaxed tw:text-muted">{note}</p>}
  </div>;
}

const panel = 'tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-7';
const heading = 'tw:text-xl tw:font-bold tw:tracking-tight';
const description = 'tw:mb-4 tw:mt-2 tw:max-w-3xl tw:leading-relaxed tw:text-muted';
const metric = 'tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-5';
const sectionHead = 'tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5';
const label = 'tw:grid tw:gap-2 tw:font-semibold';
const field = 'tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:text-base tw:text-ink tw:sm:w-52 tw:focus-visible:outline-2 tw:focus-visible:outline-brand';
const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-base tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const toolbar = 'tw:my-5 tw:flex tw:flex-wrap tw:items-center tw:gap-4';
const notice = 'tw:my-4 tw:rounded-xl tw:bg-canvas tw:p-4 tw:leading-relaxed tw:text-muted';
const errorStyle = 'tw:my-4 tw:rounded-xl tw:bg-warning-bg tw:p-4 tw:text-ink';
const tableWrap = 'tw:my-5 tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke';
const table = 'tw:w-full tw:min-w-[640px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_th]:font-semibold tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5 tw:[&_td]:leading-relaxed';
