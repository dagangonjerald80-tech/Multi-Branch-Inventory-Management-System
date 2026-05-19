import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useIsAdmin } from '../context/AuthContext';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const isAdmin = useIsAdmin();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const blocked = Boolean(!isAdmin && me && String(me.id) !== String(id));

  useEffect(() => {
    if (!id || blocked) return;
    setError('');
    api.users
      .get(id)
      .then(setUser)
      .catch((e) => setError(e.message || 'Could not load user.'));
  }, [id, blocked]);

  if (blocked) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        You can only view your own profile here.{' '}
        <Link className="font-medium text-blue-600 hover:underline" to="/profile">
          Open Profile
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back
        </button>
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-slate-500 text-sm">Loading…</div>;
  }

  const isSelf = me && String(me.id) === String(user.id);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(isAdmin ? '/users' : '/profile')}
        className="mb-4 text-sm font-medium text-blue-600 hover:underline"
      >
        ← {isAdmin ? 'All users' : 'Profile'}
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">User details</h1>

      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow">
        <div className="flex items-center gap-4 mb-6">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
              {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.username}</p>
            <p className="text-sm text-slate-600">
              {user.first_name} {user.last_name}
            </p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900 text-right break-all">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{user.role}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Branch</dt>
            <dd className="text-slate-900 text-right">{user.branch_name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Email verified</dt>
            <dd className="text-slate-900">{user.is_email_verified ? 'Yes' : 'No'}</dd>
          </div>
        </dl>

        {isSelf && (
          <p className="mt-6 text-sm text-slate-500">
            <Link className="font-medium text-blue-600 hover:underline" to="/profile">
              Edit your profile or avatar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
