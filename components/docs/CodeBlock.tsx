'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CodeBlock({ code, language, title }: { code: string, language?: string, title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-200 my-6 shadow-sm">
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
          <div className="text-xs font-mono text-gray-500 font-semibold">
            {title || language}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}
      <div className="relative">
        {!title && !language && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
        <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-800">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
