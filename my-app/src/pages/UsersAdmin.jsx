import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useIsAdmin } from '../context/AuthContext';

export default function UsersAdmin() {
  const isAdmin = useIsAdmin();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'STAFF',
  });
  const [showForm, setShowForm] = useState(false);

  const [editing, setEditing] = useState(null);
  const [branches, setBranches] = useState([]);

  const load = () => {
    api.users.list().then(setUsers).catch((e) => setError(e.message));
    api.branches.list().then(setBranches).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  if (!isAdmin) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm">
        Admin role is required to manage users.
      </div>
    );
  }

  function resetForm() {
    setEditing(null);
    setShowForm(false);
    setForm({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      role: 'STAFF',
      branch: '',
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    const payload = {
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      role: form.role,
      is_staff: form.role !== 'USER',
      branch: form.branch || null,
    };
    if (form.password) payload.password = form.password;

    const fn = editing 
      ? () => api.users.update(editing.id, payload)
      : () => api.users.create(payload);

    fn()
      .then(() => {
        resetForm();
        load();
      })
      .catch((err) => setError(err.message));
  }

  function handleEdit(u) {
    setEditing(u);
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      password: '',
      role: u.role,
      branch: u.branch_id || '',
    });
    setShowForm(true);
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to delete this user?')) {
      api.users.delete(id).then(load).catch(e => setError(e.message));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Users (admin)</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-red-700 text-sm">{error}</div>}

      {!showForm ? (
        <button
          type="button"
          className="mb-6 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
          onClick={() => setShowForm(true)}
        >
          Add user
        </button>
      ) : (
        <form
          className="mb-6 max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} user</h2>
          <div className="grid gap-3">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder={editing ? "Leave blank to keep current password" : "Password"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
              minLength={8}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
                <option value="USER">User (read-only inventory)</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              >
                <option value="">No branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
                Save
              </button>
              <button type="button" className="rounded-lg border border-slate-300 px-4 py-2" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-900">
                  <Link className="text-blue-600 hover:underline" to={`/users/${u.id}`}>
                    {u.username}
                  </Link>
                  <div className="text-slate-500 font-normal text-xs">
                    {u.first_name} {u.last_name}
                  </div>
                </td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.is_email_verified ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleEdit(u)} className="mr-2 text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        <Link className="text-blue-600 hover:underline" to="/profile">
          Profile & avatar
        </Link>{' '}
        for your own account.
      </p>
    </div>
  );
}
