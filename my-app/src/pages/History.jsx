import { useState, useEffect } from 'react';
import { api } from '../api';

const typeBadge = {
  IN: 'bg-blue-100 text-blue-800',
  OUT: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-indigo-100 text-indigo-800',
  SALE: 'bg-rose-100 text-rose-800',
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.history.list()
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 text-slate-500">Loading history...</div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Stock Movement History</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Branch</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-500">{h.date_formatted}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge[h.movement_type] || 'bg-slate-100'}`}>
                      {h.movement_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">{h.product_name}</td>
                  <td className="py-3 px-4">{h.branch_name}</td>
                  <td className="py-3 px-4">{h.quantity}</td>
                  <td className="py-3 px-4 text-slate-500">{h.reference || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{h.performed_by_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
