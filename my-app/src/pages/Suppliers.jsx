import { useState, useEffect } from 'react';
import { api } from '../api';
import { useCanWrite, useIsAdmin } from '../context/AuthContext';

export default function Suppliers() {
  const isAdmin = useIsAdmin();
  const canWrite = useCanWrite();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api.suppliers.list()
      .then(setSuppliers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fn = editing ? () => api.suppliers.update(editing.id, form) : () => api.suppliers.create(form);
    fn()
      .then(() => {
        resetForm();
        load();
      })
      .catch((e) => setError(e.message));
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      contact_person: s.contact_person || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this supplier?')) {
      api.suppliers.delete(id).then(load).catch((e) => setError(e.message));
    }
  };

  if (loading) return (
    <div className="p-4 text-slate-500 dark:text-slate-400">Loading suppliers...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Suppliers</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {!showForm ? (
        canWrite && (
          <button
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => setShowForm(true)}
          >
            Add Supplier
          </button>
        )
      ) : (
        <form
          className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow p-6 max-w-md"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Supplier</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save
              </button>
              <button type="button" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-900" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Name</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Contact</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Phone</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900">
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{s.contact_person || '-'}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{s.phone || '-'}</td>
                <td className="py-3 px-4">
                  {isAdmin ? (
                    <>
                      <button
                        className="mr-2 px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 dark:bg-slate-800"
                        onClick={() => handleEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Read Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
