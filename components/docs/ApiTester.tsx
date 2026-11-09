'use client';

import { useState } from 'react';
import { Play, Loader2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ApiTester() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; data: any } | null>(null);

  const handleTest = async () => {
    if (!apiKey) return;
    setLoading(true);
    setResponse(null);
    try {
      // Use the production API domain as requested
      const res = await fetch('https://api.pingr.site/api/v1/monitors', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (err) {
      setResponse({ status: 0, data: { error: 'Network error or CORS failure' } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Play className="w-4 h-4 text-blue-500" />
        Live API Tester
      </h4>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Test the <code className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">GET /api/v1/monitors</code> endpoint live. Paste your Workspace API key below.
      </p>
      
      <div className="space-y-3">
        <div className="relative">
          <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            type="password" 
            placeholder="pinger_..." 
            className="pl-9 text-xs font-mono bg-white shadow-sm"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleTest} 
          disabled={!apiKey || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm font-medium transition-all shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Send Request'}
        </Button>
      </div>

      {response && (
        <div className="mt-5 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600">Response</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              response.status >= 200 && response.status < 300 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {response.status === 0 ? 'ERROR' : `${response.status} STATUS`}
            </span>
          </div>
          <pre className="p-3 text-[11px] font-mono text-gray-800 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
