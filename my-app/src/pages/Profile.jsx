import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getImageUrl } from '../api';

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
  });
  const [passForm, setPassForm] = useState({
    old: '',
    new: '',
    confirm: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        bio: user.bio || '',
      });
      // Reset previews when user data refreshes
      setAvatarPreview(null);
      setCoverPreview(null);
    }
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('first_name', form.first_name.trim());
      fd.append('last_name', form.last_name.trim());
      fd.append('email', form.email.trim().toLowerCase());
      fd.append('bio', form.bio.trim());
      
      if (avatarFile) fd.append('avatar', avatarFile);
      if (coverFile) fd.append('cover_photo', coverFile);
      
      await api.me.patch(fd);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview(null);
      setCoverPreview(null);
      await refreshProfile();
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  }

  const [zoomedImage, setZoomedImage] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePassSubmit(e) {
    e.preventDefault();
    if (loading) return;
    
    // Explicitly reset BOTH states before starting
    setError('');
    setMessage('');
    
    if (passForm.new !== passForm.confirm) {
        setError('New passwords do not match.');
        return;
    }
    
    setLoading(true);
    try {
        await api.auth.changePassword(passForm.old, passForm.new);
        // On success, explicitly ensure error is cleared and show success
        setError(''); 
        setMessage('Password changed successfully.');
        setPassForm({ old: '', new: '', confirm: '' });
        
        // Hide form after a short delay for feedback
        setTimeout(() => setIsChangingPass(false), 2000);
    } catch (err) {
        // On failure, explicitly ensure message is cleared and show error
        setMessage('');
        setError(err.message || 'Password change failed.');
    } finally {
        setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="pb-20 relative">
      {/* Wave-2 Background Animation */}
      <div className="wave-wrapper">
        <div className="wave opacity-[0.03] dark:opacity-[0.07]"></div>
        <div className="wave opacity-[0.03] dark:opacity-[0.07]" style={{ left: "100%" }}></div>
      </div>
      <header className="mb-8 animate-reveal">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Your Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Personalize your account and manage your credentials.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 animate-reveal-delay-1">
          {/* Main Profile Card */}
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="h-48 bg-slate-200 dark:bg-slate-900 relative group overflow-hidden">
              {(coverPreview || user.cover_photo_url) ? (
                <img 
                  src={coverPreview || getImageUrl(user.cover_photo_url)} 
                  alt="Cover" 
                  className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-500"
                  onClick={() => setZoomedImage(coverPreview || getImageUrl(user.cover_photo_url))}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-blue-500"></div>
              )}
              
              <label className="absolute bottom-4 right-4 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-black rounded-xl cursor-pointer hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100 uppercase tracking-widest">
                Change Cover
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                      if (file.size > 5 * 1024 * 1024) { setError('Cover 5MB max.'); return; }
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                      setMessage('Previewing new cover. Click "SAVE PROFILE" below to apply.');
                  }
                }} />
              </label>
            </div>
            
            <div className="px-8 pb-8">
              <div className="relative -mt-12 mb-6 flex flex-col md:flex-row md:items-end gap-6">
                <div className="relative group">
                  {(avatarPreview || user.avatar_url) ? (
                    <img 
                      src={avatarPreview || getImageUrl(user.avatar_url)} 
                      alt="" 
                      className="h-32 w-32 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl cursor-zoom-in hover:scale-105 transition-transform" 
                      onClick={() => setZoomedImage(avatarPreview || getImageUrl(user.avatar_url))}
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-[2rem] bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center text-4xl font-black text-slate-400">
                      {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 pb-2">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{user.username}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-4 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{user.role}</span>
                    <span className={`px-4 py-1 ${user.is_email_verified ? 'bg-emerald-500' : 'bg-orange-500'} text-white text-[10px] font-black uppercase tracking-widest rounded-full`}>
                        {user.is_email_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">First Name</label>
                    <input
                      className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Last Name</label>
                    <input
                      className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                  <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase tracking-wider ml-1">Note: Changing email will reset your verification status.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">About Me / Bio</label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium min-h-[120px]"
                    placeholder="Tell us about yourself..."
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Profile Photo</label>
                        <input 
                            type="file" 
                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 2 * 1024 * 1024) { setError('Avatar 2MB max.'); return; }
                                    setAvatarFile(file);
                                    setAvatarPreview(URL.createObjectURL(file));
                                    setMessage('Previewing new avatar. Click "SAVE PROFILE" below to apply.');
                                }
                            }} 
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                          type="submit" 
                          disabled={loading}
                          className={`w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'MODAFYING...' : 'SAVE PROFILE'}
                        </button>
                    </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-8 animate-reveal-delay-2">
          {/* Stats Card */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <span className="w-2 h-5 bg-blue-600 rounded-full"></span>
                Account Summary
            </h3>
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">Branch</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">{user.branch_name || 'N/A'}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">Member Since</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">May 2024</span>
                </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <span className="w-2 h-5 bg-rose-500 rounded-full"></span>
                Security
            </h3>
            
            {!isChangingPass ? (
                <button 
                  onClick={() => setIsChangingPass(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-400 font-bold hover:border-blue-500 hover:text-blue-600 transition-all"
                >
                    CHANGE PASSWORD
                </button>
            ) : (
                <form onSubmit={handlePassSubmit} className="space-y-4">
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={passForm.old}
                      onChange={(e) => setPassForm({ ...passForm, old: e.target.value })}
                      required
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={passForm.new}
                      onChange={(e) => setPassForm({ ...passForm, new: e.target.value })}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={passForm.confirm}
                      onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                      required
                    />
                    <div className="flex gap-2">
                        <button 
                          type="submit" 
                          disabled={loading}
                          className={`flex-1 bg-slate-900 text-white font-bold py-2 rounded-xl text-xs hover:bg-black transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'WAIT...' : 'UPDATE'}
                        </button>
                        <button 
                          type="button" 
                          disabled={loading}
                          onClick={() => setIsChangingPass(false)} 
                          className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs disabled:opacity-50"
                        >
                            CANCEL
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed" 
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
