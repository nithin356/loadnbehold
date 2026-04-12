import { Sidebar, AdminTopBar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <AdminTopBar />
          <main className="flex-1 p-6 max-w-[1600px]">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
