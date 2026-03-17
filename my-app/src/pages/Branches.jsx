import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', location: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api.branches.list()
      .then(setBranches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: '', location: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fn = editing ? () => api.branches.update(editing.id, form) : () => api.branches.create(form);
    fn()
      .then(() => {
        resetForm();
        load();
      })
      .catch((e) => setError(e.message));
  };

  const handleEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, location: b.location });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this branch?')) {
      api.branches.delete(id).then(load).catch((e) => setError(e.message));
    }
  };

  if (loading) return (
    <div className="p-4 text-slate-500">Loading branches...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Branches</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {!showForm ? (
        <button
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => setShowForm(true)}
        >
          Add Branch
        </button>
      ) : (
        <form
          className="mb-6 bg-white rounded-lg shadow p-6 max-w-md"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Branch</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save
              </button>
              <button type="button" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Location</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">{b.name}</td>
                <td className="py-3 px-4">{b.location}</td>
                <td className="py-3 px-4">
                  <button
                    className="mr-2 px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
                    onClick={() => handleEdit(b)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                    onClick={() => handleDelete(b.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
