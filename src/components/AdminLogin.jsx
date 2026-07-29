import { useState } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AdminLogin() {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      // AuthContext provides the user-facing error.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f3fb] px-6 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-[28px] border border-purple-100 bg-white p-8 shadow-[0_24px_80px_rgba(83,54,112,0.14)]">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-purple-600">
          BLOM Cosmetics
        </p>
        <h1 className="mt-2 text-center font-serif text-3xl text-slate-900">Admin sign in</h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-500">
          Use the owner or staff account connected to the BLOM store.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            />
          </label>

          {authError?.message && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {authError.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Sign in securely
          </button>
        </form>
      </section>
    </main>
  );
}
