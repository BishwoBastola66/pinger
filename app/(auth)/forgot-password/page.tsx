'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { requestOTP } from '@/lib/auth/otp-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    
    setIsLoading(true);
    // Security: We don't expose if the email exists, but we do trigger the flow.
    const res = await requestOTP(email, 'reset');
    setIsLoading(false);
    
    if (res.success) {
      toast.success('If an account exists, a reset code has been sent.');
      router.push('/reset-password?email=' + encodeURIComponent(email));
    } else {
      toast.error(res.error || 'Failed to send reset code');
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your email to receive a password reset code</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="you@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        
        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm transition-colors" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Reset Code'}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-gray-500">
        Remembered your password?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
          Sign in
        </Link>
      </div>
    </>
  );
}
