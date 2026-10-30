import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AlertCircle, ArrowUpRight, ExternalLink, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandAppIcon } from '@/components/admin/BrandMark';
import { SITE_HOST, SITE_URL } from '@/components/admin/navConfig';

type AuthErrorLike = { code?: string; message?: string };

const describeAuthError = (code?: string) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return { title: 'Sign-in failed', detail: 'Wrong email or password.', field: true };
    case 'auth/too-many-requests':
      return { title: 'Too many attempts', detail: 'Access is paused for a few minutes. Try again shortly.', field: false };
    case 'auth/network-request-failed':
      return { title: 'Network error', detail: 'Check your connection and try again.', field: false };
    default:
      return { title: 'Sign-in failed', detail: code ?? 'Unknown error, check the console for details.', field: false };
  }
};

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ReturnType<typeof describeAuthError> | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError({ title: 'Missing details', detail: 'Enter both email and password.', field: false });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in');
      navigate('/dashboard');
    } catch (err: unknown) {
      const authError = err as AuthErrorLike;
      console.error('Sign-in failed:', authError.code, authError.message);
      setError(describeAuthError(authError.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border-subtle bg-card lg:flex lg:flex-col lg:justify-between lg:p-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 10% 100%, rgb(255 106 61 / 0.22), transparent 70%)' }}
          aria-hidden="true"
        />
        <BrandAppIcon className="relative h-14 w-14" />
        <div className="relative">
          <h1 className="text-[clamp(3.5rem,5.6vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.05em] text-foreground">
            Your portfolio,
            <br />
            <span className="soft">under control.</span>
          </h1>
          <p className="mt-8 max-w-[30rem] text-[19px] leading-relaxed text-fg-2">
            Projects, writing, events and certificates, edited in one place, live on {SITE_HOST} in seconds.
          </p>
          <p className="meta mt-14">CMS v2 · Firebase Auth</p>
        </div>
      </aside>

      {/* Form */}
      <main className="relative flex min-h-screen flex-col px-5 pb-6 pt-16 sm:px-10 lg:items-center lg:justify-center lg:py-12">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 lg:hidden"
          style={{ background: 'radial-gradient(ellipse 90% 70% at 20% 0%, rgb(255 106 61 / 0.18), transparent 70%)' }}
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[400px] flex-1 lg:flex-none">
          <div className="lg:hidden">
            <BrandAppIcon className="h-[52px] w-[52px]" />
            <h1 className="mt-8 text-[34px] font-medium leading-[1.05] tracking-[-0.03em]">
              Your portfolio,
              <br />
              <span className="soft">under control.</span>
            </h1>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-[34px] font-medium tracking-[-0.03em] text-foreground">Sign in</h2>
            <p className="mt-2 text-[15px] text-fg-2">Only the site owner can access the CMS.</p>
          </div>

          {error && (
            <div role="alert" className="mt-6 flex gap-3 rounded-xl bg-danger-subtle/70 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg" aria-hidden="true" />
              <div>
                <p className="text-sm text-danger-fg">{error.title}</p>
                <p className="mt-0.5 font-mono text-[13px] text-fg-2">{error.detail}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[60px] rounded-xl bg-card px-[18px] text-base md:text-base"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className={error?.field ? 'text-danger-fg' : undefined}>Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error?.field || undefined}
                aria-describedby={error?.field ? 'login-password-error' : undefined}
                className="h-[60px] rounded-xl bg-card px-[18px] text-base md:text-base"
                required
              />
              {error?.field && (
                <p id="login-password-error" className="font-mono text-[13px] text-danger-fg">Wrong email or password</p>
              )}
            </div>

            <Button type="submit" loading={isLoading} className="!mt-7 h-[52px] w-full text-[15px]">
              Sign in <ArrowUpRight aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-6 hidden items-center gap-3 lg:flex" aria-hidden="true">
            <span className="h-px flex-1 bg-border-subtle" />
            <span className="font-mono text-[13px] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border-subtle" />
          </div>
          <a
            href={SITE_URL}
            className="mt-5 hidden items-center justify-center gap-2 text-sm text-fg-2 transition-colors hover:text-foreground lg:flex"
          >
            Back to {SITE_HOST} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="relative mt-10 flex flex-col items-center gap-3 lg:absolute lg:bottom-12 lg:mt-0">
          <a href={SITE_URL} className="flex items-center gap-2 text-sm text-fg-2 hover:text-foreground lg:hidden">
            Back to {SITE_HOST} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <p className="flex items-center gap-2 font-mono text-[13px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Secured by Firebase Authentication
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
