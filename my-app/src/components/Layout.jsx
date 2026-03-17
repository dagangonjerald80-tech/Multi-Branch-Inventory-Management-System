import { Link, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/branches', label: 'Branches' },
  { to: '/products', label: 'Products' },
  { to: '/stock', label: 'Stock' },
  { to: '/transfers', label: 'Transfers' },
  { to: '/history', label: 'History' },
  { to: '/low-stock', label: 'Low Stock' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <nav className="w-56 bg-slate-800 text-white px-4 py-6">
        <h1 className="text-lg font-semibold mb-6">Inventory</h1>
        <ul className="space-y-1">
          {nav.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                  location.pathname === to ? 'bg-white/10 text-white' : ''
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-8 bg-slate-50">{children}</main>
    </div>
  );
}
