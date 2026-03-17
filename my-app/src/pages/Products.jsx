import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', sku: '', price: '', supplier: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    api.products.list().then(setProducts).catch((e) => setError(e.message));
    api.suppliers.list().then(setSuppliers).catch(() => {});
  };

  useEffect(() => {
    Promise.all([api.products.list(), api.suppliers.list()])
      .then(([p, s]) => {
        setProducts(p);
        setSuppliers(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', sku: '', price: '', supplier: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, price: parseFloat(form.price) || 0 };
    if (payload.supplier === '') delete payload.supplier;
    const fn = editing ? () => api.products.update(editing.id, payload) : () => api.products.create(payload);
    fn()
      .then(() => {
        resetForm();
        load();
      })
      .catch((e) => setError(e.message));
  };

  const handleEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      sku: p.sku,
      price: p.price,
      supplier: p.supplier || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this product?')) {
      api.products.delete(id).then(load).catch((e) => setError(e.message));
    }
  };

  if (loading) return (
    <div className="p-4 text-slate-500">Loading products...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Products</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {!showForm ? (
        <button
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => setShowForm(true)}
        >
          Add Product
        </button>
      ) : (
        <form
          className="mb-6 bg-white rounded-lg shadow p-6 max-w-md"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Product</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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
              <th className="text-left py-3 px-4 font-medium text-slate-600">SKU</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Price</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Supplier</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">{p.name}</td>
                <td className="py-3 px-4">{p.sku}</td>
                <td className="py-3 px-4">{p.price}</td>
                <td className="py-3 px-4">{p.supplier_name || '-'}</td>
                <td className="py-3 px-4">
                  <button
                    className="mr-2 px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
                    onClick={() => handleEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                    onClick={() => handleDelete(p.id)}
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
