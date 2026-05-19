import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Chatbot from './Chatbot';
import { useAuth, useIsAdmin } from '../context/AuthContext';

const nav = [
  { 
    to: '/', 
    label: 'Dashboard', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    to: '/branches', 
    label: 'Branches', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    to: '/suppliers',
    label: 'Suppliers',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    to: '/products', 
    label: 'Products', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  { 
    to: '/stock', 
    label: 'Stock', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  { 
    to: '/transfers', 
    label: 'Transfers', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )
  },
  { 
    to: '/history', 
    label: 'History', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    to: '/low-stock', 
    label: 'Low Stock', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  { 
    to: '/profile', 
    label: 'Profile', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkCls = (to) => {
    const isActive = location.pathname === to;
    return `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25'
        : 'text-slate-400 hover:text-white hover:bg-white/5 font-semibold'
    }`;
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'ADMIN') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    if (role === 'STAFF') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  };

  return (
    <>
      <div className="flex min-h-screen flex-col md:flex-row bg-slate-50">
        {/* Mobile Header */}
        <header className="flex items-center justify-between gap-2 bg-slate-950 px-6 py-4 text-white md:hidden shadow-lg border-b border-white/5 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-black text-sm tracking-widest uppercase">Nexus Stock</span>
          </div>
          <button
            type="button"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
          >
            MENU
          </button>
        </header>

        {/* Sidebar container */}
        <nav
          className={`${
            menuOpen ? 'flex' : 'hidden'
          } md:flex w-full md:w-64 flex-col bg-slate-950 text-white px-5 py-8 md:min-h-screen border-r border-white/5 z-10 shadow-2xl shrink-0`}
        >
          {/* Brand Logo Header */}
          <div className="hidden md:flex items-center gap-3 mb-8 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Nexus Stock
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto">
            <ul className="space-y-1.5">
              {nav.map(({ to, label, icon }) => (
                <li key={to}>
                  <Link to={to} className={linkCls(to)} onClick={() => setMenuOpen(false)}>
                    {icon}
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link to="/users" className={linkCls('/users')} onClick={() => setMenuOpen(false)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Users (Admin)</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* User Profile Footer Card */}
          {user && (
            <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-black text-white border border-white/10 uppercase">
                    {user.username.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-white text-xs truncate">{user.username}</p>
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-black text-slate-300 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                SIGN OUT
              </button>
            </div>
          )}
        </nav>

        {/* Content Panel */}
        <main className="flex-1 p-6 md:p-10 bg-slate-50 min-h-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <Chatbot />
    </>
  );
}

