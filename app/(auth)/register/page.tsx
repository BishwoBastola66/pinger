'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { registerAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Check } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'developer', label: 'Developer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'cto', label: 'CTO / VP of Engineering' },
  { value: 'founder', label: 'Founder / CEO' },
  { value: 'other', label: 'Other' },
];

function RoleSelect() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('developer');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = ROLE_OPTIONS.find((opt) => opt.value === selected) || ROLE_OPTIONS[0];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input type="hidden" name="role" value={selected} />
      <button
        type="button"
        id="role"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex h-10 sm:h-11 w-full items-center justify-between rounded-lg sm:rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur-md px-3.5 py-2 text-sm text-gray-900 shadow-xs transition-all hover:bg-white/80 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left cursor-pointer"
      >
        <span className="truncate font-medium">{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white/95 backdrop-blur-md shadow-xl py-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <ul role="listbox" className="max-h-60 overflow-y-auto py-0.5">
            {ROLE_OPTIONS.map((option) => {
              const isSelected = option.value === selected;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelected(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state]);

  const handleGoogleSignup = () => {
    toast.info('Google OAuth integration coming soon!');
  };

  return (
    <div className="w-full">
      <div className="mb-5 sm:mb-8 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-1 sm:mb-2">Create an account</h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">Start monitoring your services in seconds.</p>
      </div>

      <div className="mb-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleGoogleSignup}
          className="w-full h-10 sm:h-11 text-xs sm:text-sm bg-white/50 backdrop-blur-md hover:bg-white/80 text-gray-700 font-semibold border-gray-200/50 shadow-xs transition-all"
        >
          <GoogleIcon />
          Sign up with Google
        </Button>
      </div>

      <div className="relative flex items-center py-1 mb-4">
        <div className="flex-grow border-t border-gray-300/30"></div>
        <span className="flex-shrink-0 mx-3 text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-gray-300/30"></div>
      </div>

      <form action={formAction} className="space-y-3 sm:space-y-4">
        {state?.message && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-xs sm:text-sm font-medium">
            {state.message}
          </div>
        )}

        <div className="space-y-1 sm:space-y-1.5 text-left">
          <Label htmlFor="name" className="text-xs sm:text-sm text-gray-700 font-semibold">Full Name</Label>
          <Input id="name" name="name" type="text" placeholder="John Doe" required className="h-10 sm:h-11 text-sm bg-white/50 backdrop-blur-md border-gray-200/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg sm:rounded-xl shadow-xs" />
          {state?.errors?.name && (
            <p className="text-xs text-red-500 font-medium">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="space-y-1 sm:space-y-1.5 text-left">
          <Label htmlFor="email" className="text-xs sm:text-sm text-gray-700 font-semibold">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required className="h-10 sm:h-11 text-sm bg-white/50 backdrop-blur-md border-gray-200/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg sm:rounded-xl shadow-xs" />
          {state?.errors?.email && (
            <p className="text-xs text-red-500 font-medium">{state.errors.email[0]}</p>
          )}
        </div>
        
        <div className="space-y-1 sm:space-y-1.5 text-left">
          <Label htmlFor="role" className="text-xs sm:text-sm text-gray-700 font-semibold">Your Role</Label>
          <RoleSelect />
        </div>

        <div className="space-y-1 sm:space-y-1.5 text-left">
          <Label htmlFor="password" className="text-xs sm:text-sm text-gray-700 font-semibold">Password</Label>
          <Input id="password" name="password" type="password" required className="h-10 sm:h-11 text-sm bg-white/50 backdrop-blur-md border-gray-200/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg sm:rounded-xl shadow-xs" />
          {state?.errors?.password && (
            <p className="text-xs text-red-500 font-medium">{state.errors.password[0]}</p>
          )}
        </div>

        <div className="space-y-1 sm:space-y-1.5 text-left">
          <Label htmlFor="confirmPassword" className="text-xs sm:text-sm text-gray-700 font-semibold">Confirm Password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required className="h-10 sm:h-11 text-sm bg-white/50 backdrop-blur-md border-gray-200/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg sm:rounded-xl shadow-xs" />
          {state?.errors?.confirmPassword && (
            <p className="text-xs text-red-500 font-medium">{state.errors.confirmPassword[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-10 sm:h-11 bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] mt-3 sm:mt-4 rounded-lg sm:rounded-xl text-sm sm:text-base" disabled={isPending}>
          {isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-gray-900 hover:text-blue-600 font-bold transition-colors">
          Sign in to your account
        </Link>
      </div>
    </div>
  );
}
