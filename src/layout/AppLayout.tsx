import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SystemNotice } from '../components/SystemNotice';
import { MfaRecoveryNotifications } from '../components/MfaRecoveryNotifications';

export function AppLayout() {
  return (
    <MfaRecoveryNotifications>
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          <SystemNotice />
          <Outlet />
        </main>
      </div>
    </MfaRecoveryNotifications>
  );
}
