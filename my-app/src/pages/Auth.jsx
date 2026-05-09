import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.login(form.email, form.password);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page max-w-xl">
      <h1>Sign in</h1>
      {error && <div className="error">{error}</div>}
      <form className="form card" onSubmit={handleSubmit}>
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <div>
          <button className="btn primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          <Link className="btn" to="/register">Create account</Link>
        </div>
      </form>
    </div>
  );
}

export function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', re_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.auth.register(form);
      setMessage('Registration successful. Check your email for the activation link before signing in.');
      setForm({ username: '', email: '', password: '', re_password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page max-w-xl">
      <h1>Create account</h1>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      <form className="form card" onSubmit={handleSubmit}>
        <label>Username</label>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <label>Confirm password</label>
        <input type="password" value={form.re_password} onChange={(e) => setForm({ ...form, re_password: e.target.value })} required />
        <div>
          <button className="btn primary" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
          <Link className="btn" to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
