import Link from 'next/link';
import { NotFoundScene } from '@/components/ui/NotFoundScene';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Compass } from 'lucide-react';
import { Activity } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gray-950 text-white selection:bg-blue-500/30">
      {/* 3D Background */}
      <NotFoundScene />

      {/* Foreground Overlay */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 md:p-12 max-w-2xl backdrop-blur-[2px]">
        
        {/* Logo */}
        <div className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Pingr</span>
        </div>

        {/* 404 Content */}
        <div className="inline-flex items-center justify-center p-3 mb-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
          <Compass className="w-6 h-6 text-blue-400" />
        </div>
        
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-200">
          Lost in the void
        </h2>
        
        <p className="text-gray-400 mb-10 max-w-md mx-auto leading-relaxed">
          The endpoint or page you are looking for has drifted into deep space, or it never existed in the first place.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/">
            <Button className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-500/25">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
          <Link href="/docs">
            <Button className="h-12 px-8 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold backdrop-blur-md transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2 text-white" />
              Read the Docs
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Subtle overlay gradients to blend the 3D scene edges */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,#030712_100%)] z-0" />
    </div>
  );
}
