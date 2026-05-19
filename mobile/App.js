import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// API BASE configurations. Uses 10.0.2.2 for Android emulators by default.
// For real devices, replace with your machine's Local LAN IP (e.g., http://192.168.1.100:8000/api)
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.4:8000/api').replace(/\/$/, '');

function buildHeaders(token, json = true) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function errMsg(data, res) {
  let msg = data?.detail || data?.error;
  if (typeof msg === 'object') msg = JSON.stringify(msg);
  if (!msg && data && typeof data === 'object') {
    const parts = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    msg = parts.join('; ');
  }
  return msg || `Request failed (${res.status})`;
}

export default function App() {
  // Navigation & Screen states
  const [screen, setScreen] = useState('login'); // login | register | pending | app
  const [tab, setTab] = useState('dashboard'); // dashboard | inventory | transfers | chat | profile
  const [invSubTab, setInvSubTab] = useState('products'); // products | stocks | suppliers | branches
  
  // Auth states
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form states
  const [reg, setReg] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });

  // Verification states
  const [verificationCode, setVerificationCode] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [changeEmailVal, setChangeEmailVal] = useState('');
  const [showChangeEmail, setShowChangeEmail] = useState(false);

  // Data / Entity States
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]); // Admin-only: list of users

  // Search & Filtering
  const [productSearch, setProductSearch] = useState('');
  const [stockBranchFilter, setStockBranchFilter] = useState('');

  // Modals & Action Drawer states
  const [activeModal, setActiveModal] = useState(null); 
  // null | 'add_product' | 'edit_product' | 'add_stock' | 'record_sale' | 'update_threshold' | 'create_transfer' | 'add_branch' | 'add_supplier' | 'edit_user'
  
  const [editingItem, setEditingItem] = useState(null); // Refers to the product, stock, transfer, or user currently being modified

  // Form Fields
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', description: '', supplier: '' });
  const [stockForm, setStockForm] = useState({ branch_id: '', product_id: '', quantity: '10' });
  const [thresholdForm, setThresholdForm] = useState({ quantity: '10' });
  const [transferForm, setTransferForm] = useState({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '10' });
  const [branchForm, setBranchForm] = useState({ name: '', location: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', email: '', contact_person: '', phone: '', address: '' });
  const [userRoleForm, setUserRoleForm] = useState({ role: 'USER', branch_id: '' });

  // Chatbot states
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Medyo kamao ko mudumala ani! Pag-ask bahin sa inventory, low stock alert, branches, o i-type ang **help**.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Status & Notification states
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Role Permissions helper
  const canWrite = useMemo(
    () => user && ['ADMIN', 'STAFF'].includes(user.role) && user.is_email_verified,
    [user]
  );
  
  const isAdmin = useMemo(
    () => user && user.role === 'ADMIN' && user.is_email_verified,
    [user]
  );

  // JWT Silent Refresh mechanism
  const refreshAccess = useCallback(async (rt) => {
    try {
      const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: buildHeaders(null, true),
        body: JSON.stringify({ refresh: rt }),
      });
      const data = await parseJson(res);
      if (!res.ok || !data.access) return null;
      return data.access;
    } catch {
      return null;
    }
  }, []);

  // Standard API Request wrapper
  const apiFetch = useCallback(
    async (path, options = {}, retry = true) => {
      const { method = 'GET', body, isJson = true } = options;
      let token = accessToken;
      const headers = buildHeaders(token, isJson && body != null);
      
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body != null ? (isJson ? JSON.stringify(body) : body) : undefined,
      });
      
      let data = await parseJson(res);

      if (res.status === 401 && retry && refreshToken) {
        const nextToken = await refreshAccess(refreshToken);
        if (nextToken) {
          setAccessToken(nextToken);
          token = nextToken;
          const headersRetry = buildHeaders(token, isJson && body != null);
          const resRetry = await fetch(`${API_BASE}${path}`, {
            method,
            headers: headersRetry,
            body: body != null ? (isJson ? JSON.stringify(body) : body) : undefined,
          });
          data = await parseJson(resRetry);
          if (!resRetry.ok) throw new Error(errMsg(data, resRetry));
          return data;
        }
      }

      if (!res.ok) throw new Error(errMsg(data, res));
      return data;
    },
    [accessToken, refreshToken, refreshAccess]
  );

  // Logout handler
  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setDashboard(null);
    setProducts([]);
    setStocks([]);
    setTransfers([]);
    setBranches([]);
    setSuppliers([]);
    setUsers([]);
    setScreen('login');
    setTab('dashboard');
    setChatMessages([
      { role: 'assistant', text: 'Hello! I am your AI Inventory Assistant. How can I help you today?' },
    ]);
    setError('');
    setInfo('');
  }, []);

  // Fetch Main Data depending on active tab
  const loadMainData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [dash, br, pr, sup] = await Promise.all([
        apiFetch('/dashboard/'),
        apiFetch('/branches/'),
        apiFetch('/products/'),
        apiFetch('/suppliers/'),
      ]);
      setDashboard(dash);
      setBranches(Array.isArray(br) ? br : br.results || []);
      setProducts(Array.isArray(pr) ? pr : pr.results || []);
      setSuppliers(Array.isArray(sup) ? sup : sup.results || []);

      if (tab === 'inventory' && invSubTab === 'stocks') {
        const url = stockBranchFilter ? `/stocks/?branch=${stockBranchFilter}` : '/stocks/';
        const stk = await apiFetch(url);
        setStocks(Array.isArray(stk) ? stk : stk.results || []);
      } else if (tab === 'transfers') {
        const trf = await apiFetch('/transfers/');
        setTransfers(Array.isArray(trf) ? trf : trf.results || []);
      } else if (tab === 'profile' && user?.role === 'ADMIN') {
        const usrList = await apiFetch('/users/');
        setUsers(Array.isArray(usrList) ? usrList : usrList.results || []);
      }
    } catch (e) {
      setError(e.message || 'Error loading dashboard or inventory lists.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, tab, invSubTab, stockBranchFilter, user?.role, apiFetch]);

  // Refresh User details
  const refreshMe = useCallback(async () => {
    if (!accessToken) return;
    try {
      const me = await apiFetch('/users/me/');
      setUser(me);
      return me;
    } catch {
      logout();
    }
  }, [accessToken, apiFetch, logout]);

  // Actions trigger list reload
  useEffect(() => {
    if (screen === 'app' && accessToken) {
      loadMainData();
    }
  }, [screen, tab, invSubTab, stockBranchFilter, accessToken, loadMainData]);

  // Login handler
  const handleLogin = useCallback(async () => {
    setError('');
    setInfo('');
    const u = username.trim();
    if (u.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: buildHeaders(null, true),
        body: JSON.stringify({ username: u, password }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(errMsg(data, res));
      
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setUser(data.user);
      setPassword('');
      setResendEmail(data.user?.email || '');
      setChangeEmailVal(data.user?.email || '');
      
      if (!data.user?.is_email_verified) {
        setScreen('pending');
      } else {
        setScreen('app');
        setTab('dashboard');
      }
    } catch (e) {
      setError(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }, [username, password]);

  // Registration handler
  const handleRegister = useCallback(async () => {
    setError('');
    setInfo('');
    if (reg.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email.trim())) {
      setError('Enter a valid email.');
      return;
    }
    if (!reg.first_name.trim() || !reg.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (reg.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (reg.password !== reg.password_confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: buildHeaders(null, true),
        body: JSON.stringify({
          username: reg.username.trim(),
          email: reg.email.trim().toLowerCase(),
          first_name: reg.first_name.trim(),
          last_name: reg.last_name.trim(),
          password: reg.password,
          password_confirm: reg.password_confirm,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(errMsg(data, res));
      
      setInfo(data.detail || 'Registered successfully. Please verify your email.');
      setResendEmail(reg.email.trim().toLowerCase());
      setChangeEmailVal(reg.email.trim().toLowerCase());
      
      // Clear forms
      setReg({ username: '', email: '', first_name: '', last_name: '', password: '', password_confirm: '' });
      setScreen('login');
    } catch (e) {
      setError(e.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }, [reg]);

  // Verify email code
  const handleVerifyEmail = useCallback(async () => {
    setError('');
    setInfo('');
    const code = verificationCode.trim();
    const email = (resendEmail || user?.email || '').trim().toLowerCase();
    
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email/`, {
        method: 'POST',
        headers: buildHeaders(accessToken, true),
        body: JSON.stringify({ email, code }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(errMsg(data, res));
      
      setInfo(data.detail || 'Email verified successfully!');
      
      // Refresh current user and head to app screen
      const me = await refreshMe();
      if (me?.is_email_verified) {
        setScreen('app');
        setTab('dashboard');
      }
    } catch (e) {
      setError(e.message || 'Verification failed. Double check your code.');
    } finally {
      setLoading(false);
    }
  }, [verificationCode, resendEmail, accessToken, refreshMe, user]);

  // Resend code email
  const handleResendEmail = useCallback(async () => {
    setError('');
    setInfo('');
    const email = (resendEmail || user?.email || '').trim().toLowerCase();
    if (!email) {
      setError('Email address is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification/`, {
        method: 'POST',
        headers: buildHeaders(null, true),
        body: JSON.stringify({ email }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(errMsg(data, res));
      setInfo(data.detail || 'Verification email resent.');
    } catch (e) {
      setError(e.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  }, [resendEmail, user]);

  // Change email form
  const handleChangeEmail = useCallback(async () => {
    setError('');
    setInfo('');
    const email = changeEmailVal.trim().toLowerCase();
    if (!email) {
      setError('New email address is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-email/`, {
        method: 'POST',
        headers: buildHeaders(accessToken, true),
        body: JSON.stringify({ email }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(errMsg(data, res));
      
      setInfo(data.detail || 'Email updated. A new verification code was sent.');
      setResendEmail(email);
      setShowChangeEmail(false);
    } catch (e) {
      setError(e.message || 'Could not change email.');
    } finally {
      setLoading(false);
    }
  }, [changeEmailVal, accessToken]);

  // CRUD: PRODUCTS
  const handleProductSubmit = useCallback(async () => {
    if (!canWrite) return;
    setError('');
    const { name, sku, price, description, supplier } = productForm;
    if (name.trim().length < 2 || sku.trim().length < 2 || isNaN(parseFloat(price))) {
      setError('Valid Name, SKU and Price are required.');
      return;
    }
    
    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: parseFloat(price),
        description: description.trim(),
        supplier: supplier ? Number(supplier) : null,
      };

      if (activeModal === 'add_product') {
        await apiFetch('/products/', { method: 'POST', body });
        setInfo('Product added successfully!');
      } else if (activeModal === 'edit_product' && editingItem) {
        await apiFetch(`/products/${editingItem.id}/`, { method: 'PATCH', body });
        setInfo('Product updated successfully!');
      }

      setActiveModal(null);
      setEditingItem(null);
      setProductForm({ name: '', sku: '', price: '', description: '', supplier: '' });
      loadMainData();
    } catch (e) {
      setError(e.message || 'Error processing product.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, productForm, activeModal, editingItem, apiFetch, loadMainData]);

  const triggerEditProduct = (p) => {
    setEditingItem(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      price: String(p.price),
      description: p.description || '',
      supplier: p.supplier ? String(p.supplier) : '',
    });
    setActiveModal('edit_product');
  };

  const handleProductDelete = useCallback(async (id) => {
    if (!canWrite) return;
    setLoading(true);
    try {
      await apiFetch(`/products/${id}/`, { method: 'DELETE' });
      setInfo('Product deleted.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Could not delete product.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, apiFetch, loadMainData]);

  // CRUD: BRANCHES & SUPPLIERS
  const handleBranchSubmit = useCallback(async () => {
    if (!canWrite) return;
    const { name, location } = branchForm;
    if (!name.trim() || !location.trim()) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/branches/', { method: 'POST', body: { name: name.trim(), location: location.trim() } });
      setInfo('Branch created.');
      setBranchForm({ name: '', location: '' });
      setActiveModal(null);
      loadMainData();
    } catch (e) {
      setError(e.message || 'Branch creation failed.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, branchForm, apiFetch, loadMainData]);

  const handleSupplierSubmit = useCallback(async () => {
    if (!canWrite) return;
    const { name, email, contact_person, phone, address } = supplierForm;
    if (!name.trim()) {
      setError('Supplier name is required.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/suppliers/', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim() || undefined,
          contact_person: contact_person.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        },
      });
      setInfo('Supplier created.');
      setSupplierForm({ name: '', email: '', contact_person: '', phone: '', address: '' });
      setActiveModal(null);
      loadMainData();
    } catch (e) {
      setError(e.message || 'Supplier creation failed.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, supplierForm, apiFetch, loadMainData]);

  const handleBranchDelete = useCallback(async (id) => {
    if (!canWrite) return;
    setLoading(true);
    try {
      await apiFetch(`/branches/${id}/`, { method: 'DELETE' });
      setInfo('Branch deleted.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Cannot delete. Make sure no linked stock or transfers remain.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, apiFetch, loadMainData]);

  const handleSupplierDelete = useCallback(async (id) => {
    if (!canWrite) return;
    setLoading(true);
    try {
      await apiFetch(`/suppliers/${id}/`, { method: 'DELETE' });
      setInfo('Supplier deleted.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Cannot delete supplier.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, apiFetch, loadMainData]);

  // CRUD: STOCKS
  const handleStockActionSubmit = useCallback(async () => {
    setError('');
    const { branch_id, product_id, quantity } = stockForm;
    const qtyNum = parseInt(quantity, 10);
    if (!branch_id || !product_id || isNaN(qtyNum) || qtyNum < 1) {
      setError('Ensure branch, product, and a valid quantity (1+) are provided.');
      return;
    }
    setLoading(true);
    try {
      const url = activeModal === 'add_stock' ? '/stocks/add_stock/' : '/stocks/record_sale/';
      await apiFetch(url, {
        method: 'POST',
        body: {
          branch_id: Number(branch_id),
          product_id: Number(product_id),
          quantity: qtyNum,
        },
      });
      setInfo(activeModal === 'add_stock' ? 'Stock level added!' : 'Sale recorded!');
      setActiveModal(null);
      loadMainData();
    } catch (e) {
      setError(e.message || 'Stock operation failed.');
    } finally {
      setLoading(false);
    }
  }, [stockForm, activeModal, apiFetch, loadMainData]);

  const handleThresholdSubmit = useCallback(async () => {
    if (!editingItem) return;
    const qty = parseInt(thresholdForm.quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setError('Threshold must be a valid number (0+).');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/stocks/${editingItem.id}/`, {
        method: 'PUT',
        body: {
          low_stock_threshold: qty,
          branch: editingItem.branch,
          product: editingItem.product,
        },
      });
      setInfo('Threshold updated successfully.');
      setActiveModal(null);
      setEditingItem(null);
      loadMainData();
    } catch (e) {
      setError(e.message || 'Threshold update failed.');
    } finally {
      setLoading(false);
    }
  }, [thresholdForm, editingItem, apiFetch, loadMainData]);

  const handleStockDelete = useCallback(async (id) => {
    setLoading(true);
    try {
      await apiFetch(`/stocks/${id}/`, { method: 'DELETE' });
      setInfo('Stock record deleted.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Could not delete stock record.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, loadMainData]);

  // CRUD: TRANSFERS
  const handleTransferSubmit = useCallback(async () => {
    if (!canWrite) return;
    setError('');
    const { product_id, from_branch_id, to_branch_id, quantity } = transferForm;
    const qty = parseInt(quantity, 10);
    if (!product_id || !from_branch_id || !to_branch_id || isNaN(qty) || qty < 1) {
      setError('Ensure Product, Source, Destination, and Quantity are valid.');
      return;
    }
    if (from_branch_id === to_branch_id) {
      setError('Source and Destination branches cannot be the same.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/transfers/', {
        method: 'POST',
        body: {
          product: Number(product_id),
          from_branch: Number(from_branch_id),
          to_branch: Number(to_branch_id),
          quantity: qty,
        },
      });
      setInfo('Stock transfer initiated.');
      setActiveModal(null);
      setTransferForm({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '10' });
      loadMainData();
    } catch (e) {
      setError(e.message || 'Stock transfer initiation failed.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, transferForm, apiFetch, loadMainData]);

  const handleTransferComplete = useCallback(async (id) => {
    if (!canWrite) return;
    setLoading(true);
    try {
      await apiFetch(`/transfers/${id}/complete_transfer/`, { method: 'POST' });
      setInfo('Transfer completed.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, apiFetch, loadMainData]);

  const handleTransferCancel = useCallback(async (id) => {
    if (!canWrite) return;
    setLoading(true);
    try {
      await apiFetch(`/transfers/${id}/cancel_transfer/`, { method: 'POST' });
      setInfo('Transfer cancelled.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, apiFetch, loadMainData]);

  const handleTransferDelete = useCallback(async (id) => {
    if (!canWrite) return;
    setLoading(true);
    try {
      await apiFetch(`/transfers/${id}/`, { method: 'DELETE' });
      setInfo('Transfer record deleted.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Deletion failed.');
    } finally {
      setLoading(false);
    }
  }, [canWrite, apiFetch, loadMainData]);

  // ADMIN ONLY: UPDATE USER ROLES
  const handleUserRoleUpdate = useCallback(async () => {
    if (!isAdmin || !editingItem) return;
    setError('');
    setLoading(true);
    try {
      const body = {
        role: userRoleForm.role,
        branch_id: userRoleForm.branch_id ? Number(userRoleForm.branch_id) : null,
      };
      await apiFetch(`/users/${editingItem.id}/`, { method: 'PATCH', body });
      setInfo('User role and branch assignment updated.');
      setActiveModal(null);
      setEditingItem(null);
      loadMainData();
    } catch (e) {
      setError(e.message || 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, editingItem, userRoleForm, apiFetch, loadMainData]);

  const handleUserDelete = useCallback(async (id) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await apiFetch(`/users/${id}/`, { method: 'DELETE' });
      setInfo('User account deleted.');
      loadMainData();
    } catch (e) {
      setError(e.message || 'Failed to delete user.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, apiFetch, loadMainData]);

  // CHATBOT: SEND MESSAGE
  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !accessToken) return;
    
    setChatInput('');
    setChatMessages((messages) => [...messages, { role: 'user', text }]);
    setChatLoading(true);
    
    try {
      const data = await apiFetch('/chat/', { method: 'POST', body: { message: text } });
      setChatMessages((messages) => [...messages, { role: 'assistant', text: data.reply || '(no reply)' }]);
    } catch (e) {
      setChatMessages((messages) => [...messages, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, accessToken, apiFetch]);

  // suggestion chip sender
  const handleSuggestionClick = (msg) => {
    setChatInput(msg);
    // Submit using state updates in next tick
    setTimeout(() => {
      setChatInput(msg);
    }, 50);
  };

  // Filtered lists
  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase().trim();
    if (!query) return products;
    return products.filter((p) => 
      p.name.toLowerCase().includes(query) || 
      p.sku.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }, [products, productSearch]);

  // Helper colors
  const roleColor = (role) => {
    switch (role) {
      case 'ADMIN': return '#db2777'; // pink
      case 'STAFF': return '#2563eb'; // blue
      default: return '#64748b'; // slate
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        
        {/* HEADER BRANDING */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>🛠️ AG Inventory</Text>
          {user && (
            <View style={[styles.badge, { backgroundColor: roleColor(user.role) }]}>
              <Text style={styles.badgeText}>{user.role}</Text>
            </View>
          )}
        </View>

        {/* Global info and error boxes */}
        {error ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
          </View>
        ) : null}
        
        {info ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>✅ {info}</Text>
            <TouchableOpacity onPress={() => setInfo('')}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* SCREEN 1: LOGIN */}
        {screen === 'login' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardDesc}>Log in to access branch inventory controls</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                placeholder="Enter username"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.pwContainer}>
                <TextInput
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, { flex: 1, borderBottomWidth: 0, marginBottom: 0 }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.pwToggle}>
                  <Text style={styles.pwToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, loading && styles.disabledBtn]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Log In</Text>}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.secondaryBtn} 
              onPress={() => { setError(''); setInfo(''); setScreen('register'); }}
            >
              <Text style={styles.secondaryBtnText}>Create a new account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCREEN 2: REGISTER */}
        {screen === 'register' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign Up</Text>
            <Text style={styles.cardDesc}>Register a user profile on the system</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  placeholder="First name"
                  placeholderTextColor="#94a3b8"
                  value={reg.first_name}
                  onChangeText={(v) => setReg((r) => ({ ...r, first_name: v }))}
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  placeholder="Last name"
                  placeholderTextColor="#94a3b8"
                  value={reg.last_name}
                  onChangeText={(v) => setReg((r) => ({ ...r, last_name: v }))}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                placeholder="Username (unique)"
                placeholderTextColor="#94a3b8"
                value={reg.username}
                onChangeText={(v) => setReg((r) => ({ ...r, username: v }))}
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="email@example.com"
                placeholderTextColor="#94a3b8"
                value={reg.email}
                onChangeText={(v) => setReg((r) => ({ ...r, email: v }))}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                placeholder="Minimum 8 characters"
                placeholderTextColor="#94a3b8"
                value={reg.password}
                onChangeText={(v) => setReg((r) => ({ ...r, password: v }))}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                placeholder="Repeat password"
                placeholderTextColor="#94a3b8"
                value={reg.password_confirm}
                onChangeText={(v) => setReg((r) => ({ ...r, password_confirm: v }))}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, loading && styles.disabledBtn]} 
              onPress={handleRegister} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Profile</Text>}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.secondaryBtn} 
              onPress={() => setScreen('login')}
            >
              <Text style={styles.secondaryBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCREEN 3: EMAIL VERIFICATION PENDING */}
        {screen === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify Email</Text>
            <Text style={styles.cardDesc}>
              A 6-digit confirmation code was sent to <Text style={{ fontWeight: 'bold' }}>{resendEmail || user?.email}</Text>.
            </Text>

            {!showChangeEmail ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#94a3b8"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="numeric"
                    maxLength={6}
                    style={[styles.input, styles.codeInput]}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryBtn, loading && styles.disabledBtn]} 
                  onPress={handleVerifyEmail} 
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Code</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.linkBtn} 
                  onPress={handleResendEmail} 
                  disabled={loading}
                >
                  <Text style={styles.linkBtnText}>Resend verification code</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.linkBtn} 
                  onPress={() => setShowChangeEmail(true)}
                >
                  <Text style={styles.linkBtnText}>Change Email Address</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ marginTop: 12 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Email Address</Text>
                  <TextInput
                    placeholder="new-email@example.com"
                    placeholderTextColor="#94a3b8"
                    value={changeEmailVal}
                    onChangeText={setChangeEmailVal}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryBtn, loading && styles.disabledBtn]} 
                  onPress={handleChangeEmail} 
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update & Send Code</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.linkBtn} 
                  onPress={() => setShowChangeEmail(false)}
                >
                  <Text style={styles.linkBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />
            <TouchableOpacity style={styles.secondaryBtn} onPress={logout}>
              <Text style={styles.secondaryBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCREEN 4: FULL APP LAYOUT */}
        {screen === 'app' && user && (
          <View>
            {/* SUB LAYOUT: BOTTOM TABS BAR */}
            <View style={styles.tabsContainer}>
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'inventory', label: 'Inventory', icon: '📦' },
                { id: 'transfers', label: 'Transfers', icon: '🔄' },
                { id: 'chat', label: 'AI Chat', icon: '💬' },
                { id: 'profile', label: 'Profile', icon: '👤' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tabButton, tab === t.id && styles.tabButtonActive]}
                >
                  <Text style={styles.tabIcon}>{t.icon}</Text>
                  <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TAB CONTENT: DASHBOARD */}
            {tab === 'dashboard' && (
              <View>
                <View style={styles.welcomeBanner}>
                  <Text style={styles.welcomeTitle}>Maayong Adlaw, {user.first_name || user.username}!</Text>
                  <Text style={styles.welcomeSub}>Multi-branch control terminal status online.</Text>
                </View>

                {/* Stat Grid Cards */}
                {dashboard?.stats ? (
                  <View style={styles.statGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>📦</Text>
                      <Text style={styles.statVal}>{dashboard.stats.total_products}</Text>
                      <Text style={styles.statLabelText}>Total Products</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>🏢</Text>
                      <Text style={styles.statVal}>{dashboard.stats.total_branches}</Text>
                      <Text style={styles.statLabelText}>Branches</Text>
                    </View>
                    <View style={[styles.statCard, dashboard.stats.low_stock_alerts > 0 && styles.statCardWarning]}>
                      <Text style={styles.statEmoji}>⚠️</Text>
                      <Text style={[styles.statVal, dashboard.stats.low_stock_alerts > 0 && styles.textWarning]}>
                        {dashboard.stats.low_stock_alerts}
                      </Text>
                      <Text style={styles.statLabelText}>Low Stock Alerts</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.card}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={{ textAlign: 'center', marginTop: 10, color: '#64748b' }}>
                      Gathering analytics...
                    </Text>
                  </View>
                )}

                {/* Low Stock Highlight Alert Box */}
                {dashboard?.low_stock_items && dashboard.low_stock_items.length > 0 && (
                  <View style={[styles.card, { borderColor: '#fef3c7', backgroundColor: '#fffbeb' }]}>
                    <Text style={[styles.sectionTitle, { color: '#b45309' }]}>🚨 Low Stock Alerts</Text>
                    <Text style={styles.cardDesc}>The following items are below minimum quantity settings:</Text>
                    {dashboard.low_stock_items.map((item) => (
                      <View key={item.id} style={styles.alertListItem}>
                        <Text style={styles.alertItemName}>{item.product_name}</Text>
                        <Text style={styles.alertItemBranch}>{item.branch_name}</Text>
                        <Text style={styles.alertItemQty}>
                          Stock: <Text style={{ color: '#b91c1c', fontWeight: 'bold' }}>{item.quantity}</Text> (min: {item.low_stock_threshold})
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Quick actions panel */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>⚡ Quick Operations</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity style={styles.chipBtn} onPress={() => { setTab('inventory'); setInvSubTab('stocks'); setActiveModal('add_stock'); }}>
                      <Text style={styles.chipBtnText}>➕ Add Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chipBtn} onPress={() => { setTab('inventory'); setInvSubTab('stocks'); setActiveModal('record_sale'); }}>
                      <Text style={styles.chipBtnText}>🏷️ Record Sale</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chipBtn} onPress={() => { setTab('transfers'); setActiveModal('create_transfer'); }}>
                      <Text style={styles.chipBtnText}>🔄 Transfer Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chipBtn} onPress={() => { setTab('chat'); }}>
                      <Text style={styles.chipBtnText}>💬 Consult AI Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* TAB CONTENT: INVENTORY */}
            {tab === 'inventory' && (
              <View>
                {/* Horizontal Navigation Sub tabs */}
                <View style={styles.subTabs}>
                  {[
                    { id: 'products', label: 'Products' },
                    { id: 'stocks', label: 'Stock Levels' },
                    { id: 'suppliers', label: 'Suppliers' },
                    { id: 'branches', label: 'Branches' },
                  ].map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => setInvSubTab(sub.id)}
                      style={[styles.subTabButton, invSubTab === sub.id && styles.subTabButtonActive]}
                    >
                      <Text style={[styles.subTabLabel, invSubTab === sub.id && styles.subTabLabelActive]}>
                        {sub.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* INVENTORY: PRODUCTS */}
                {invSubTab === 'products' && (
                  <View>
                    <View style={styles.actionHeader}>
                      <TextInput
                        placeholder="🔍 Search name, SKU..."
                        placeholderTextColor="#94a3b8"
                        value={productSearch}
                        onChangeText={setProductSearch}
                        style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                      />
                      {canWrite ? (
                        <TouchableOpacity style={styles.actionAddBtn} onPress={() => { setProductForm({ name: '', sku: '', price: '', description: '', supplier: '' }); setActiveModal('add_product'); }}>
                          <Text style={styles.actionAddBtnText}>+ Add</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {filteredProducts.length === 0 ? (
                      <View style={styles.card}>
                        <Text style={styles.mutedText}>No products found matching query.</Text>
                      </View>
                    ) : (
                      filteredProducts.map((p) => (
                        <View key={p.id} style={styles.itemRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemRowTitle}>{p.name}</Text>
                            <Text style={styles.itemRowMeta}>SKU: {p.sku} | Price: ₱{p.price}</Text>
                            {p.supplier_name ? (
                              <Text style={styles.itemRowMeta}>Supplier: {p.supplier_name}</Text>
                            ) : null}
                            {p.description ? (
                              <Text style={styles.itemRowDesc}>{p.description}</Text>
                            ) : null}
                          </View>
                          {canWrite ? (
                            <View style={styles.itemRowActions}>
                              <TouchableOpacity style={styles.editBtn} onPress={() => triggerEditProduct(p)}>
                                <Text style={styles.editBtnText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleProductDelete(p.id)}>
                                <Text style={styles.deleteBtnText}>Del</Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* INVENTORY: STOCK LEVELS */}
                {invSubTab === 'stocks' && (
                  <View>
                    <View style={styles.filterSection}>
                      <Text style={styles.label}>Filter by Branch:</Text>
                      <View style={styles.selectWrapper}>
                        <TextInput
                          placeholder="Type Branch ID to filter (e.g. 1)"
                          placeholderTextColor="#94a3b8"
                          value={stockBranchFilter}
                          onChangeText={setStockBranchFilter}
                          keyboardType="numeric"
                          style={[styles.input, { marginBottom: 0 }]}
                        />
                      </View>
                    </View>

                    <View style={styles.actionRowContainer}>
                      <TouchableOpacity style={styles.actionBtnSolid} onPress={() => { setStockForm({ branch_id: '', product_id: '', quantity: '10' }); setActiveModal('add_stock'); }}>
                        <Text style={styles.actionBtnSolidText}>➕ Add Stock</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtnOutline} onPress={() => { setStockForm({ branch_id: '', product_id: '', quantity: '10' }); setActiveModal('record_sale'); }}>
                        <Text style={styles.actionBtnOutlineText}>🏷️ Record Sale</Text>
                      </TouchableOpacity>
                    </View>

                    {stocks.length === 0 ? (
                      <View style={styles.card}>
                        <Text style={styles.mutedText}>No stock logs found for this branch filter.</Text>
                      </View>
                    ) : (
                      stocks.map((s) => {
                        const isLow = s.quantity <= s.low_stock_threshold;
                        return (
                          <View key={s.id} style={[styles.itemRowCard, isLow && styles.itemRowCardWarning]}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemRowTitle}>{s.product_name}</Text>
                              <Text style={styles.itemRowMeta}>Branch: {s.branch_name}</Text>
                              <Text style={styles.itemRowMeta}>
                                Current Stock:{' '}
                                <Text style={{ color: isLow ? '#b91c1c' : '#10b981', fontWeight: 'bold' }}>
                                  {s.quantity}
                                </Text>{' '}
                                (Threshold: {s.low_stock_threshold})
                              </Text>
                              <Text style={styles.itemRowDesc}>SKU: {s.product_sku}</Text>
                            </View>
                            <View style={styles.itemRowActions}>
                              <TouchableOpacity 
                                style={styles.editBtn} 
                                onPress={() => { setEditingItem(s); setThresholdForm({ quantity: String(s.low_stock_threshold) }); setActiveModal('update_threshold'); }}
                              >
                                <Text style={styles.editBtnText}>Threshold</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleStockDelete(s.id)}>
                                <Text style={styles.deleteBtnText}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* INVENTORY: SUPPLIERS */}
                {invSubTab === 'suppliers' && (
                  <View>
                    <View style={styles.actionHeader}>
                      <Text style={styles.sectionHeading}>Suppliers Registry</Text>
                      {canWrite ? (
                        <TouchableOpacity style={styles.actionAddBtn} onPress={() => { setSupplierForm({ name: '', email: '', contact_person: '', phone: '', address: '' }); setActiveModal('add_supplier'); }}>
                          <Text style={styles.actionAddBtnText}>+ Add Supplier</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {suppliers.length === 0 ? (
                      <View style={styles.card}>
                        <Text style={styles.mutedText}>No registered suppliers.</Text>
                      </View>
                    ) : (
                      suppliers.map((s) => (
                        <View key={s.id} style={styles.itemRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemRowTitle}>{s.name}</Text>
                            {s.contact_person ? <Text style={styles.itemRowMeta}>Contact: {s.contact_person}</Text> : null}
                            {s.email ? <Text style={styles.itemRowMeta}>Email: {s.email}</Text> : null}
                            {s.phone ? <Text style={styles.itemRowMeta}>Phone: {s.phone}</Text> : null}
                            {s.address ? <Text style={styles.itemRowDesc}>Address: {s.address}</Text> : null}
                          </View>
                          {canWrite ? (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleSupplierDelete(s.id)}>
                              <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* INVENTORY: BRANCHES */}
                {invSubTab === 'branches' && (
                  <View>
                    <View style={styles.actionHeader}>
                      <Text style={styles.sectionHeading}>Branches List</Text>
                      {canWrite ? (
                        <TouchableOpacity style={styles.actionAddBtn} onPress={() => { setBranchForm({ name: '', location: '' }); setActiveModal('add_branch'); }}>
                          <Text style={styles.actionAddBtnText}>+ Add Branch</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {branches.length === 0 ? (
                      <View style={styles.card}>
                        <Text style={styles.mutedText}>No active branches configured.</Text>
                      </View>
                    ) : (
                      branches.map((b) => (
                        <View key={b.id} style={styles.itemRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemRowTitle}>{b.name}</Text>
                            <Text style={styles.itemRowDesc}>📍 Location: {b.location}</Text>
                          </View>
                          {canWrite ? (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleBranchDelete(b.id)}>
                              <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}

            {/* TAB CONTENT: TRANSFERS */}
            {tab === 'transfers' && (
              <View>
                <View style={styles.actionHeader}>
                  <Text style={styles.sectionHeading}>Stock Transfers logs</Text>
                  {canWrite ? (
                    <TouchableOpacity style={styles.actionAddBtn} onPress={() => { setTransferForm({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '10' }); setActiveModal('create_transfer'); }}>
                      <Text style={styles.actionAddBtnText}>🔄 Request Transfer</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {transfers.length === 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.mutedText}>No transfer history logs found.</Text>
                  </View>
                ) : (
                  transfers.map((t) => {
                    const statusColor = t.status === 'COMPLETED' ? '#10b981' : t.status === 'CANCELLED' ? '#ef4444' : '#f59e0b';
                    return (
                      <View key={t.id} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>{t.product_name || `Product ID: ${t.product}`}</Text>
                          <Text style={styles.itemRowMeta}>Quantity: {t.quantity}</Text>
                          <Text style={styles.itemRowMeta}>From: {t.from_branch_name} ➔ To: {t.to_branch_name}</Text>
                          <Text style={styles.itemRowDesc}>Created: {new Date(t.created_at).toLocaleDateString()}</Text>
                          
                          <View style={[styles.badge, { backgroundColor: statusColor, alignSelf: 'flex-start', marginTop: 8 }]}>
                            <Text style={styles.badgeText}>{t.status}</Text>
                          </View>
                        </View>
                        
                        {canWrite && t.status === 'PENDING' ? (
                          <View style={{ justifyContent: 'center', gap: 6 }}>
                            <TouchableOpacity style={styles.successBtn} onPress={() => handleTransferComplete(t.id)}>
                              <Text style={styles.successBtnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleTransferCancel(t.id)}>
                              <Text style={styles.deleteBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          canWrite && (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleTransferDelete(t.id)}>
                              <Text style={styles.deleteBtnText}>Del</Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB CONTENT: CHATBOT */}
            {tab === 'chat' && (
              <View style={styles.chatContainer}>
                <Text style={styles.sectionHeading}>🤖 AI Assistant (Bisaya Supported)</Text>
                
                {/* Chat Feed */}
                <ScrollView 
                  style={styles.chatFeed}
                  ref={(ref) => { this.chatScrollView = ref; }}
                  onContentSizeChange={() => this.chatScrollView?.scrollToEnd({ animated: true })}
                >
                  {chatMessages.map((msg, idx) => (
                    <View 
                      key={idx} 
                      style={[
                        styles.chatBubble, 
                        msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot
                      ]}
                    >
                      <Text style={msg.role === 'user' ? styles.chatTextUser : styles.chatTextBot}>
                        {msg.text}
                      </Text>
                    </View>
                  ))}
                  {chatLoading && <ActivityIndicator style={{ alignSelf: 'flex-start', margin: 10 }} color="#6366f1" />}
                </ScrollView>

                {/* Suggestion Chips */}
                <View style={styles.suggestionRow}>
                  <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSuggestionClick('help')}>
                    <Text style={styles.suggestionChipText}>Help</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSuggestionClick('List low stock products')}>
                    <Text style={styles.suggestionChipText}>Show Low Stock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSuggestionClick('How many branches do we have?')}>
                    <Text style={styles.suggestionChipText}>Total Branches</Text>
                  </TouchableOpacity>
                </View>

                {/* Input form */}
                <View style={styles.chatInputBar}>
                  <TextInput
                    placeholder="Ask AI assistant..."
                    placeholderTextColor="#94a3b8"
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={sendChatMessage}
                    style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                  />
                  <TouchableOpacity style={styles.chatSendBtn} onPress={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                    <Text style={styles.chatSendBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB CONTENT: PROFILE */}
            {tab === 'profile' && (
              <View>
                {/* User Card */}
                <View style={styles.card}>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {(user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.profileName}>{user.first_name} {user.last_name}</Text>
                      <Text style={styles.profileUsername}>@{user.username}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.profileInfoList}>
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Email:</Text>
                      <Text style={styles.profileInfoValue}>{user.email}</Text>
                    </View>
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Role:</Text>
                      <Text style={[styles.profileInfoValue, { color: roleColor(user.role), fontWeight: 'bold' }]}>
                        {user.role}
                      </Text>
                    </View>
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Branch Assigned:</Text>
                      <Text style={styles.profileInfoValue}>{user.branch_name || 'Global Access'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.secondaryBtn} onPress={logout}>
                    <Text style={[styles.secondaryBtnText, { color: '#ef4444' }]}>Sign Out</Text>
                  </TouchableOpacity>
                </View>

                {/* ADMIN ONLY: USERS MANAGEMENT LIST */}
                {isAdmin && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>🛡️ Admin: User Roles Directory</Text>
                    <Text style={styles.cardDesc}>Alter accounts levels or assign branches below:</Text>
                    
                    {users.length === 0 ? (
                      <ActivityIndicator color="#6366f1" />
                    ) : (
                      users.map((u) => (
                        <View key={u.id} style={styles.userManageRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.manageUserName}>{u.first_name} {u.last_name} (@{u.username})</Text>
                            <Text style={styles.manageUserMeta}>
                              Role: <Text style={{ color: roleColor(u.role), fontWeight: 'bold' }}>{u.role}</Text> | Branch: {u.branch_name || 'None'}
                            </Text>
                            <Text style={styles.manageUserMeta}>Email: {u.email} ({u.is_email_verified ? 'Verified' : 'Pending'})</Text>
                          </View>
                          {user.id !== u.id && (
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity 
                                style={styles.editBtn} 
                                onPress={() => { setEditingItem(u); setUserRoleForm({ role: u.role, branch_id: u.branch ? String(u.branch) : '' }); setActiveModal('edit_user'); }}
                              >
                                <Text style={styles.editBtnText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleUserDelete(u.id)}>
                                <Text style={styles.deleteBtnText}>Del</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}

            {/* FLOATING ACTION DIALOG/MODALS OVERLAYS */}
            {activeModal != null && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>
                    {activeModal === 'add_product' && 'Add Product'}
                    {activeModal === 'edit_product' && 'Edit Product'}
                    {activeModal === 'add_stock' && 'Increment Branch Stock'}
                    {activeModal === 'record_sale' && 'Record Product Sale'}
                    {activeModal === 'update_threshold' && 'Edit Low Stock Warning Limit'}
                    {activeModal === 'create_transfer' && 'Initiate Stock Transfer'}
                    {activeModal === 'add_branch' && 'Configure New Branch'}
                    {activeModal === 'add_supplier' && 'Add Supplier Profile'}
                    {activeModal === 'edit_user' && 'Alter User Levels'}
                  </Text>

                  {/* MODAL VIEW: PRODUCT FORM */}
                  {(activeModal === 'add_product' || activeModal === 'edit_product') && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Name</Text>
                        <TextInput
                          placeholder="e.g. Wireless Mouse"
                          placeholderTextColor="#94a3b8"
                          value={productForm.name}
                          onChangeText={(v) => setProductForm((f) => ({ ...f, name: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>SKU Code</Text>
                        <TextInput
                          placeholder="e.g. MOUSE-WL-01"
                          placeholderTextColor="#94a3b8"
                          value={productForm.sku}
                          onChangeText={(v) => setProductForm((f) => ({ ...f, sku: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Unit Price (₱)</Text>
                        <TextInput
                          placeholder="e.g. 850.00"
                          placeholderTextColor="#94a3b8"
                          value={productForm.price}
                          onChangeText={(v) => setProductForm((f) => ({ ...f, price: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Supplier ID (Optional)</Text>
                        <TextInput
                          placeholder="Enter supplier ID (e.g. 1)"
                          placeholderTextColor="#94a3b8"
                          value={productForm.supplier}
                          onChangeText={(v) => setProductForm((f) => ({ ...f, supplier: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                          placeholder="Product specifications description"
                          placeholderTextColor="#94a3b8"
                          value={productForm.description}
                          onChangeText={(v) => setProductForm((f) => ({ ...f, description: v }))}
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleProductSubmit}>
                        <Text style={styles.btnText}>Save Details</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* MODAL VIEW: ADD/RECORD STOCK FORM */}
                  {(activeModal === 'add_stock' || activeModal === 'record_sale') && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Branch ID</Text>
                        <TextInput
                          placeholder="Select Branch ID (e.g. 1)"
                          placeholderTextColor="#94a3b8"
                          value={stockForm.branch_id}
                          onChangeText={(v) => setStockForm((f) => ({ ...f, branch_id: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product ID</Text>
                        <TextInput
                          placeholder="Select Product ID (e.g. 3)"
                          placeholderTextColor="#94a3b8"
                          value={stockForm.product_id}
                          onChangeText={(v) => setStockForm((f) => ({ ...f, product_id: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantity</Text>
                        <TextInput
                          placeholder="10"
                          placeholderTextColor="#94a3b8"
                          value={stockForm.quantity}
                          onChangeText={(v) => setStockForm((f) => ({ ...f, quantity: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleStockActionSubmit}>
                        <Text style={styles.btnText}>Apply Stock Adjustment</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* MODAL VIEW: EDIT THRESHOLD FORM */}
                  {activeModal === 'update_threshold' && (
                    <View>
                      <Text style={styles.modalInfoParagraph}>
                        Configure alert limits for: {editingItem?.product_name} at {editingItem?.branch_name}
                      </Text>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Low Stock Warning Limit</Text>
                        <TextInput
                          placeholder="10"
                          placeholderTextColor="#94a3b8"
                          value={thresholdForm.quantity}
                          onChangeText={(v) => setThresholdForm({ quantity: v })}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleThresholdSubmit}>
                        <Text style={styles.btnText}>Update threshold</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* MODAL VIEW: TRANSFER FORM */}
                  {activeModal === 'create_transfer' && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product ID</Text>
                        <TextInput
                          placeholder="Product ID code"
                          placeholderTextColor="#94a3b8"
                          value={transferForm.product_id}
                          onChangeText={(v) => setTransferForm((f) => ({ ...f, product_id: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Source (From Branch ID)</Text>
                        <TextInput
                          placeholder="Source branch ID"
                          placeholderTextColor="#94a3b8"
                          value={transferForm.from_branch_id}
                          onChangeText={(v) => setTransferForm((f) => ({ ...f, from_branch_id: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Destination (To Branch ID)</Text>
                        <TextInput
                          placeholder="Destination branch ID"
                          placeholderTextColor="#94a3b8"
                          value={transferForm.to_branch_id}
                          onChangeText={(v) => setTransferForm((f) => ({ ...f, to_branch_id: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantity to transfer</Text>
                        <TextInput
                          placeholder="10"
                          placeholderTextColor="#94a3b8"
                          value={transferForm.quantity}
                          onChangeText={(v) => setTransferForm((f) => ({ ...f, quantity: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleTransferSubmit}>
                        <Text style={styles.btnText}>Submit Transfer Request</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* MODAL VIEW: BRANCH FORM */}
                  {activeModal === 'add_branch' && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Branch Name</Text>
                        <TextInput
                          placeholder="Branch location identifier"
                          placeholderTextColor="#94a3b8"
                          value={branchForm.name}
                          onChangeText={(v) => setBranchForm((f) => ({ ...f, name: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location Address</Text>
                        <TextInput
                          placeholder="Full address details"
                          placeholderTextColor="#94a3b8"
                          value={branchForm.location}
                          onChangeText={(v) => setBranchForm((f) => ({ ...f, location: v }))}
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleBranchSubmit}>
                        <Text style={styles.btnText}>Create Branch</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* MODAL VIEW: SUPPLIER FORM */}
                  {activeModal === 'add_supplier' && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Supplier Name</Text>
                        <TextInput
                          placeholder="Company name"
                          placeholderTextColor="#94a3b8"
                          value={supplierForm.name}
                          onChangeText={(v) => setSupplierForm((f) => ({ ...f, name: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                          placeholder="supplier@example.com"
                          placeholderTextColor="#94a3b8"
                          value={supplierForm.email}
                          onChangeText={(v) => setSupplierForm((f) => ({ ...f, email: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Contact Person</Text>
                        <TextInput
                          placeholder="Manager name"
                          placeholderTextColor="#94a3b8"
                          value={supplierForm.contact_person}
                          onChangeText={(v) => setSupplierForm((f) => ({ ...f, contact_person: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                          placeholder="09..."
                          placeholderTextColor="#94a3b8"
                          value={supplierForm.phone}
                          onChangeText={(v) => setSupplierForm((f) => ({ ...f, phone: v }))}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Office Address</Text>
                        <TextInput
                          placeholder="Postal Address"
                          placeholderTextColor="#94a3b8"
                          value={supplierForm.address}
                          onChangeText={(v) => setSupplierForm((f) => ({ ...f, address: v }))}
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleSupplierSubmit}>
                        <Text style={styles.btnText}>Register Supplier</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* MODAL VIEW: USER ROLE CONFIGURATION FORM */}
                  {activeModal === 'edit_user' && (
                    <View>
                      <Text style={styles.modalInfoParagraph}>
                        Modifying account settings for: @{editingItem?.username}
                      </Text>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Role (ADMIN, STAFF, USER)</Text>
                        <TextInput
                          placeholder="ADMIN | STAFF | USER"
                          placeholderTextColor="#94a3b8"
                          value={userRoleForm.role}
                          onChangeText={(v) => setUserRoleForm((f) => ({ ...f, role: v.toUpperCase() }))}
                          autoCapitalize="characters"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Assigned Branch ID (Optional)</Text>
                        <TextInput
                          placeholder="Branch ID (leave blank for global)"
                          placeholderTextColor="#94a3b8"
                          value={userRoleForm.branch_id}
                          onChangeText={(v) => setUserRoleForm((f) => ({ ...f, branch_id: v }))}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleUserRoleUpdate}>
                        <Text style={styles.btnText}>Confirm System Roles</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setActiveModal(null); setEditingItem(null); setError(''); }}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>
      <StatusBar style="dark" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingTop: 40, paddingBottom: 60 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0', 
    paddingBottom: 12 
  },
  appTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 99, 
    overflow: 'hidden', 
    alignItems: 'center' 
  },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  errBox: { 
    backgroundColor: '#fee2e2', 
    borderColor: '#fca5a5', 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  errText: { color: '#991b1b', fontSize: 13, fontWeight: '700', flex: 1 },
  
  infoBox: { 
    backgroundColor: '#dcfce7', 
    borderColor: '#86efac', 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  infoText: { color: '#166534', fontSize: 13, fontWeight: '700', flex: 1 },
  closeBtn: { fontSize: 18, fontWeight: 'bold', color: '#64748b', paddingHorizontal: 6 },

  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 16 },

  inputGroup: { marginBottom: 14 },
  inputRow: { flexDirection: 'row' },
  label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 },
  input: { 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    fontSize: 14, 
    color: '#0f172a', 
    backgroundColor: '#f8fafc',
    fontWeight: '600'
  },
  codeInput: { 
    letterSpacing: 8, 
    fontSize: 24, 
    textAlign: 'center', 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold'
  },
  pwContainer: { 
    flexDirection: 'row', 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 12, 
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    overflow: 'hidden'
  },
  pwToggle: { paddingHorizontal: 14 },
  pwToggleText: { fontSize: 12, fontWeight: 'bold', color: '#6366f1' },

  primaryBtn: { 
    backgroundColor: '#4f46e5', 
    borderRadius: 12, 
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  disabledBtn: { backgroundColor: '#a5b4fc', shadowOpacity: 0 },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },

  secondaryBtn: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    paddingVertical: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  secondaryBtnText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkBtnText: { color: '#4f46e5', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },

  // BOTTOM TAB NAVIGATION
  tabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#1e293b', 
    borderRadius: 20, 
    padding: 8, 
    justifyContent: 'space-around', 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8
  },
  tabButton: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 14 
  },
  tabButtonActive: { backgroundColor: '#334155' },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '800' },
  tabLabelActive: { color: '#ffffff' },

  // DASHBOARD
  welcomeBanner: { marginBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  welcomeSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#ffffff', 
    borderRadius: 18, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    alignItems: 'center' 
  },
  statCardWarning: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  textWarning: { color: '#d97706' },
  statLabelText: { fontSize: 10, color: '#64748b', fontWeight: '800', textAlign: 'center', marginTop: 2 },

  alertListItem: { 
    backgroundColor: '#ffffff', 
    padding: 10, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#fef3c7', 
    marginTop: 6 
  },
  alertItemName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  alertItemBranch: { fontSize: 11, color: '#64748b' },
  alertItemQty: { fontSize: 11, color: '#475569', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  chipBtn: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 99, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  chipBtnText: { fontSize: 12, color: '#1e293b', fontWeight: '700' },

  // INVENTORY TAB NAVIGATION
  subTabs: { 
    flexDirection: 'row', 
    backgroundColor: '#f1f5f9', 
    borderRadius: 14, 
    padding: 4, 
    marginBottom: 16,
    gap: 2
  },
  subTabButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  subTabButtonActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  subTabLabel: { fontSize: 12, color: '#64748b', fontWeight: '800' },
  subTabLabelActive: { color: '#4f46e5' },

  // ACTION LIST HEADERS
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  actionAddBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  actionAddBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#0f172a', flex: 1 },

  // ITEM LIST ROWS
  itemRowCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 18, 
    padding: 14, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemRowCardWarning: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  itemRowTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  itemRowMeta: { fontSize: 11, color: '#475569', marginTop: 2, fontWeight: '600' },
  itemRowDesc: { fontSize: 11, color: '#64748b', marginTop: 4 },
  itemRowActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  
  editBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  
  successBtn: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  successBtnText: { color: '#059669', fontSize: 11, fontWeight: '700' },

  filterSection: { marginBottom: 12 },
  selectWrapper: { marginTop: 4 },
  actionRowContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtnSolid: { flex: 1, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionBtnSolidText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  actionBtnOutline: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionBtnOutlineText: { color: '#334155', fontSize: 13, fontWeight: '800' },
  mutedText: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 10 },

  // CHATBOT TAB
  chatContainer: { height: 420, flexDirection: 'column' },
  chatFeed: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, padding: 10, marginBottom: 8 },
  chatBubble: { padding: 10, borderRadius: 14, marginVertical: 4, maxWidth: '85%' },
  chatBubbleUser: { backgroundColor: '#4f46e5', alignSelf: 'flex-end' },
  chatBubbleBot: { backgroundColor: '#ffffff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e2e8f0' },
  chatTextUser: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  chatTextBot: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  
  suggestionRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  suggestionChip: { backgroundColor: '#e2e8f0', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  suggestionChipText: { fontSize: 11, color: '#334155', fontWeight: '700' },
  chatInputBar: { flexDirection: 'row', alignItems: 'center' },
  chatSendBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chatSendBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // PROFILE TAB
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  profileName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  profileUsername: { fontSize: 12, color: '#64748b' },
  
  profileInfoList: { gap: 10, marginBottom: 20 },
  profileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  profileInfoLabel: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  profileInfoValue: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  userManageRow: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  manageUserName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  manageUserMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // FLOATING OVERLAY MODAL
  modalOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 16
  },
  modalCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 20, 
    width: '100%', 
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 14 },
  modalInfoParagraph: { fontSize: 12, color: '#475569', marginBottom: 12, fontWeight: '600' },
  modalCancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  modalCancelBtnText: { color: '#64748b', fontSize: 13, fontWeight: '700' }
});
