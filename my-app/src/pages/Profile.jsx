import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email.');
      return;
    }
    try {
      if (avatarFile) {
        const fd = new FormData();
        fd.append('first_name', form.first_name.trim());
        fd.append('last_name', form.last_name.trim());
        fd.append('email', form.email.trim().toLowerCase());
        fd.append('avatar', avatarFile);
        await api.me.patch(fd);
      } else {
        await api.me.patch({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
        });
      }
      setAvatarFile(null);
      await refreshProfile();
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Update failed.');
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Your Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your personal information and account settings.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 text-sm font-bold animate-in fade-in duration-300">
          ⚠️ {error}
        </div>
      )}
      {message && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-bold animate-in fade-in duration-300">
          ✅ {message}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Profile Header Background */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-blue-500 relative"></div>
        
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-6 flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative group">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-28 w-28 rounded-3xl object-cover border-4 border-white shadow-xl" />
              ) : (
                <div className="h-28 w-28 rounded-3xl bg-slate-100 dark:bg-slate-800 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black text-slate-400">
                  {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-3xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold pointer-events-none">
                CHANGE
              </div>
            </div>
            
            <div className="flex-1 pb-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{user.username}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">{user.role}</span>
                {user.is_email_verified ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Verified</span>
                ) : (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-full">Unverified</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">First Name</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-medium"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <p className="text-[10px] font-bold text-orange-600 mt-2 uppercase tracking-tight">Note: Changing email will reset your verification status.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Update Avatar</label>
              <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 2 * 1024 * 1024) {
                      setError('Image must be 2MB or smaller.');
                      e.target.value = '';
                      return;
                    }
                    setError('');
                    setAvatarFile(file || null);
                  }}
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
              >
                SAVE CHANGES
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
