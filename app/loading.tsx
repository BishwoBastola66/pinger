import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-50 text-gray-500">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-medium">Loading Pingr...</p>
    </div>
  );
}
