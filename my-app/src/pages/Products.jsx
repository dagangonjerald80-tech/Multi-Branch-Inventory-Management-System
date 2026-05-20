import { useState, useEffect } from 'react';
import { api, buildProductFormData } from '../api';
import { useCanWrite, useIsAdmin } from '../context/AuthContext';

export default function Products() {
  const canWrite = useCanWrite();
  const isAdmin = useIsAdmin();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    supplier: '',
    image: null,
  });
  const [fieldErrors, setFieldErrors] = useState({});
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
    setForm({ name: '', description: '', sku: '', price: '', supplier: '', image: null });
    setEditing(null);
    setShowForm(false);
    setFieldErrors({});
  };

  const validate = () => {
    const errors = {};
    if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (form.sku.trim().length < 2) errors.sku = 'SKU must be at least 2 characters.';
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) errors.price = 'Price must be a positive number.';
    if (form.image && form.image.size > 2 * 1024 * 1024) errors.image = 'Image must be 2MB or smaller.';
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    const payload = { ...form, price: parseFloat(form.price) || 0 };
    if (payload.supplier === '') delete payload.supplier;
    const hasFile = form.image instanceof File;
    const fn = () => {
      if (editing) {
        if (hasFile) {
          const fd = buildProductFormData(payload);
          return api.products.update(editing.id, fd);
        }
        const { image, ...rest } = payload;
        return api.products.update(editing.id, rest);
      }
      if (hasFile) {
        const fd = buildProductFormData(payload);
        return api.products.create(fd);
      }
      const { image, ...rest } = payload;
      return api.products.create(rest);
    };
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
      image: null,
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!canWrite) return;
    if (window.confirm('Delete this product?')) {
      api.products.delete(id).then(load).catch((e) => setError(e.message));
    }
  };

  if (loading) return (
    <div className="p-4 text-slate-500 dark:text-slate-400">Loading products...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Products</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {!showForm ? (
        canWrite ? (
          <button
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => setShowForm(true)}
          >
            Add Product
          </button>
        ) : (
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Read-only (User role). Ask an admin to make changes.</p>
        )
      ) : (
        <form
          className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow p-6 max-w-md"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Product</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.name ? 'border-red-500' : 'border-slate-300'}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU</label>
              <input
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.sku ? 'border-red-500' : 'border-slate-300'}`}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
              {fieldErrors.sku && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.sku}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.price ? 'border-red-500' : 'border-slate-300'}`}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              {fieldErrors.price && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="text-sm w-full"
                onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
              />
              {fieldErrors.image && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.image}</p>}
            </div>
            <div className="flex gap-2 flex-wrap pt-2">
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                {editing ? 'Update Product' : 'Save Product'}
              </button>
              <button type="button" className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 font-bold rounded-xl hover:bg-slate-50 dark:bg-slate-900 transition-all" onClick={resetForm}>
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
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Image</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Name</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">SKU</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Price</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Supplier</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900">
                <td className="py-3 px-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-3 px-4">{p.name}</td>
                <td className="py-3 px-4">{p.sku}</td>
                <td className="py-3 px-4">{p.price}</td>
                <td className="py-3 px-4">{p.supplier_name || '-'}</td>
                <td className="py-3 px-4">
                  {isAdmin ? (
                    <>
                      <button
                        className="mr-2 px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 dark:bg-slate-800"
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
