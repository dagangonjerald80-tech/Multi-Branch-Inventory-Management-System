import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function LowStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stocks.lowStock()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 text-slate-500">Loading low stock items...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Low Stock Alerts</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-500">No low stock items. All inventory levels are above thresholds.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-red-50 border-b border-red-100">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Branch</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">SKU</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Current</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Threshold</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">{s.branch_name}</td>
                  <td className="py-3 px-4">{s.product_name}</td>
                  <td className="py-3 px-4">{s.product_sku}</td>
                  <td className="py-3 px-4 font-bold text-red-600">{s.quantity}</td>
                  <td className="py-3 px-4">{s.low_stock_threshold}</td>
                  <td className="py-3 px-4">
                    <Link
                      to="/stock"
                      className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Stock
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
