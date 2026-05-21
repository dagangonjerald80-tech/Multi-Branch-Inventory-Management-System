import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: 'dagangonjerald80@gmail.com',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (form.first_name.trim().length < 1 || form.last_name.trim().length < 1) {
      setError('First and last name are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  }

  if (done) {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center px-4 py-12">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />

        <div className="w-full max-w-md glass-card p-10 z-10 border border-white/5 relative text-center">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.5 0l-2.25 1.5" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Check your email</h1>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            We sent a verification code to your email. After verifying, you can sign in and access the dashboard.
          </p>
          <Link to="/login" className="inline-block px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-12">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />

      <div className="w-full max-w-md glass-card p-10 z-10 border border-white/5 relative">
        {/* Subtle top edge glow */}
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

        <h1 className="text-3xl font-black text-white mb-2 text-center tracking-tight">Create Account</h1>
        <p className="text-slate-400 text-sm mb-8 text-center font-semibold tracking-wide uppercase">Register as a standard user</p>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <input
              name="username"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              name="email"
              type="email"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">First Name</label>
              <input
                name="first_name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
                placeholder="First name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Last Name</label>
              <input
                name="last_name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
                placeholder="Last name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              name="password"
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
            <input
              name="password_confirm"
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
              placeholder="••••••••"
              value={form.password_confirm}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 py-4 font-black text-white shadow-xl shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-4"
          >
            REGISTER
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400 font-medium">
          Already have an account?{' '}
          <Link className="font-bold text-blue-400 hover:text-blue-300 transition-colors" to="/login">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
