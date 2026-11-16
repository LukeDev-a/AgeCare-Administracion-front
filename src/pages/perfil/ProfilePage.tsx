import { useEffect, useState } from 'react';
import { fetchOwnProfile, type OwnProfile } from '../../api/profile';
import { ProfileDetails } from './ProfileDetails';
import { profileStyles as s } from './profileStyles';

export function ProfilePage() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchOwnProfile(controller.signal).then(result => {
      if (!controller.signal.aborted) setProfile(result);
    }).catch(exception => {
      if (!controller.signal.aborted) setError(exception instanceof Error ? exception.message : 'No se pudo cargar tu perfil.');
    });
    return () => controller.abort();
  }, [attempt]);
  function reload() { setError(''); setProfile(null); setAttempt(value => value + 1); }

  return <section className="tw:mx-auto tw:max-w-6xl tw:space-y-6" aria-label="Mi perfil">
    <header className={s.panel}><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div className="tw:space-y-2"><p className="tw:text-xs tw:font-bold tw:uppercase tw:tracking-wider tw:text-brand-ink">Mi cuenta</p><h2 className="tw:text-3xl tw:font-bold tw:tracking-tight">Mi perfil</h2><p className={s.muted}>Consulta tus datos, los módulos disponibles y la seguridad de tu acceso.</p></div><button className={s.button} type="button" disabled={!profile && !error} onClick={reload}>Actualizar perfil</button></div></header>
    {error ? <div className={s.panel}><div role="alert" className="tw:space-y-2 tw:rounded-xl tw:bg-warning-bg tw:p-4"><h3 className="tw:font-semibold">No pudimos cargar tu perfil</h3><p className={s.muted}>{error}</p></div><button className={`${s.button} ${s.primary}`} type="button" onClick={reload}>Reintentar</button></div>
      : profile ? <ProfileDetails profile={profile} /> : <div className={s.panel}><p role="status" className={`${s.muted} tw:flex tw:items-center tw:gap-3`}><span aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Cargando tu perfil…</p></div>}
  </section>;
}
