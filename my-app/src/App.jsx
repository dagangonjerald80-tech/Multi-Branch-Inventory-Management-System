import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Transfers from './pages/Transfers';
import History from './pages/History';
import LowStock from './pages/LowStock';
import { Login, Register } from './pages/Auth';
import Activate from './pages/Activate';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/products" element={<Products />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/history" element={<History />} />
          <Route path="/low-stock" element={<LowStock />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/activate/:uid/:token" element={<Activate />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
