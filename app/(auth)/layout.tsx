import { ReactNode } from 'react';
import { NetworkVisualization } from '@/components/three/NetworkVisualization';
import { Navbar } from '@/components/landing/Navbar';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col">
      {/* 3D Background Spanning Whole Page */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <NetworkVisualization variant="auth" />
      </div>

      {/* Global Landing Navbar */}
      <Navbar minimal={true} />

      {/* Content Layout - 2-column grid on desktop */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 flex-1 w-full min-h-screen">
        {/* Left Pane - Empty to showcase the 3D scene on desktop */}
        <div className="hidden lg:block w-full h-full pointer-events-none" />

        {/* Right Pane - Form Area positioned on the right */}
        <div className="w-full flex flex-col justify-center items-center px-4 py-8 sm:px-8 sm:py-12 lg:p-24 pt-20 sm:pt-24 lg:pt-0 relative z-10 my-auto">
          <div className="w-full max-w-[440px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
