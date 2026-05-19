import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAuth, RequireVerified } from './components/RequireAuth';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Transfers from './pages/Transfers';
import History from './pages/History';
import LowStock from './pages/LowStock';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import PendingVerification from './pages/PendingVerification';
import Profile from './pages/Profile';
import UsersAdmin from './pages/UsersAdmin';
import UserDetail from './pages/UserDetail';

import Suppliers from './pages/Suppliers';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route element={<RequireAuth />}>
          <Route path="/pending-verification" element={<PendingVerification />} />
          <Route element={<RequireVerified />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/history" element={<History />} />
              <Route path="/low-stock" element={<LowStock />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/users" element={<UsersAdmin />} />
              <Route path="/users/:id" element={<UserDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
