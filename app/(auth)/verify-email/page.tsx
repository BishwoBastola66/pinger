'use client';

import { useActionState, useEffect, useState, Suspense } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyOTP } from '@/lib/auth/otp-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [otpCode, setOtpCode] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) return toast.error('Please enter the 6-digit code');
    
    setIsOtpLoading(true);
    const res = await verifyOTP(email, otpCode, 'verify');
    setIsOtpLoading(false);
    
    if (res.success) {
      toast.success('Email verified successfully!');
      router.push('/dashboard');
    } else {
      toast.error(res.error || 'Invalid code');
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Verify your email</h2>
        <p className="text-sm text-gray-500 mt-1">We sent a verification code to {email}</p>
      </div>

      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp-code">6-Digit Code</Label>
          <Input 
            id="otp-code" 
            type="text" 
            placeholder="000000" 
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\\D/g, ''))}
            required 
            className="text-center text-xl tracking-widest"
          />
        </div>
        
        <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={isOtpLoading}>
          {isOtpLoading ? 'Verifying...' : 'Verify Code'}
        </Button>
      </form>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm text-center">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
