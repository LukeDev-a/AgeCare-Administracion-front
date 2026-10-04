import { useEffect, useState } from 'react';
import {
  fetchRecentTickets,
  fetchRolesSummary,
  fetchRolesWeekly,
  fetchSupportSummary,
  fetchTicketsByCategory,
  type RolesSummary,
  type RolesWeekly,
  type SupportSummary,
  type TicketsByCategory,
  type TicketsList,
} from '../../api/usersSupport';
import { KpiCard } from '../../components/KpiCard';
import { fmt, formatDuration, percent } from '../../lib/format';
import { ROLE_META, roleLabel } from '../../lib/roleMeta';
import { TICKET_PRIORITY_META, TICKET_STATUS_META } from '../../lib/ticketMeta';
import { RoleWeeklyChart } from './RoleWeeklyChart';
import { TicketsCategoryChart } from './TicketsCategoryChart';

export function UsuariosPage() {
  const [rolesSummary, setRolesSummary] = useState<RolesSummary | null>(null);
  const [rolesWeekly, setRolesWeekly] = useState<RolesWeekly | null>(null);
  const [supportSummary, setSupportSummary] = useState<SupportSummary | null>(null);
  const [ticketsByCategory, setTicketsByCategory] = useState<TicketsByCategory | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketsList | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRolesSummary(),
      fetchRolesWeekly(),
      fetchSupportSummary(),
      fetchTicketsByCategory(),
      fetchRecentTickets(),
    ])
      .then(([roles, weekly, support, categories, tickets]) => {
        if (cancelled) return;
        setRolesSummary(roles);
        setRolesWeekly(weekly);
        setSupportSummary(support);
        setTicketsByCategory(categories);
        setRecentTickets(tickets);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar usuarios y soporte.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="card">{error}</div>;

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {!rolesSummary && <div className="card">Cargando perfiles...</div>}
        {rolesSummary?.roles.map(role => {
          const meta = ROLE_META[role.role];
          return (
            <div key={role.role} className="kpi" style={{ borderTop: `3px solid ${meta.color}` }}>
              <div className="kpi-label">{meta.name}</div>
              <div className="kpi-value">{fmt(role.active_users)}</div>
              <div className={`kpi-delta ${role.growth_8w >= 0 ? 'up' : 'down'}`}>
                {role.growth_8w >= 0 ? '+' : ''}
                {(role.growth_8w * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% en 8 semanas
              </div>
              <div className="kpi-note">{meta.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Usuarios activos semanales por perfil</div>
              <div className="card-sub">Últimas 8 semanas</div>
            </div>
            <div className="legend">
              {rolesSummary?.roles.map(role => (
                <span key={role.role} className="item">
                  <span className="linekey" style={{ borderColor: ROLE_META[role.role].color }} />
                  {ROLE_META[role.role].name}
                </span>
              ))}
            </div>
          </div>
          <div className="chart-wrap">{rolesWeekly ? <RoleWeeklyChart weekly={rolesWeekly} /> : 'Cargando gráfico...'}</div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Intensidad de uso por perfil</div>
              <div className="card-sub">Media de los últimos 30 días</div>
            </div>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Perfil</th>
                <th className="num">Activos 30 d</th>
                <th className="num">Sesiones / semana</th>
                <th className="num">Duración media</th>
                <th className="num">Retención 30 d</th>
              </tr>
            </thead>
            <tbody>
              {!rolesSummary && (
                <tr>
                  <td colSpan={5}>Cargando perfiles...</td>
                </tr>
              )}
              {rolesSummary?.roles.map(role => {
                const meta = ROLE_META[role.role];
                return (
                  <tr key={role.role}>
                    <td>
                      <span className="swatch" style={{ background: meta.color }} />
                      {meta.name}
                    </td>
                    <td className="num">{fmt(role.active_users)}</td>
                    <td className="num">{role.sessions_per_week.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</td>
                    <td className="num">{formatDuration(role.avg_session_seconds)}</td>
                    <td className="num">{percent(role.retention_30d)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mini-note">Retención 30 d: % de usuarios activos hace 30 días que siguen activos esta semana.</div>
        </div>
      </div>

      <div className="card-head" style={{ margin: '6px 0 12px' }}>
        <div className="card-title" style={{ fontSize: 15 }}>Soporte</div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {!supportSummary && <div className="kpi">Cargando soporte...</div>}
        {supportSummary && (
          <>
            <KpiCard
              label="Tickets abiertos"
              value={fmt(supportSummary.open)}
              deltaText={`${supportSummary.deltas.open_wow >= 0 ? '+' : ''}${fmt(supportSummary.deltas.open_wow)} vs semana anterior`}
              deltaClass={supportSummary.deltas.open_wow > 0 ? 'down' : 'up'}
            />
            <KpiCard
              label="En curso"
              value={fmt(supportSummary.in_progress)}
              deltaText={`${fmt(supportSummary.waiting_user)} esperando al usuario`}
            />
            <KpiCard
              label="Resueltos · 30 d"
              value={fmt(supportSummary.resolved_30d)}
              deltaText={
                supportSummary.deltas.resolved_mom_pct == null
                  ? 'Sin comparación disponible'
                  : `${supportSummary.deltas.resolved_mom_pct >= 0 ? '+' : ''}${(supportSummary.deltas.resolved_mom_pct * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% vs mes anterior`
              }
              deltaClass={supportSummary.deltas.resolved_mom_pct != null && supportSummary.deltas.resolved_mom_pct < 0 ? 'up' : 'down'}
            />
            <KpiCard
              label="Primera respuesta"
              value={`${supportSummary.first_response_hours_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h`}
              deltaText={
                supportSummary.deltas.first_response_mom_hours == null
                  ? 'Sin comparación disponible'
                  : `${supportSummary.deltas.first_response_mom_hours > 0 ? '+' : ''}${supportSummary.deltas.first_response_mom_hours.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h vs mes anterior`
              }
              deltaClass={supportSummary.deltas.first_response_mom_hours != null && supportSummary.deltas.first_response_mom_hours > 0 ? 'down' : 'up'}
              note="Objetivo: < 4 h"
            />
            <KpiCard
              label="Satisfacción (CSAT)"
              value={supportSummary.csat_avg == null ? '—' : `${supportSummary.csat_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} / 5`}
              deltaText={`n = ${fmt(supportSummary.csat_count)} encuestas`}
            />
          </>
        )}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Tickets por categoría</div>
              <div className="card-sub">
                {ticketsByCategory ? `Últimos ${ticketsByCategory.days} días · ${fmt(ticketsByCategory.total)} tickets` : 'Últimos 30 días'}
              </div>
            </div>
          </div>
          <div className="chart-wrap">
            {ticketsByCategory ? <TicketsCategoryChart categories={ticketsByCategory.categories} /> : 'Cargando tickets...'}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Tickets recientes</div>
              <div className="card-sub">Cola de soporte · más nuevos primero</div>
            </div>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Id</th>
                <th>Asunto</th>
                <th>Perfil</th>
                <th>Prioridad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {!recentTickets && (
                <tr>
                  <td colSpan={5}>Cargando tickets...</td>
                </tr>
              )}
              {recentTickets?.items.slice(0, 6).map(ticket => {
                const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
                const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;
                return (
                  <tr key={ticket.number}>
                    <td>#{ticket.number}</td>
                    <td>{ticket.subject}</td>
                    <td>{roleLabel(ticket.requester.role)}</td>
                    <td><span className={`chip ${priority.className}`}>{priority.label}</span></td>
                    <td><span className={`chip ${status.className}`}>{status.icon} {status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}