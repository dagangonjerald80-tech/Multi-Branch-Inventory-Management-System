import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function PendingVerification() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleVerifyCode(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setVerifying(true);
    try {
      const target = (email || user?.email || '').trim().toLowerCase();
      const res = await api.auth.verifyEmail(target, code);
      setMsg(res.detail || 'Verified!');
      // Refresh profile to update UI state
      const me = await refreshProfile();
      if (me?.is_email_verified) {
        navigate('/', { replace: true });
      }
    } catch (e) {
      setErr(e.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const target = (email || user?.email || '').trim().toLowerCase();
      if (!target) {
        setErr('Email is required.');
        return;
      }
      const res = await api.auth.resendVerification(target);
      setMsg(res.detail || 'Code sent to your email.');
    } catch (e) {
      setErr(e.message || 'Could not resend.');
    }
  }

  async function handleRecheck() {
    setErr('');
    const me = await refreshProfile();
    if (me?.is_email_verified) {
      navigate('/', { replace: true });
    } else {
      setErr('Still not verified. Enter the 6-digit code from your email.');
    }
  }

  const [showEdit, setShowEdit] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  async function handleChangeEmail(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await api.auth.changeEmail(newEmail);
      setMsg(res.detail || 'Email updated.');
      setShowEdit(false);
      await refreshProfile();
    } catch (e) {
      setErr(e.message || 'Failed to update email.');
    }
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-md glass-card p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">Verify your email</h1>
        
        {showEdit ? (
          <form onSubmit={handleChangeEmail} className="space-y-4 mb-6">
            <p className="text-slate-600 text-sm mb-4 text-center">Update your account email address:</p>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter correct email"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all"
              >
                Update & Send
              </button>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-slate-700 text-sm font-bold hover:bg-white/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-slate-600 text-sm mb-6 text-center leading-relaxed">
              Enter the 6-digit code sent to <br/>
              <strong className="text-slate-900">{user?.email}</strong>.
              <button 
                onClick={() => {
                  setNewEmail(user?.email || '');
                  setShowEdit(true);
                }}
                className="ml-2 text-blue-600 hover:underline text-xs font-bold"
              >
                Change email?
              </button>
            </p>

            {msg && <div className="text-sm text-green-700 mb-6 bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center font-medium">{msg}</div>}
            {err && <div className="text-sm text-red-700 mb-6 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center font-medium">{err}</div>}

            <form onSubmit={handleVerifyCode} className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 text-center uppercase tracking-wider">Verification Code</label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-5 text-center text-4xl tracking-[0.5em] font-bold font-mono focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="w-full rounded-xl bg-blue-600 py-4 text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 transition-all transform active:scale-[0.98]"
              >
                {verifying ? 'Verifying...' : 'Verify Identity'}
              </button>
            </form>
          </>
        )}

        <div className="space-y-3">
          <form onSubmit={handleResend} className="flex gap-2">
            <input
              type="email"
              className="hidden"
              value={email}
              readOnly
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900/5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-900/10 transition-all"
            >
              Resend Code
            </button>
          </form>

          <button
            type="button"
            onClick={handleRecheck}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-white/50 transition-all"
          >
            I verified — refresh status
          </button>
          
          <button type="button" onClick={logout} className="w-full text-xs font-bold text-slate-400 hover:text-red-500 transition-all pt-2 uppercase tracking-widest">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
