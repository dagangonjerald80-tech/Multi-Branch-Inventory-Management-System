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

  const handleAddStock = (e) => {
    e.preventDefault();
    const q = parseInt(form.quantity, 10);
    if (!q || q <= 0) return setError('Invalid quantity');
    api.stocks.addStock(form.branch_id, form.product_id, q)
      .then(() => {
        setAction(null);
        setForm({ branch_id: '', product_id: '', quantity: '' });
        load();
      })
      .catch((e) => setError(e.message || e.data?.error));
  };

  const handleRecordSale = (e) => {
    e.preventDefault();
    const q = parseInt(form.quantity, 10);
    if (!q || q <= 0) return setError('Invalid quantity');
    api.stocks.recordSale(form.branch_id, form.product_id, q)
      .then(() => {
        setAction(null);
        setForm({ branch_id: '', product_id: '', quantity: '' });
        load();
      })
      .catch((e) => setError(e.message || e.data?.error));
  };

  const renderActionForm = () => (
    <form
      className="mb-6 bg-white rounded-lg shadow p-6 max-w-md"
      onSubmit={action === 'add' ? handleAddStock : handleRecordSale}
    >
      <h2 className="text-lg font-semibold mb-4">{action === 'add' ? 'Add Stock' : 'Record Sale'}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            required
          >
            <option value="">Select</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            required
          >
            <option value="">Select</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
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
            Submit
          </button>
          <button type="button" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50" onClick={() => setAction(null)}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );

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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
