import { useEffect, useMemo, useRef, useState } from 'react';
import { toggleGameAppStatus, type GameAppItem } from '../../api/gamesApps';

interface GamesPreviewPanelProps {
  items: GameAppItem[];
  onChanged: () => void;
}

export function GamesPreviewPanel({ items, onChanged }: GamesPreviewPanelProps) {
  const activos = useMemo(() => items.filter(item => item.is_active), [items]);
  const [selectedId, setSelectedId] = useState<string | null>(activos[0]?.id ?? null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activos.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!activos.find(item => item.id === selectedId)) {
      setSelectedId(activos[0].id);
      setPreviewFailed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activos]);

  useEffect(() => {
    if (menuOpenId === null) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setMenuOpenId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpenId]);

  async function handleSetStatus(item: GameAppItem, activar: boolean) {
    if (item.is_active === activar) {
      setMenuOpenId(null);
      return;
    }
    setTogglingId(item.id);
    try {
      await toggleGameAppStatus(item.id);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible cambiar el estado.');
    } finally {
      setTogglingId(null);
      setMenuOpenId(null);
    }
  }

  const selected = activos.find(item => item.id === selectedId) ?? null;

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="placeholder-box" style={{ padding: 35 }}>No hay juegos ni aplicaciones disponibles.</div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Juegos y aplicaciones</div>
            <div className="card-sub">Selecciona un módulo para verlo abajo. Usa el menú para activarlo o desactivarlo.</div>
          </div>
          <span className="card-sub">{items.length} módulos</span>
        </div>
        <table className="data">
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                className={`ticket-row${selectedId === item.id ? ' selected' : ''}`}
                onClick={() => {
                  setSelectedId(item.id);
                  setPreviewFailed(false);
                }}
              >
                <td style={{ width: 36 }}>{item.item_type === 'game' ? '🎮' : '📱'}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>
                    {item.title} {item.featured && <span style={{ color: 'var(--warn)' }}>★</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{item.category} · {item.slug}</div>
                </td>
                <td className="num">
                  <span className={`chip ${item.is_active ? 'ok' : 'neutral'}`}>
                    {item.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="num dropdown-trigger">
                  <button
                    className="action-button"
                    type="button"
                    disabled={togglingId === item.id}
                    onClick={event => {
                      event.stopPropagation();
                      setMenuOpenId(menuOpenId === item.id ? null : item.id);
                    }}
                  >
                    Estado ▼
                  </button>
                  {menuOpenId === item.id && (
                    <div className="dropdown-menu" onClick={event => event.stopPropagation()}>
                      <button type="button" disabled={item.is_active} onClick={() => void handleSetStatus(item, true)}>
                        Activar
                      </button>
                      <button type="button" disabled={!item.is_active} onClick={() => void handleSetStatus(item, false)}>
                        Desactivar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Previsualizar un módulo activo</div>
            <div className="card-sub">Elige uno de los módulos que los usuarios pueden ver ahora mismo.</div>
          </div>
        </div>
        {activos.length === 0 ? (
          <div className="placeholder-box" style={{ padding: 30 }}>No hay ningún módulo activo. Actívalo desde la lista de arriba.</div>
        ) : (
          <div className="seg" style={{ flexWrap: 'wrap', height: 'auto' }}>
            {activos.map(item => (
              <button
                key={item.id}
                type="button"
                className={selected?.id === item.id ? 'on' : ''}
                onClick={() => {
                  setSelectedId(item.id);
                  setPreviewFailed(false);
                }}
              >
                {item.item_type === 'game' ? '🎮' : '📱'} {item.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        {!selected ? (
          <div className="placeholder-box" style={{ padding: 35 }}>Activa al menos un módulo para ver su vista previa aquí.</div>
        ) : (
          <>
            <div className="card-head">
              <div>
                <div className="card-title">{selected.title}</div>
                <div className="card-sub" style={{ fontFamily: 'monospace' }}>{selected.target_url}</div>
              </div>
              {selected.target_url && (
                <a href={selected.target_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 12 }}>
                  Abrir en pestaña nueva
                </a>
              )}
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: 'var(--bg)', borderRadius: 8, overflow: 'hidden' }}>
              {!selected.target_url ? (
                <div className="placeholder-box" style={{ position: 'absolute', inset: 0 }}>
                  Agrega la URL del módulo para poder previsualizarlo.
                </div>
              ) : previewFailed ? (
                <div className="placeholder-box" style={{ position: 'absolute', inset: 0 }}>
                  Este módulo no permite incrustarse. Ábrelo en una pestaña nueva para revisarlo.
                </div>
              ) : (
                <iframe
                  key={selected.id}
                  src={selected.target_url}
                  title={`Vista previa de ${selected.title}`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  sandbox="allow-scripts allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewFailed(true)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
