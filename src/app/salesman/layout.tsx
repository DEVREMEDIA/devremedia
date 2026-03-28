import { SalesmanSidebar } from '@/components/salesman/sidebar';
import { SalesmanHeader } from '@/components/salesman/header';

export default function SalesmanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex">
      {/* Sidebar */}
      <SalesmanSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <SalesmanHeader />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
