import { useState, useEffect } from 'react';
import { api } from '../api';

const statusBadge = {
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ product: '', from_branch: '', to_branch: '', quantity: '' });
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api.transfers.list()
      .then(setTransfers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    api.branches.list().then(setBranches).catch(() => {});
    api.products.list().then(setProducts).catch(() => {});
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    const q = parseInt(form.quantity, 10);
    if (!q || q <= 0) return setError('Invalid quantity');
    api.transfers.create({
      product: form.product,
      from_branch: form.from_branch,
      to_branch: form.to_branch,
      quantity: q,
    })
      .then(() => {
        setShowForm(false);
        setForm({ product: '', from_branch: '', to_branch: '', quantity: '' });
        load();
      })
      .catch((e) => setError(e.message || e.data?.error));
  };

  const handleComplete = (id) => {
    api.transfers.complete(id).then(load).catch((e) => setError(e.message || e.data?.error));
  };

  const handleCancel = (id) => {
    api.transfers.cancel(id).then(load).catch((e) => setError(e.message || e.data?.error));
  };

  if (loading) return (
    <div className="p-4 text-slate-500">Loading transfers...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Stock Transfers</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {!showForm ? (
        <button
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => setShowForm(true)}
        >
          Create Transfer
        </button>
      ) : (
        <form
          className="mb-6 bg-white rounded-lg shadow p-6 max-w-md"
          onSubmit={handleCreate}
        >
          <h2 className="text-lg font-semibold mb-4">Create Transfer</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                required
              >
                <option value="">Select</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Branch</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.from_branch}
                onChange={(e) => setForm({ ...form, from_branch: e.target.value })}
                required
              >
                <option value="">Select</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To Branch</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.to_branch}
                onChange={(e) => setForm({ ...form, to_branch: e.target.value })}
                required
              >
                <option value="">Select</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create
              </button>
              <button type="button" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50" onClick={() => setShowForm(false)}>
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
              <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">From</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">To</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">{t.product_name}</td>
                <td className="py-3 px-4">{t.from_branch_name}</td>
                <td className="py-3 px-4">{t.to_branch_name}</td>
                <td className="py-3 px-4">{t.quantity}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[t.status] || 'bg-slate-100'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {t.status === 'PENDING' && (
                    <>
                      <button
                        className="mr-2 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => handleComplete(t.id)}
                      >
                        Complete
                      </button>
                      <button
                        className="px-2 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                        onClick={() => handleCancel(t.id)}
                      >
                        Cancel
                      </button>
                    </>
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
