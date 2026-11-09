'use client';

import { useActionState, useEffect, useState, Suspense } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  useEffect(() => {
    if (state?.message) {
      if (state.message === 'Passwords do not match.' || state.message.includes('Password must be') || state.message.includes('Too many') || state.message.includes('Invalid')) {
        toast.error(state.message);
      } else {
        toast.success(state.message);
      }
    }
  }, [state]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Create New Password</h2>
        <p className="text-sm text-gray-500 mt-1">Enter the code sent to {email} and your new password</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.message && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {state.message}
          </div>
        )}

        <input type="hidden" name="email" value={email} />

        <div className="space-y-2">
          <Label htmlFor="code">6-Digit Code</Label>
          <Input 
            id="code" 
            name="code"
            type="text" 
            placeholder="000000" 
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\\D/g, ''))}
            required 
            className="text-center text-xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required />
        </div>
        
        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm transition-colors" disabled={isPending}>
          {isPending ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm text-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
