import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Stock() {
  const [stocks, setStocks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [form, setForm] = useState({ branch_id: '', product_id: '', quantity: '' });

  const load = () =>
    api.stocks.list(branchFilter || null)
      .then(setStocks)
      .catch((e) => setError(e.message));

  useEffect(() => {
    Promise.all([
      api.branches.list().then(setBranches).catch(() => {}),
      api.products.list().then(setProducts).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [branchFilter]);

  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!form.branch_id) errors.branch_id = 'Please select a branch.';
    if (!form.product_id) errors.product_id = 'Please select a product.';
    const q = parseInt(form.quantity, 10);
    if (isNaN(q) || q <= 0) errors.quantity = 'Quantity must be at least 1.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [editingStock, setEditingStock] = useState(null);

  const resetForm = () => {
    setAction(null);
    setEditingStock(null);
    setForm({ branch_id: '', product_id: '', quantity: '' });
    setFieldErrors({});
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    
    api.stocks.addStock(form.branch_id, form.product_id, parseInt(form.quantity, 10))
      .then(() => {
        resetForm();
        load();
      })
      .catch((e) => setError(e.message || e.data?.error));
  };

  const handleRecordSale = (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    api.stocks.recordSale(form.branch_id, form.product_id, parseInt(form.quantity, 10))
      .then(() => {
        resetForm();
        load();
      })
      .catch((e) => setError(e.message || e.data?.error));
  };

  const handleUpdateThreshold = (e) => {
    e.preventDefault();
    const threshold = parseInt(form.quantity, 10);
    if (isNaN(threshold) || threshold < 0) {
      setFieldErrors({ quantity: 'Threshold must be 0 or more.' });
      return;
    }
    api.stocks.update(editingStock.id, { low_stock_threshold: threshold })
      .then(() => {
        resetForm();
        load();
      })
      .catch((e) => setError(e.message));
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this stock record?')) {
      api.stocks.delete(id).then(load).catch((e) => setError(e.message));
    }
  };

  const renderActionForm = () => {
    let title = 'Action';
    let submitFn = handleAddStock;
    if (action === 'add') title = 'Add Stock';
    if (action === 'sale') { title = 'Record Sale'; submitFn = handleRecordSale; }
    if (action === 'threshold') { title = 'Update Threshold'; submitFn = handleUpdateThreshold; }

    return (
      <form
        className="mb-6 bg-white rounded-[2rem] shadow-2xl p-8 max-w-md border border-slate-100"
        onSubmit={submitFn}
      >
        <h2 className="text-xl font-black text-slate-900 mb-6">{title}</h2>
        <div className="space-y-4">
          {action !== 'threshold' ? (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Branch</label>
                <select
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-4 focus:ring-blue-500/5 transition-all outline-none ${fieldErrors.branch_id ? 'border-red-500' : 'border-slate-200'}`}
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  required
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {fieldErrors.branch_id && <p className="mt-1 text-xs text-red-600 font-bold">{fieldErrors.branch_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Product</label>
                <select
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-4 focus:ring-blue-500/5 transition-all outline-none ${fieldErrors.product_id ? 'border-red-500' : 'border-slate-200'}`}
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {fieldErrors.product_id && <p className="mt-1 text-xs text-red-600 font-bold">{fieldErrors.product_id}</p>}
              </div>
            </>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl mb-2">
              <p className="text-sm font-bold text-slate-700">{editingStock.product_name}</p>
              <p className="text-xs text-slate-500">{editingStock.branch_name}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              {action === 'threshold' ? 'Low Stock Threshold' : 'Quantity'}
            </label>
            <input
              type="number"
              min={action === 'threshold' ? "0" : "1"}
              placeholder="0"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-bold ${fieldErrors.quantity ? 'border-red-500' : 'border-slate-200'}`}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            {fieldErrors.quantity && <p className="mt-1 text-xs text-red-600 font-bold">{fieldErrors.quantity}</p>}
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 py-3.5 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
              SAVE
            </button>
            <button type="button" className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-50 transition-all" onClick={resetForm}>
              CANCEL
            </button>
          </div>
        </div>
      </form>
    );
  };

  if (loading) return (
    <div className="p-4 text-slate-500">Loading...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Stock by Branch</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Branch filter:</label>
        <select
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {!action ? (
        <div className="mb-6 flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => setAction('add')}
          >
            Add Stock
          </button>
          <button
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            onClick={() => setAction('sale')}
          >
            Record Sale
          </button>
        </div>
      ) : (
        renderActionForm()
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-600">Branch</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">SKU</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Threshold</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr
                key={s.id}
                className={`border-b border-slate-100 hover:bg-slate-50 ${
                  s.quantity <= s.low_stock_threshold ? 'bg-red-50' : ''
                }`}
              >
                <td className="py-3 px-4">{s.branch_name}</td>
                <td className="py-3 px-4">{s.product_name}</td>
                <td className="py-3 px-4">{s.product_sku}</td>
                <td className={`py-3 px-4 ${s.quantity <= s.low_stock_threshold ? 'font-bold text-red-600' : ''}`}>
                  {s.quantity}
                </td>
                <td className="py-3 px-4">{s.low_stock_threshold}</td>
                <td className="py-3 px-4 text-sm">
                  <button 
                    onClick={() => { setEditingStock(s); setAction('threshold'); setForm({...form, quantity: s.low_stock_threshold}); }} 
                    className="mr-3 text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(s.id)} 
                    className="text-red-600 hover:underline"
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
