import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('working');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    const uid = params.get('uid');
    const token = params.get('token');
    if (!uid || !token) {
      setStatus('error');
      setMessage('Invalid link. Use the full URL from your email.');
      return;
    }
    api.auth
      .verifyEmail(uid, token)
      .then((res) => {
        setStatus('ok');
        setMessage(res.detail || 'Email verified.');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.message || 'Verification failed.');
      });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800 px-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-8 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Email verification</h1>
        <p
          className={
            status === 'error'
              ? 'text-red-700 text-sm mb-6'
              : status === 'ok'
                ? 'text-green-700 text-sm mb-6'
                : 'text-slate-600 dark:text-slate-400 text-sm mb-6'
          }
        >
          {message}
        </p>
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
