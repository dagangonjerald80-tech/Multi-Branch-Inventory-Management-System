import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

export default function Activate() {
  const { uid, token } = useParams();
  const [status, setStatus] = useState('Activating your account...');
  const [error, setError] = useState('');

  useEffect(() => {
    async function activate() {
      try {
        await api.auth.activate(uid, token);
        setStatus('Your account is active. You can now sign in.');
      } catch (err) {
        setError(err.message);
        setStatus('Activation failed.');
      }
    }
    activate();
  }, [uid, token]);

  return (
    <div className="page max-w-xl">
      <h1>Email verification</h1>
      {error ? <div className="error">{error}</div> : <div className="success">{status}</div>}
      <Link className="btn primary" to="/login">Go to sign in</Link>
    </div>
  );
}
