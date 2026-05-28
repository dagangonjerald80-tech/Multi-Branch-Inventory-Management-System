import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const location = useLocation();
  const emailDebug = location.state?.emailDebug;
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState(params.get('code') || '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  async function handleResend() {
    const finalEmail = email.trim().toLowerCase();
    if (!finalEmail) return;
    setResendMessage('');
    try {
      const res = await api.auth.resendVerification(finalEmail);
      setResendMessage(res.detail || 'Verification email sent.');
    } catch (err) {
      setResendMessage(err.message || 'Could not resend verification email.');
    }
  }

  const handleVerify = useCallback(async (e, targetEmail, targetCode) => {
    if (e) e.preventDefault();
    const finalEmail = (targetEmail || email).trim().toLowerCase();
    const finalCode = (targetCode || code).trim();

    if (!finalEmail || !finalCode) {
      setStatus('error');
      setMessage('Both Email and Code are required.');
      return;
    }

    setLoading(true);
    setStatus('working');
    setMessage('Verifying your account...');

    try {
      const res = await api.auth.verifyEmail(finalEmail, finalCode);
      setStatus('ok');
      setMessage(res.detail || 'Account activated successfully! You can now log in.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  }, [email, code]);

  // Auto-verify if both params are present
  useEffect(() => {
    const e = params.get('email');
    const c = params.get('code');
    if (e && c) {
      handleVerify(null, e, c);
    }
  }, [params, handleVerify]);

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-950">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card p-10 z-10 border border-white/5 relative">
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2 text-center tracking-tight">Verify Account</h1>
        <p className="text-slate-400 text-sm mb-8 text-center font-semibold tracking-wide uppercase">Enter your email and 6-digit code</p>


        {resendMessage && (
          <div className="mb-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 px-5 py-3 text-sm text-blue-300 font-medium">
            {resendMessage}
          </div>
        )}

        {status === 'ok' ? (
          <div className="text-center space-y-6">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 text-sm text-emerald-400 font-medium">
              {message}
            </div>
            <Link 
              to="/login" 
              className="w-full block rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 py-4 font-black text-white shadow-xl shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              PROCEED TO LOGIN
            </Link>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            {status === 'error' && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-sm text-red-400 font-medium">
                {message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-center">Verification PIN</label>
                <input
                  type="text"
                  maxLength={6}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white text-center text-4xl tracking-[0.5em] font-black font-mono focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:bg-white/10 transition-all outline-none shadow-inner"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6 || !email}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 py-4 font-black text-white shadow-xl shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? 'VERIFYING...' : 'ACTIVATE ACCOUNT'}
            </button>

            <p className="text-center text-sm text-slate-400 font-medium">
              Didn't get a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Resend Code
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
