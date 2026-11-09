'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { pingExistingMonitorAction } from '@/lib/monitors/actions';
import { useRouter } from 'next/navigation';

export function InstantPingButton({ monitorId }: { monitorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePing = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await pingExistingMonitorAction(monitorId);
      setResult(res);
      router.refresh();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Ping failed',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 6000);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <Button
        onClick={handlePing}
        disabled={loading}
        variant="outline"
        className="border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 hover:text-blue-900 transition-all font-semibold gap-1.5 shadow-xs"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Pinging...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-blue-600 fill-blue-500" />
            <span>Ping Now</span>
          </>
        )}
      </Button>

      {result && (
        <div
          className={`absolute top-full mt-2 right-0 z-50 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 shadow-md animate-in fade-in slide-in-from-top-1 ${
            result.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
