import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const u = username.trim();
    if (u.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      const data = await login(u, password);
      if (!data.user?.is_email_verified) {
        navigate('/pending-verification', { replace: true });
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    }
  }

  return (
    <div className="auth-page w-full flex flex-col md:flex-row min-h-screen">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />

      {/* Wave-2 Background Animation */}
      <div className="wave-wrapper">
        <div className="wave"></div>
        <div className="wave" style={{ left: "100%" }}></div>
      </div>

      {/* LEFT COLUMN: Visual Illustrations (visible on md screens up) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-16 relative overflow-hidden z-10 border-r border-white/5 bg-slate-950/20 backdrop-blur-sm animate-reveal">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="scan-line"></div>

        {/* Branding text top left */}
        <div className="flex items-center gap-3 relative animate-reveal-delay-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-xl font-black text-white tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Multi-Branch Inventory Management System
          </span>
        </div>

        {/* Centerpiece Vector Illustration of Inventory Syncing */}
        <div className="my-auto relative flex flex-col items-center justify-center py-10 animate-reveal-delay-2">
          <div className="w-full max-w-lg aspect-square relative flex items-center justify-center">

            {/* The SVG Artwork representing Centralized Multi-Branch Control */}
            <svg className="w-[85%] h-[85%] z-10" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Central Django Backend Server Hub */}
              <g className="animate-float-1 branch-node">
                <circle cx="300" cy="300" r="70" fill="url(#hubGrad)" className="shadow-2xl" />
                <circle cx="300" cy="300" r="50" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="3" />
                {/* Glowing inner core */}
                <circle cx="300" cy="300" r="20" fill="url(#coreGrad)" />
                {/* Circuit lines inside the core */}
                <path d="M285 300H315M300 285V315" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
                <text x="300" y="385" textAnchor="middle" fill="#93c5fd" className="text-xs font-black tracking-widest uppercase" style={{ fontSize: '11px' }}>DJANGO BACKEND</text>
              </g>

              {/* Branch 1 - North (Store Node) */}
              <g className="animate-float-2 branch-node">
                <circle cx="300" cy="110" r="40" fill="#111827" stroke="#818cf8" strokeWidth="2" />
                {/* Store Icon */}
                <path d="M288 105h24v12H288zM286 117h28v3h-28zM292 98l8-8 8 8z" fill="none" stroke="#a5b4fc" strokeWidth="2" />
                <circle cx="300" cy="110" r="25" fill="#6366f1" fillOpacity="0.1" />
                <text x="300" y="165" textAnchor="middle" fill="#c7d2fe" className="text-xs font-bold" style={{ fontSize: '11px' }}>Manila Branch</text>
              </g>

              {/* Branch 2 - Southwest (Store Node) */}
              <g className="animate-float-3 branch-node">
                <circle cx="130" cy="380" r="40" fill="#111827" stroke="#10b981" strokeWidth="2" />
                {/* Store Icon */}
                <path d="M118 375h24v12h-24zM116 387h28v3h-28zM122 368l8-8 8 8z" fill="none" stroke="#34d399" strokeWidth="2" />
                <circle cx="130" cy="380" r="25" fill="#10b981" fillOpacity="0.1" />
                <text x="130" y="435" textAnchor="middle" fill="#a7f3d0" className="text-xs font-bold" style={{ fontSize: '11px' }}>Cebu Branch</text>
              </g>

              {/* Branch 3 - Southeast (Store Node) */}
              <g className="animate-float-2 branch-node">
                <circle cx="470" cy="380" r="40" fill="#111827" stroke="#f59e0b" strokeWidth="2" />
                {/* Store Icon */}
                <path d="M458 375h24v12h-24zM456 387h28v3h-28zM462 368l8-8 8 8z" fill="none" stroke="#fbbf24" strokeWidth="2" />
                <circle cx="470" cy="380" r="25" fill="#f59e0b" fillOpacity="0.1" />
                <text x="470" y="435" textAnchor="middle" fill="#fde68a" className="text-xs font-bold" style={{ fontSize: '11px' }}>Davao Branch</text>
              </g>

              {/* Glowing Connection Paths (Database syncing arrows) */}
              {/* Hub to Branch 1 */}
              <path d="M300 230 V150" stroke="url(#lineGradBlue)" strokeWidth="3" className="data-stream" />
              {/* Hub to Branch 2 */}
              <path d="M250 270 L170 340" stroke="url(#lineGradGreen)" strokeWidth="3" className="data-stream" />
              {/* Hub to Branch 3 */}
              <path d="M350 270 L430 340" stroke="url(#lineGradOrange)" strokeWidth="3" className="data-stream" />

              {/* Curved Transfer Flow Lines between Branch 1 and 2 */}
              <path d="M160 350 Q 230 200 270 140" stroke="#f43f5e" strokeWidth="2" className="data-stream" strokeOpacity="0.5" />
              <path d="M330 140 Q 370 200 440 350" stroke="#f43f5e" strokeWidth="2" className="data-stream" strokeOpacity="0.5" />
              <path d="M160 390 Q 300 450 440 390" stroke="#f43f5e" strokeWidth="2" className="data-stream" strokeOpacity="0.5" />

              {/* Definitions for gradients */}
              <defs>
                <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="lineGradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
                <linearGradient id="lineGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
                <linearGradient id="lineGradOrange" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
              </defs>
            </svg>

            {/* Glowing dashboard card overlays to simulate inventory operation */}
            <div className="absolute top-[15%] left-[5%] p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-float-2 z-20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Realtime Sync</span>
              </div>
              <p className="text-white text-sm font-bold mt-1">Stock Deducted</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Sale registered in Cebu (Qty -5)</p>
            </div>

            <div className="absolute bottom-[20%] right-[-5%] p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-float-3 z-20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transfer Action</span>
              </div>
              <p className="text-white text-sm font-bold mt-1">Stock Relocated</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Manila to Davao (30 Units)</p>
            </div>

            <div className="absolute bottom-[5%] left-[25%] p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-float-1 z-20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm">⚠️</div>
              <div>
                <p className="text-white text-xs font-bold">Low Stock Warning</p>
                <p className="text-slate-400 text-[10px]">Threshold reached in Davao Branch</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informative description text bottom left */}
        <div className="relative z-10 animate-reveal-delay-2">
          <h2 className="text-2xl font-black text-white mb-2 leading-tight">Multi-Branch Inventory Management
            System</h2>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Monitor real-time product levels across all retail branches, complete secure stock transfers, and process transaction history with one secure dashboard.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: The Login Form Form Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 z-10 relative animate-reveal-left">
        <div className="w-full max-w-md glass-card p-10 border border-white/5 relative">
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

          {/* Branding Logo Icon (Visible only on mobile inside this form) */}
          <div className="flex justify-center mb-6 md:hidden">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2 text-center tracking-tight">Sign In</h1>
          <p className="text-slate-400 text-sm mb-8 text-center font-semibold tracking-wide uppercase">Inventory Dashboard</p>

          {error && (
            <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-sm text-red-400 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 dark:text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  minLength={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 dark:text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 py-4 font-black text-white shadow-xl shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              SIGN IN
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400 font-medium space-y-2">
            <div>
              No account?{' '}
              <Link className="font-bold text-blue-400 hover:text-blue-300 transition-colors" to="/register">
                Register
              </Link>
            </div>
            <div>
              Already have a code?{' '}
              <Link className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors" to="/verify-email">
                Verify Account
              </Link>
            </div>
          </p>
        </div>
      </div>
    </div>
  );
}


