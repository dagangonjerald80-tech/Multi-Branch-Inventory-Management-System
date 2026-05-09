import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', first_name: '', last_name: '', phone: '', branch: '' });
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profile, setProfile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileData, branchData] = await Promise.all([api.profile.me(), api.branches.list()]);
        setProfile(profileData);
        setForm({
          username: profileData.username || '',
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.profile?.phone || '',
          branch: profileData.profile?.branch || '',
        });
        setAvatarUrl(profileData.profile?.avatar_url || '');
        setBranches(branchData);
      } catch (err) {
        setError(err.status === 401 ? 'Please sign in to view your profile.' : err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    const data = new FormData();
    data.append('username', form.username);
    data.append('first_name', form.first_name);
    data.append('last_name', form.last_name);
    data.append('phone', form.phone);
    data.append('branch', form.branch);
    if (avatar) data.append('avatar', avatar);

    try {
      const updated = await api.profile.update(data);
      setProfile(updated);
      setAvatarUrl(updated.profile?.avatar_url || '');
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    api.auth.logout();
    navigate('/login');
  }

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error && !profile) {
    return (
      <div className="page max-w-xl">
        <h1>Profile</h1>
        <div className="error">{error}</div>
        <Link className="btn primary" to="/login">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="page max-w-3xl">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="muted">Manage your account details, branch assignment, and profile photo.</p>
        </div>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      <form className="form card profile-card" onSubmit={handleSubmit}>
        <div className="avatar-panel">
          {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <div className="avatar-placeholder">{form.username.slice(0, 1).toUpperCase() || '?'}</div>}
          <label>Profile photo</label>
          <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
        </div>
        <div className="profile-fields">
          <label>Email</label>
          <input value={profile.email || ''} disabled />
          <label>Username</label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <label>First name</label>
          <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <label>Last name</label>
          <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label>Branch</label>
          <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            <option value="">No branch</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <div>
            <button className="btn primary">Save profile</button>
          </div>
        </div>
      </form>
    </div>
  );
}
