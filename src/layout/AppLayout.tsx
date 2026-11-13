import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SystemNotice } from '../components/SystemNotice';

export function AppLayout() {
  return (
    <>
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          <SystemNotice />
          <Outlet />
        </main>
      </div>
    </>
  );
}
