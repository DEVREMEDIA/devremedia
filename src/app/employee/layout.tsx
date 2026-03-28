import { Sidebar } from '@/components/employee/sidebar';
import { Header } from '@/components/employee/header';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
