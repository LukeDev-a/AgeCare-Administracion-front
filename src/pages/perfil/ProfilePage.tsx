import { useEffect, useState } from 'react';
import { fetchOwnProfile, type OwnProfile } from '../../api/profile';
import { ProfileDetails } from './ProfileDetails';

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

  return <section className="profile-page" aria-label="Mi perfil">
    {error ? <div className="card"><p className="audit-error" role="alert">{error}</p>
      <button className="action-button" type="button" onClick={() => { setError(''); setProfile(null); setAttempt(value => value + 1); }}>Reintentar</button>
    </div> : profile ? <ProfileDetails profile={profile} /> : <div className="card"><p role="status">Cargando tu perfil…</p></div>}
  </section>;
}
