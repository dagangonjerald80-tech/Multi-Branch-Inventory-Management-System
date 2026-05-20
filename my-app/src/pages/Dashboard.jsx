import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    api.dashboard.get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 text-slate-500 dark:text-slate-400">Loading dashboard...</div>
  );
  if (error) return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error: {error}</div>
  );
  if (!data) return null;

  const { stats, stock_by_branch, recent_activities, low_stock_items, sales_trend } = data;
  const maxStock = Math.max(1, ...stock_by_branch.map((x) => x.value));

  // SVG Chart Computations
  const chartWidth = 600;
  const chartHeight = 240;
  const paddingX = 50;
  const paddingY = 40;

  const trendMax = Math.max(1, ...sales_trend.map((x) => x.sales));
  
  const points = sales_trend.map((t, idx) => {
    const x = paddingX + (idx / (sales_trend.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (t.sales / trendMax) * (chartHeight - paddingY * 2);
    return { x, y, date: t.date, sales: t.sales };
  });

  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Welcome back to your inventory control center.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          System Online
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl shadow-blue-500/20 p-6 text-white transform hover:scale-[1.02] transition-all">
          <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl">📦</div>
          <span className="block text-3xl font-black mb-1">{stats.total_products}</span>
          <span className="text-blue-100 text-sm font-bold uppercase tracking-wider">Products</span>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl shadow-emerald-500/20 p-6 text-white transform hover:scale-[1.02] transition-all">
          <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl">🏢</div>
          <span className="block text-3xl font-black mb-1">{stats.total_branches}</span>
          <span className="text-emerald-100 text-sm font-bold uppercase tracking-wider">Branches</span>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl shadow-xl shadow-violet-500/20 p-6 text-white transform hover:scale-[1.02] transition-all">
          <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl">📊</div>
          <span className="block text-3xl font-black mb-1">{stats.total_inventory}</span>
          <span className="text-violet-100 text-sm font-bold uppercase tracking-wider">Total Stocks</span>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-orange-600 rounded-3xl shadow-xl shadow-rose-500/20 p-6 text-white transform hover:scale-[1.02] transition-all relative overflow-hidden">
          <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl">⚠️</div>
          <span className="block text-3xl font-black mb-1">{stats.low_stock_alerts}</span>
          <span className="text-rose-100 text-sm font-bold uppercase tracking-wider">Low Stock</span>
          {stats.low_stock_alerts > 0 && <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-white dark:bg-slate-800 animate-ping"></div>}
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl shadow-xl shadow-slate-500/20 p-6 text-white transform hover:scale-[1.02] transition-all">
          <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl">🚚</div>
          <span className="block text-3xl font-black mb-1">{stats.active_transfers}</span>
          <span className="text-slate-300 text-sm font-bold uppercase tracking-wider">Transfers</span>
        </div>
      </section>

      {/* Main Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Trend Interactive SVG Area Chart */}
        <section className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-100 dark:border-slate-700 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Weekly Sales Activity</h2>
              <p className="text-slate-400 text-xs mt-0.5">Interactive visual flow of branch retail sales</p>
            </div>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Live Trend</span>
          </div>

          {/* SVG Area Chart */}
          <div className="relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                const val = Math.round(trendMax * ratio);
                return (
                  <g key={ratio} className="opacity-40">
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 12}
                      y={y + 4}
                      textAnchor="end"
                      fill="#94a3b8"
                      className="text-[10px] font-bold"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area path */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartAreaGrad)" className="transition-all duration-300" />
              )}

              {/* Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#chartLineGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Points & Interactive Hover Area */}
              {points.map((p, idx) => {
                const isHovered = hoveredIdx === idx;
                return (
                  <g key={idx} className="cursor-pointer">
                    {/* Hover column background highlight */}
                    {isHovered && (
                      <line
                        x1={p.x}
                        y1={paddingY}
                        x2={p.x}
                        y2={chartHeight - paddingY}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeOpacity="0.15"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Outer Glowing Dot on hover */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 10 : 0}
                      fill="#3b82f6"
                      fillOpacity="0.15"
                      className="transition-all duration-200"
                    />

                    {/* Main Dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? '#3b82f6' : '#ffffff'}
                      stroke="#3b82f6"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />

                    {/* Bottom date text */}
                    <text
                      x={p.x}
                      y={chartHeight - paddingY + 20}
                      textAnchor="middle"
                      fill={isHovered ? '#0f172a' : '#94a3b8'}
                      className={`text-[10px] font-bold transition-colors duration-150`}
                    >
                      {p.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip Div */}
            {hoveredIdx !== null && (
              <div
                className="absolute bg-slate-950 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-2xl border border-white/10 pointer-events-none transition-all duration-150"
                style={{
                  left: `${(points[hoveredIdx].x / chartWidth) * 100}%`,
                  top: `${(points[hoveredIdx].y / chartHeight) * 100 - 22}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                  {points[hoveredIdx].date} Sales
                </p>
                <p className="text-sm mt-0.5">
                  {points[hoveredIdx].sales} units
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Low Stock Sidebar */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="text-rose-500">Critical</span> Items
            </h2>
            {low_stock_items.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-6 text-center text-slate-400 italic">All items well stocked.</div>
            ) : (
              <div className="space-y-4">
                {low_stock_items.slice(0, 4).map((s) => (
                  <Link 
                    to="/low-stock" 
                    key={s.id} 
                    className="block p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{s.product_name}</span>
                      <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Low</span>
                    </div>
                    <p className="text-xs text-slate-400">{s.branch_name} • <span className="text-white font-bold">{s.quantity} left</span></p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {low_stock_items.length > 4 && (
            <Link to="/low-stock" className="block text-center text-xs font-bold text-slate-400 hover:text-white transition-colors mt-6 pt-4 border-t border-white/5">
              View all {low_stock_items.length} alerts
            </Link>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stock by Branch */}
        <section className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Stock Distribution</h2>
            <Link to="/branches" className="text-blue-600 font-bold text-sm hover:underline">View All Branches</Link>
          </div>
          <div className="space-y-6">
            {stock_by_branch.map((b) => (
              <div key={b.name} className="group">
                <div className="flex justify-between mb-2 px-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{b.name}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">{b.value} units</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${Math.min(100, (b.value / maxStock) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Activity Table */}
      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Recent Transactions</h2>
          <Link to="/history" className="text-blue-600 font-bold text-sm hover:underline">Full History</Link>
        </div>
        <div className="overflow-x-auto -mx-8">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-y border-slate-100 dark:border-slate-700">
                <th className="py-4 px-8 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operation</th>
                <th className="py-4 px-8 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Product</th>
                <th className="py-4 px-8 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Location</th>
                <th className="py-4 px-8 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Amount</th>
                <th className="py-4 px-8 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent_activities.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-5 px-8">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      a.movement_type === 'SALE' ? 'bg-orange-100 text-orange-700' :
                      a.movement_type === 'RESTOCK' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {a.movement_type}
                    </span>
                  </td>
                  <td className="py-5 px-8 font-bold text-slate-700 dark:text-slate-300">{a.product_name}</td>
                  <td className="py-5 px-8 text-slate-500 dark:text-slate-400 font-medium">{a.branch_name}</td>
                  <td className="py-5 px-8 text-center font-black text-slate-900 dark:text-slate-100">{a.quantity}</td>
                  <td className="py-5 px-8 text-slate-400 text-sm font-medium">{a.date_formatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
