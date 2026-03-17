import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboard.get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 text-slate-500">Loading dashboard...</div>
  );
  if (error) return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error: {error}</div>
  );
  if (!data) return null;

  const { stats, stock_by_branch, recent_activities, low_stock_items, sales_trend } = data;
  const maxStock = Math.max(1, ...stock_by_branch.map((x) => x.value));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <span className="block text-2xl font-bold text-slate-900">{stats.total_products}</span>
          <span className="text-sm text-slate-500">Products</span>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <span className="block text-2xl font-bold text-slate-900">{stats.total_branches}</span>
          <span className="text-sm text-slate-500">Branches</span>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <span className="block text-2xl font-bold text-slate-900">{stats.total_inventory}</span>
          <span className="text-sm text-slate-500">Total Inventory</span>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500">
          <span className="block text-2xl font-bold text-slate-900">{stats.low_stock_alerts}</span>
          <span className="text-sm text-slate-500">Low Stock Alerts</span>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <span className="block text-2xl font-bold text-slate-900">{stats.active_transfers}</span>
          <span className="text-sm text-slate-500">Pending Transfers</span>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Stock by Branch</h2>
          <div className="space-y-3">
            {stock_by_branch.map((b) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="w-28 text-sm">{b.name}</span>
                <div className="flex-1 h-5 bg-slate-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded transition-all"
                    style={{ width: `${Math.min(100, (b.value / maxStock) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10">{b.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Items</h2>
          {low_stock_items.length === 0 ? (
            <p className="text-slate-500">No low stock items</p>
          ) : (
            <ul className="space-y-2">
              {low_stock_items.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link to="/low-stock" className="text-blue-600 hover:underline">
                    {s.product_name}
                  </Link>
                  <span className="text-slate-500"> – {s.quantity} at {s.branch_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-600 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-slate-600 font-medium">Product</th>
                <th className="text-left py-3 px-4 text-slate-600 font-medium">Branch</th>
                <th className="text-left py-3 px-4 text-slate-600 font-medium">Qty</th>
                <th className="text-left py-3 px-4 text-slate-600 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent_activities.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">{a.movement_type}</td>
                  <td className="py-3 px-4">{a.product_name}</td>
                  <td className="py-3 px-4">{a.branch_name}</td>
                  <td className="py-3 px-4">{a.quantity}</td>
                  <td className="py-3 px-4 text-slate-500 text-sm">{a.date_formatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sales_trend && sales_trend.length > 0 && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Trend (7 days)</h2>
          <div className="flex flex-wrap gap-2">
            {sales_trend.map((d) => (
              <div key={d.date} className="px-4 py-2 bg-slate-100 rounded-lg text-center">
                <span className="block text-xs text-slate-500">{d.date}</span>
                <span className="font-medium">{d.sales}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
