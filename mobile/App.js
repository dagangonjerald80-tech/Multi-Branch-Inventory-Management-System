import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE, api, clearTokens, setTokens } from './src/api';
import { styles } from './src/styles';

const emptyProduct = { name: '', sku: '', price: '', description: '', supplier: '' };
const emptyStockAction = { branch_id: '', product_id: '', quantity: '1' };
const emptyTransfer = { product: '', from_branch: '', to_branch: '', quantity: '1' };
const emptyBranch = { name: '', location: '' };
const emptySupplier = { name: '', email: '', contact_person: '', phone: '', address: '' };
const emptyRegister = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
};

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function displayName(user) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return name || user?.username || 'User';
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'PHP 0.00';
  return `PHP ${amount.toFixed(2)}`;
}

function stockState(item) {
  const qty = Number(item?.quantity || 0);
  const limit = Number(item?.low_stock_threshold || 0);
  if (qty <= limit) return 'Low';
  if (qty <= limit * 2) return 'Watch';
  return 'Good';
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  autoCapitalize = 'none',
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function Button({ title, onPress, variant = 'primary', disabled, small, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        small && styles.buttonSmall,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonSecondaryText,
          variant === 'ghost' && styles.buttonGhostText,
          small && styles.buttonSmallText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Notice({ type, message, onDismiss }) {
  if (!message) return null;
  return (
    <View style={[styles.notice, type === 'error' ? styles.noticeError : styles.noticeInfo]}>
      <Text style={[styles.noticeText, type === 'error' ? styles.noticeErrorText : styles.noticeInfoText]}>
        {message}
      </Text>
      <TouchableOpacity onPress={onDismiss} style={styles.noticeClose}>
        <Text style={styles.noticeCloseText}>x</Text>
      </TouchableOpacity>
    </View>
  );
}

function Segment({ items, value, onChange }) {
  return (
    <View style={styles.segment}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EmptyState({ title, detail }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyText}>{detail}</Text> : null}
    </View>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <View style={[styles.metricCard, tone === 'warning' && styles.metricWarning]}>
      <Text style={styles.metricValue}>{value ?? 0}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? <Button title={actionLabel} onPress={onAction} small /> : null}
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [tab, setTab] = useState('dashboard');
  const [inventoryView, setInventoryView] = useState('products');

  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [verifyForm, setVerifyForm] = useState({ email: '', code: '' });
  const [changeEmail, setChangeEmail] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);

  const [productSearch, setProductSearch] = useState('');
  const [stockBranchFilter, setStockBranchFilter] = useState('');
  const [activeForm, setActiveForm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [productForm, setProductForm] = useState(emptyProduct);
  const [stockActionForm, setStockActionForm] = useState(emptyStockAction);
  const [thresholdForm, setThresholdForm] = useState({ quantity: '10' });
  const [transferForm, setTransferForm] = useState(emptyTransfer);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' });
  const [userRoleForm, setUserRoleForm] = useState({ role: 'USER', branch: '' });

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Ask about stock levels, branches, suppliers, low stock, or transfers.' },
  ]);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isVerified = Boolean(user?.is_email_verified);
  const canWrite = Boolean(user && ['ADMIN', 'STAFF'].includes(user.role) && isVerified);
  const isAdmin = Boolean(user?.role === 'ADMIN' && isVerified);

  const lowStockItems = useMemo(() => stocks.filter((item) => stockState(item) === 'Low'), [stocks]);

  const filteredProducts = useMemo(() => {
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((item) => {
      const text = `${item.name || ''} ${item.sku || ''} ${item.supplier_name || ''}`.toLowerCase();
      return text.includes(needle);
    });
  }, [products, productSearch]);

  const resetMessages = useCallback(() => {
    setError('');
    setInfo('');
  }, []);

  const closeForm = useCallback(() => {
    setActiveForm(null);
    setEditingItem(null);
    setProductForm(emptyProduct);
    setStockActionForm(emptyStockAction);
    setThresholdForm({ quantity: '10' });
    setTransferForm(emptyTransfer);
    setBranchForm(emptyBranch);
    setSupplierForm(emptySupplier);
    setUserRoleForm({ role: 'USER', branch: '' });
  }, []);

  const clearData = useCallback(() => {
    setDashboard(null);
    setProducts([]);
    setStocks([]);
    setBranches([]);
    setSuppliers([]);
    setTransfers([]);
    setHistory([]);
    setUsers([]);
    setProductSearch('');
    setStockBranchFilter('');
    closeForm();
  }, [closeForm]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    clearData();
    setScreen('login');
    setTab('dashboard');
    setLoginForm({ username: '', password: '' });
    setChatMessages([{ role: 'assistant', text: 'Ask about stock levels, branches, suppliers, low stock, or transfers.' }]);
    resetMessages();
  }, [clearData, resetMessages]);

  const loadData = useCallback(async () => {
    if (!isVerified) return;
    setDataLoading(true);
    setError('');
    try {
      const results = await Promise.all([
        api.dashboard.get(),
        api.branches.list(),
        api.products.list(),
        api.suppliers.list(),
        api.stocks.list(stockBranchFilter || undefined),
        api.transfers.list(),
        api.history.list(),
        isAdmin ? api.users.list() : Promise.resolve([]),
      ]);

      setDashboard(results[0]);
      setBranches(asList(results[1]));
      setProducts(asList(results[2]));
      setSuppliers(asList(results[3]));
      setStocks(asList(results[4]));
      setTransfers(asList(results[5]));
      setHistory(asList(results[6]));
      setUsers(asList(results[7]));
    } catch (err) {
      setError(err.message || 'Could not load inventory data.');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, isVerified, stockBranchFilter]);

  useEffect(() => {
    if (screen === 'app' && isVerified) {
      loadData();
    }
  }, [screen, isVerified, loadData]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
      setVerifyForm((current) => ({ ...current, email: current.email || user.email || '' }));
      setChangeEmail(user.email || '');
    }
  }, [user]);

  const handleLogin = async () => {
    resetMessages();
    const username = loginForm.username.trim();
    if (!username || !loginForm.password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.login(username, loginForm.password);
      setTokens(data.access, data.refresh);
      setUser(data.user);
      setVerifyForm({ email: data.user?.email || '', code: '' });
      setLoginForm({ username, password: '' });
      if (data.user?.is_email_verified) {
        setScreen('app');
      } else {
        setScreen('verify');
        setInfo('Enter the verification code sent to your email.');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    resetMessages();
    const payload = {
      username: registerForm.username.trim(),
      email: registerForm.email.trim().toLowerCase(),
      first_name: registerForm.first_name.trim(),
      last_name: registerForm.last_name.trim(),
      password: registerForm.password,
      password_confirm: registerForm.password_confirm,
    };

    if (!payload.username || !payload.email || !payload.first_name || !payload.last_name) {
      setError('All account fields are required.');
      return;
    }
    if (payload.password.length < 8 || payload.password !== payload.password_confirm) {
      setError('Password must be 8 characters or longer and both entries must match.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.register(payload);
      setVerifyForm({ email: payload.email, code: '' });
      setRegisterForm(emptyRegister);
      setScreen('verify');
      setInfo(data.detail || 'Registration complete. Enter your email verification code.');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    resetMessages();
    const email = verifyForm.email.trim().toLowerCase();
    const code = verifyForm.code.trim();
    if (!email || code.length !== 6) {
      setError('Enter your email and 6 digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.verifyEmail(email, code);
      setInfo(data.detail || 'Email verified. Login to continue.');
      if (user) {
        const me = await api.me.get();
        setUser(me);
        if (me.is_email_verified) {
          setScreen('app');
          return;
        }
      }
      setScreen('login');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    resetMessages();
    const email = verifyForm.email.trim().toLowerCase();
    if (!email) {
      setError('Email is required before resending a code.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.resendVerification(email);
      setInfo(data.detail || 'Verification code resent.');
    } catch (err) {
      setError(err.message || 'Could not resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    resetMessages();
    const email = changeEmail.trim().toLowerCase();
    if (!email) {
      setError('New email is required.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.changeEmail(email);
      setVerifyForm({ email, code: '' });
      setInfo(data.detail || 'Email changed and a new code was sent.');
    } catch (err) {
      setError(err.message || 'Could not change email.');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const me = await api.me.get();
    setUser(me);
    return me;
  };

  const saveProfile = async () => {
    resetMessages();
    setLoading(true);
    try {
      const data = await api.me.patch({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim().toLowerCase(),
      });
      setUser(data);
      if (!data.is_email_verified) {
        setVerifyForm({ email: data.email, code: '' });
        setScreen('verify');
      }
      setInfo('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  const openProductForm = (product) => {
    resetMessages();
    setEditingItem(product || null);
    setProductForm(
      product
        ? {
            name: product.name || '',
            sku: product.sku || '',
            price: String(product.price ?? ''),
            description: product.description || '',
            supplier: product.supplier ? String(product.supplier) : '',
          }
        : emptyProduct
    );
    setActiveForm(product ? 'edit_product' : 'add_product');
  };

  const saveProduct = async () => {
    resetMessages();
    if (!canWrite) return;
    const price = Number(productForm.price);
    if (!productForm.name.trim() || !productForm.sku.trim() || !Number.isFinite(price)) {
      setError('Product name, SKU, and valid price are required.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim().toUpperCase(),
        price,
        description: productForm.description.trim(),
        supplier: productForm.supplier ? Number(productForm.supplier) : null,
      };

      if (activeForm === 'edit_product' && editingItem) {
        await api.products.update(editingItem.id, body);
        setInfo('Product updated.');
      } else {
        await api.products.create(body);
        setInfo('Product added.');
      }
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not save product.');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = (product) => {
    Alert.alert('Delete product', `Delete ${product.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          resetMessages();
          setLoading(true);
          try {
            await api.products.delete(product.id);
            setInfo('Product deleted.');
            await loadData();
          } catch (err) {
            setError(err.message || 'Could not delete product.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const saveBranch = async () => {
    resetMessages();
    if (!canWrite) return;
    if (!branchForm.name.trim() || !branchForm.location.trim()) {
      setError('Branch name and location are required.');
      return;
    }

    setLoading(true);
    try {
      await api.branches.create({ name: branchForm.name.trim(), location: branchForm.location.trim() });
      setInfo('Branch added.');
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not save branch.');
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = (branch) => {
    Alert.alert('Delete branch', `Delete ${branch.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          resetMessages();
          setLoading(true);
          try {
            await api.branches.delete(branch.id);
            setInfo('Branch deleted.');
            await loadData();
          } catch (err) {
            setError(err.message || 'Could not delete branch.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const saveSupplier = async () => {
    resetMessages();
    if (!canWrite) return;
    if (!supplierForm.name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    setLoading(true);
    try {
      await api.suppliers.create({
        name: supplierForm.name.trim(),
        email: supplierForm.email.trim() || undefined,
        contact_person: supplierForm.contact_person.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
      });
      setInfo('Supplier added.');
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not save supplier.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSupplier = (supplier) => {
    Alert.alert('Delete supplier', `Delete ${supplier.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          resetMessages();
          setLoading(true);
          try {
            await api.suppliers.delete(supplier.id);
            setInfo('Supplier deleted.');
            await loadData();
          } catch (err) {
            setError(err.message || 'Could not delete supplier.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const saveStockAction = async () => {
    resetMessages();
    if (!canWrite) return;
    const quantity = Number(stockActionForm.quantity);
    if (!stockActionForm.branch_id || !stockActionForm.product_id || !Number.isFinite(quantity) || quantity < 1) {
      setError('Branch ID, product ID, and a positive quantity are required.');
      return;
    }

    setLoading(true);
    try {
      if (activeForm === 'record_sale') {
        await api.stocks.recordSale(stockActionForm.branch_id, stockActionForm.product_id, quantity);
        setInfo('Sale recorded.');
      } else {
        await api.stocks.addStock(stockActionForm.branch_id, stockActionForm.product_id, quantity);
        setInfo('Stock added.');
      }
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not update stock.');
    } finally {
      setLoading(false);
    }
  };

  const openThresholdForm = (stock) => {
    resetMessages();
    setEditingItem(stock);
    setThresholdForm({ quantity: String(stock.low_stock_threshold ?? 10) });
    setActiveForm('threshold');
  };

  const saveThreshold = async () => {
    resetMessages();
    if (!canWrite || !editingItem) return;
    const limit = Number(thresholdForm.quantity);
    if (!Number.isFinite(limit) || limit < 0) {
      setError('Low stock threshold must be zero or higher.');
      return;
    }

    setLoading(true);
    try {
      await api.stocks.update(editingItem.id, {
        branch: editingItem.branch,
        product: editingItem.product,
        quantity: editingItem.quantity,
        low_stock_threshold: limit,
      });
      setInfo('Low stock threshold updated.');
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not update threshold.');
    } finally {
      setLoading(false);
    }
  };

  const saveTransfer = async () => {
    resetMessages();
    if (!canWrite) return;
    const quantity = Number(transferForm.quantity);
    if (!transferForm.product || !transferForm.from_branch || !transferForm.to_branch || !Number.isFinite(quantity)) {
      setError('Product, source branch, destination branch, and quantity are required.');
      return;
    }
    if (transferForm.from_branch === transferForm.to_branch) {
      setError('Source and destination branches must be different.');
      return;
    }

    setLoading(true);
    try {
      await api.transfers.create({
        product: transferForm.product,
        from_branch: transferForm.from_branch,
        to_branch: transferForm.to_branch,
        quantity,
      });
      setInfo('Transfer created.');
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not create transfer.');
    } finally {
      setLoading(false);
    }
  };

  const changeTransferStatus = async (transfer, action) => {
    resetMessages();
    if (!canWrite) return;
    setLoading(true);
    try {
      if (action === 'complete') {
        await api.transfers.complete(transfer.id);
        setInfo('Transfer completed.');
      } else {
        await api.transfers.cancel(transfer.id);
        setInfo('Transfer cancelled.');
      }
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not update transfer.');
    } finally {
      setLoading(false);
    }
  };

  const openUserRoleForm = (item) => {
    resetMessages();
    setEditingItem(item);
    setUserRoleForm({ role: item.role || 'USER', branch: item.branch || '' });
    setActiveForm('user_role');
  };

  const saveUserRole = async () => {
    resetMessages();
    if (!isAdmin || !editingItem) return;
    setLoading(true);
    try {
      await api.users.update(editingItem.id, {
        role: userRoleForm.role,
        branch: userRoleForm.branch ? Number(userRoleForm.branch) : null,
      });
      setInfo('User access updated.');
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not update user.');
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    resetMessages();
    const message = chatInput.trim();
    if (!message) return;
    setChatInput('');
    setChatMessages((items) => [...items, { role: 'user', text: message }]);
    setChatLoading(true);
    try {
      const data = await api.chat.send(message);
      setChatMessages((items) => [...items, { role: 'assistant', text: data.reply || 'No reply returned.' }]);
    } catch (err) {
      setChatMessages((items) => [...items, { role: 'assistant', text: err.message || 'Chat request failed.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const renderAuthShell = (children, title, subtitle) => (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.authHeader}>
            <Text style={styles.authKicker}>Mobile Frontend</Text>
            <Text style={styles.authTitle}>Multi-Branch Inventory</Text>
            <Text style={styles.authSubtitle}>Connected to the Django API at {API_BASE}</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.formTitle}>{title}</Text>
            {subtitle ? <Text style={styles.formHelp}>{subtitle}</Text> : null}
            <Notice type="error" message={error} onDismiss={() => setError('')} />
            <Notice type="info" message={info} onDismiss={() => setInfo('')} />
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );

  const renderLogin = () =>
    renderAuthShell(
      <>
        <Field
          label="Username"
          value={loginForm.username}
          onChangeText={(value) => setLoginForm((form) => ({ ...form, username: value }))}
          placeholder="admin"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={loginForm.password}
          onChangeText={(value) => setLoginForm((form) => ({ ...form, password: value }))}
          placeholder="Your password"
          secureTextEntry
        />
        <Button title={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} disabled={loading} />
        <Button title="Create account" variant="ghost" onPress={() => { resetMessages(); setScreen('register'); }} />
      </>,
      'Sign in',
      'Use the same accounts and roles as the React web frontend.'
    );

  const renderRegister = () =>
    renderAuthShell(
      <>
        <Field label="Username" value={registerForm.username} onChangeText={(value) => setRegisterForm((form) => ({ ...form, username: value }))} placeholder="newuser" />
        <Field label="Email" value={registerForm.email} onChangeText={(value) => setRegisterForm((form) => ({ ...form, email: value }))} placeholder="name@example.com" keyboardType="email-address" />
        <Field label="First name" value={registerForm.first_name} onChangeText={(value) => setRegisterForm((form) => ({ ...form, first_name: value }))} placeholder="First name" autoCapitalize="words" />
        <Field label="Last name" value={registerForm.last_name} onChangeText={(value) => setRegisterForm((form) => ({ ...form, last_name: value }))} placeholder="Last name" autoCapitalize="words" />
        <Field label="Password" value={registerForm.password} onChangeText={(value) => setRegisterForm((form) => ({ ...form, password: value }))} placeholder="At least 8 characters" secureTextEntry />
        <Field label="Confirm password" value={registerForm.password_confirm} onChangeText={(value) => setRegisterForm((form) => ({ ...form, password_confirm: value }))} placeholder="Repeat password" secureTextEntry />
        <Button title={loading ? 'Creating...' : 'Create account'} onPress={handleRegister} disabled={loading} />
        <Button title="Back to sign in" variant="ghost" onPress={() => { resetMessages(); setScreen('login'); }} />
      </>,
      'Create account',
      'New accounts must verify email before inventory data opens.'
    );

  const renderVerify = () =>
    renderAuthShell(
      <>
        <Field label="Email" value={verifyForm.email} onChangeText={(value) => setVerifyForm((form) => ({ ...form, email: value }))} placeholder="name@example.com" keyboardType="email-address" />
        <Field label="6 digit code" value={verifyForm.code} onChangeText={(value) => setVerifyForm((form) => ({ ...form, code: value.replace(/[^0-9]/g, '').slice(0, 6) }))} placeholder="123456" keyboardType="number-pad" />
        <Button title={loading ? 'Verifying...' : 'Verify email'} onPress={handleVerifyEmail} disabled={loading} />
        <View style={styles.inlineActions}>
          <Button title="Resend code" variant="secondary" small onPress={handleResendCode} disabled={loading} />
          <Button title={user ? 'Logout' : 'Sign in'} variant="ghost" small onPress={user ? logout : () => setScreen('login')} />
        </View>
        {user ? (
          <View style={styles.dividerBlock}>
            <Field label="Change email" value={changeEmail} onChangeText={setChangeEmail} placeholder="new@example.com" keyboardType="email-address" />
            <Button title="Send code to new email" variant="secondary" onPress={handleChangeEmail} disabled={loading} />
          </View>
        ) : null}
      </>,
      'Verify email',
      'Enter the code sent by the Django backend email service.'
    );

  const renderFormPanel = () => {
    if (!activeForm) return null;

    const titleMap = {
      add_product: 'Add product',
      edit_product: 'Edit product',
      add_stock: 'Add stock',
      record_sale: 'Record sale',
      threshold: 'Update threshold',
      transfer: 'Create transfer',
      branch: 'Add branch',
      supplier: 'Add supplier',
      user_role: 'Edit user access',
    };

    return (
      <View style={styles.formPanel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.formTitle}>{titleMap[activeForm]}</Text>
          <Button title="Close" variant="ghost" small onPress={closeForm} />
        </View>

        {(activeForm === 'add_product' || activeForm === 'edit_product') && (
          <>
            <Field label="Name" value={productForm.name} onChangeText={(value) => setProductForm((form) => ({ ...form, name: value }))} placeholder="Product name" autoCapitalize="words" />
            <Field label="SKU" value={productForm.sku} onChangeText={(value) => setProductForm((form) => ({ ...form, sku: value }))} placeholder="SKU" autoCapitalize="characters" />
            <Field label="Price" value={productForm.price} onChangeText={(value) => setProductForm((form) => ({ ...form, price: value }))} placeholder="0.00" keyboardType="decimal-pad" />
            <Field label="Supplier ID" value={productForm.supplier} onChangeText={(value) => setProductForm((form) => ({ ...form, supplier: value }))} placeholder="Optional supplier ID" keyboardType="number-pad" />
            <Field label="Description" value={productForm.description} onChangeText={(value) => setProductForm((form) => ({ ...form, description: value }))} placeholder="Optional details" multiline />
            <Button title="Save product" onPress={saveProduct} disabled={loading} />
          </>
        )}

        {(activeForm === 'add_stock' || activeForm === 'record_sale') && (
          <>
            <Field label="Branch ID" value={stockActionForm.branch_id} onChangeText={(value) => setStockActionForm((form) => ({ ...form, branch_id: value }))} placeholder="Branch ID" keyboardType="number-pad" />
            <Field label="Product ID" value={stockActionForm.product_id} onChangeText={(value) => setStockActionForm((form) => ({ ...form, product_id: value }))} placeholder="Product ID" keyboardType="number-pad" />
            <Field label="Quantity" value={stockActionForm.quantity} onChangeText={(value) => setStockActionForm((form) => ({ ...form, quantity: value }))} placeholder="1" keyboardType="number-pad" />
            <Button title={activeForm === 'record_sale' ? 'Record sale' : 'Add stock'} onPress={saveStockAction} disabled={loading} />
          </>
        )}

        {activeForm === 'threshold' && (
          <>
            <Text style={styles.formHelp}>
              {editingItem?.product_name} at {editingItem?.branch_name}
            </Text>
            <Field label="Low stock threshold" value={thresholdForm.quantity} onChangeText={(value) => setThresholdForm({ quantity: value })} placeholder="10" keyboardType="number-pad" />
            <Button title="Update threshold" onPress={saveThreshold} disabled={loading} />
          </>
        )}

        {activeForm === 'transfer' && (
          <>
            <Field label="Product ID" value={transferForm.product} onChangeText={(value) => setTransferForm((form) => ({ ...form, product: value }))} placeholder="Product ID" keyboardType="number-pad" />
            <Field label="From branch ID" value={transferForm.from_branch} onChangeText={(value) => setTransferForm((form) => ({ ...form, from_branch: value }))} placeholder="Source branch ID" keyboardType="number-pad" />
            <Field label="To branch ID" value={transferForm.to_branch} onChangeText={(value) => setTransferForm((form) => ({ ...form, to_branch: value }))} placeholder="Destination branch ID" keyboardType="number-pad" />
            <Field label="Quantity" value={transferForm.quantity} onChangeText={(value) => setTransferForm((form) => ({ ...form, quantity: value }))} placeholder="1" keyboardType="number-pad" />
            <Button title="Create transfer" onPress={saveTransfer} disabled={loading} />
          </>
        )}

        {activeForm === 'branch' && (
          <>
            <Field label="Branch name" value={branchForm.name} onChangeText={(value) => setBranchForm((form) => ({ ...form, name: value }))} placeholder="Branch name" autoCapitalize="words" />
            <Field label="Location" value={branchForm.location} onChangeText={(value) => setBranchForm((form) => ({ ...form, location: value }))} placeholder="Address or area" autoCapitalize="words" />
            <Button title="Save branch" onPress={saveBranch} disabled={loading} />
          </>
        )}

        {activeForm === 'supplier' && (
          <>
            <Field label="Supplier name" value={supplierForm.name} onChangeText={(value) => setSupplierForm((form) => ({ ...form, name: value }))} placeholder="Supplier name" autoCapitalize="words" />
            <Field label="Email" value={supplierForm.email} onChangeText={(value) => setSupplierForm((form) => ({ ...form, email: value }))} placeholder="supplier@example.com" keyboardType="email-address" />
            <Field label="Contact person" value={supplierForm.contact_person} onChangeText={(value) => setSupplierForm((form) => ({ ...form, contact_person: value }))} placeholder="Contact name" autoCapitalize="words" />
            <Field label="Phone" value={supplierForm.phone} onChangeText={(value) => setSupplierForm((form) => ({ ...form, phone: value }))} placeholder="Phone number" keyboardType="phone-pad" />
            <Field label="Address" value={supplierForm.address} onChangeText={(value) => setSupplierForm((form) => ({ ...form, address: value }))} placeholder="Address" multiline autoCapitalize="words" />
            <Button title="Save supplier" onPress={saveSupplier} disabled={loading} />
          </>
        )}

        {activeForm === 'user_role' && (
          <>
            <Text style={styles.formHelp}>Updating @{editingItem?.username}</Text>
            <Field label="Role" value={userRoleForm.role} onChangeText={(value) => setUserRoleForm((form) => ({ ...form, role: value.toUpperCase() }))} placeholder="ADMIN, STAFF, or USER" autoCapitalize="characters" />
            <Field label="Branch ID" value={String(userRoleForm.branch || '')} onChangeText={(value) => setUserRoleForm((form) => ({ ...form, branch: value }))} placeholder="Optional branch ID" keyboardType="number-pad" />
            <Button title="Save access" onPress={saveUserRole} disabled={loading} />
          </>
        )}
      </View>
    );
  };

  const renderDashboard = () => {
    const stats = dashboard?.stats || {};
    const branchStock = dashboard?.stock_by_branch || [];
    const recent = dashboard?.recent_activities || history.slice(0, 5);
    const branchMax = Math.max(1, ...branchStock.map((item) => Number(item.value || 0)));

    return (
      <View>
        <Text style={styles.screenTitle}>Overview</Text>
        <Text style={styles.screenSubtitle}>Welcome back, {displayName(user)}.</Text>

        <View style={styles.metricsGrid}>
          <MetricCard label="Products" value={stats.total_products ?? products.length} />
          <MetricCard label="Branches" value={stats.total_branches ?? branches.length} />
          <MetricCard label="Units" value={stats.total_inventory ?? stocks.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} />
          <MetricCard label="Low stock" value={stats.low_stock_alerts ?? lowStockItems.length} tone="warning" />
          <MetricCard label="Transfers" value={stats.active_transfers ?? transfers.filter((item) => item.status === 'PENDING').length} />
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Low stock alerts" actionLabel={lowStockItems.length ? 'Open' : ''} onAction={() => { setTab('inventory'); setInventoryView('stocks'); }} />
          {lowStockItems.length ? (
            lowStockItems.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.listRow}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.product_name}</Text>
                  <Text style={styles.rowMeta}>{item.branch_name} - {item.quantity} left, limit {item.low_stock_threshold}</Text>
                </View>
                <Text style={styles.statusDanger}>Low</Text>
              </View>
            ))
          ) : (
            <EmptyState title="No critical stock" detail="All loaded branches are above their thresholds." />
          )}
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Stock by branch" />
          {branchStock.length ? (
            branchStock.map((item) => (
              <View key={item.name} style={styles.progressRow}>
                <View style={styles.progressHeader}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.value} units</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (Number(item.value || 0) / branchMax) * 100)}%` }]} />
                </View>
              </View>
            ))
          ) : (
            <EmptyState title="No branch stock yet" detail="Create branch stock from the inventory tab." />
          )}
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Recent activity" actionLabel="History" onAction={() => { setTab('inventory'); setInventoryView('history'); }} />
          {recent.length ? recent.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.product_name || 'Inventory item'}</Text>
                <Text style={styles.rowMeta}>{item.movement_type} at {item.branch_name} - Qty {item.quantity}</Text>
              </View>
              <Text style={styles.rowDate}>{item.date_formatted || formatDate(item.date)}</Text>
            </View>
          )) : <EmptyState title="No activity yet" detail="Stock changes will appear here." />}
        </View>
      </View>
    );
  };

  const renderProducts = () => (
    <View style={styles.panel}>
      <SectionHeader title="Products" actionLabel={canWrite ? 'Add' : ''} onAction={() => openProductForm()} />
      <Field label="Search" value={productSearch} onChangeText={setProductSearch} placeholder="Search name, SKU, or supplier" />
      {filteredProducts.length ? filteredProducts.map((item) => (
        <View key={item.id} style={styles.itemCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>ID {item.id} - SKU {item.sku}</Text>
              <Text style={styles.rowMeta}>{item.supplier_name || 'No supplier'} - {money(item.price)}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.rowDescription}>{item.description}</Text> : null}
          {canWrite ? (
            <View style={styles.inlineActions}>
              <Button title="Edit" variant="secondary" small onPress={() => openProductForm(item)} />
              <Button title="Delete" variant="danger" small onPress={() => deleteProduct(item)} />
            </View>
          ) : null}
        </View>
      )) : <EmptyState title="No products found" detail="Add products from the mobile app or the React web frontend." />}
    </View>
  );

  const renderStocks = () => (
    <View style={styles.panel}>
      <SectionHeader title="Branch stock" />
      {canWrite ? (
        <View style={styles.inlineActions}>
          <Button title="Add stock" small onPress={() => { setActiveForm('add_stock'); setStockActionForm(emptyStockAction); }} />
          <Button title="Record sale" variant="secondary" small onPress={() => { setActiveForm('record_sale'); setStockActionForm(emptyStockAction); }} />
        </View>
      ) : null}
      <Field label="Filter by branch ID" value={stockBranchFilter} onChangeText={setStockBranchFilter} placeholder="Leave blank for all branches" keyboardType="number-pad" />
      {stocks.length ? stocks.map((item) => {
        const state = stockState(item);
        return (
          <View key={item.id} style={[styles.itemCard, state === 'Low' && styles.itemCardDanger]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.product_name}</Text>
                <Text style={styles.rowMeta}>Stock ID {item.id} - Product ID {item.product} - Branch ID {item.branch}</Text>
                <Text style={styles.rowMeta}>{item.branch_name} - Threshold {item.low_stock_threshold}</Text>
              </View>
              <Text style={state === 'Low' ? styles.statusDanger : styles.statusGood}>{state}</Text>
            </View>
            <Text style={styles.bigNumber}>{item.quantity}</Text>
            {canWrite ? (
              <View style={styles.inlineActions}>
                <Button title="Threshold" variant="secondary" small onPress={() => openThresholdForm(item)} />
                <Button
                  title="Sale"
                  variant="ghost"
                  small
                  onPress={() => {
                    setStockActionForm({ branch_id: String(item.branch), product_id: String(item.product), quantity: '1' });
                    setActiveForm('record_sale');
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      }) : <EmptyState title="No stock records" detail="Use Add stock to create branch stock records." />}
    </View>
  );

  const renderBranches = () => (
    <View style={styles.panel}>
      <SectionHeader title="Branches" actionLabel={canWrite ? 'Add' : ''} onAction={() => setActiveForm('branch')} />
      {branches.length ? branches.map((item) => (
        <View key={item.id} style={styles.itemCard}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>ID {item.id}</Text>
          <Text style={styles.rowDescription}>{item.location}</Text>
          {canWrite ? <Button title="Delete" variant="danger" small onPress={() => deleteBranch(item)} /> : null}
        </View>
      )) : <EmptyState title="No branches" detail="Add your first branch to start tracking inventory by location." />}
    </View>
  );

  const renderSuppliers = () => (
    <View style={styles.panel}>
      <SectionHeader title="Suppliers" actionLabel={canWrite ? 'Add' : ''} onAction={() => setActiveForm('supplier')} />
      {suppliers.length ? suppliers.map((item) => (
        <View key={item.id} style={styles.itemCard}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>ID {item.id} - {item.contact_person || 'No contact person'}</Text>
          <Text style={styles.rowMeta}>{item.email || 'No email'} - {item.phone || 'No phone'}</Text>
          {item.address ? <Text style={styles.rowDescription}>{item.address}</Text> : null}
          {canWrite ? <Button title="Delete" variant="danger" small onPress={() => deleteSupplier(item)} /> : null}
        </View>
      )) : <EmptyState title="No suppliers" detail="Suppliers added on web are available here too." />}
    </View>
  );

  const renderHistory = () => (
    <View style={styles.panel}>
      <SectionHeader title="Movement history" />
      {history.length ? history.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.product_name}</Text>
            <Text style={styles.rowMeta}>{item.movement_type} at {item.branch_name} - Qty {item.quantity}</Text>
            <Text style={styles.rowMeta}>{item.reference || 'No reference'} by {item.performed_by_name || 'system'}</Text>
          </View>
          <Text style={styles.rowDate}>{item.date_formatted || formatDate(item.date)}</Text>
        </View>
      )) : <EmptyState title="No movement history" detail="Stock actions will be tracked here." />}
    </View>
  );

  const renderInventory = () => (
    <View>
      <Text style={styles.screenTitle}>Inventory</Text>
      <Segment
        value={inventoryView}
        onChange={setInventoryView}
        items={[
          { id: 'products', label: 'Products' },
          { id: 'stocks', label: 'Stock' },
          { id: 'branches', label: 'Branches' },
          { id: 'suppliers', label: 'Suppliers' },
          { id: 'history', label: 'History' },
        ]}
      />
      {inventoryView === 'products' && renderProducts()}
      {inventoryView === 'stocks' && renderStocks()}
      {inventoryView === 'branches' && renderBranches()}
      {inventoryView === 'suppliers' && renderSuppliers()}
      {inventoryView === 'history' && renderHistory()}
    </View>
  );

  const renderTransfers = () => (
    <View>
      <Text style={styles.screenTitle}>Transfers</Text>
      <View style={styles.panel}>
        <SectionHeader title="Stock transfers" actionLabel={canWrite ? 'New' : ''} onAction={() => setActiveForm('transfer')} />
        {transfers.length ? transfers.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.product_name}</Text>
                <Text style={styles.rowMeta}>{item.from_branch_name} to {item.to_branch_name}</Text>
                <Text style={styles.rowMeta}>Qty {item.quantity} - {formatDate(item.created_at)}</Text>
              </View>
              <Text style={item.status === 'PENDING' ? styles.statusWarning : styles.statusGood}>{item.status}</Text>
            </View>
            {canWrite && item.status === 'PENDING' ? (
              <View style={styles.inlineActions}>
                <Button title="Complete" small onPress={() => changeTransferStatus(item, 'complete')} />
                <Button title="Cancel" variant="secondary" small onPress={() => changeTransferStatus(item, 'cancel')} />
              </View>
            ) : null}
          </View>
        )) : <EmptyState title="No transfers" detail="Create a transfer to move stock between branches." />}
      </View>
    </View>
  );

  const renderChat = () => (
    <View>
      <Text style={styles.screenTitle}>AI Assistant</Text>
      <View style={styles.panel}>
        <ScrollView style={styles.chatFeed} nestedScrollEnabled>
          {chatMessages.map((item, index) => (
            <View key={`${item.role}-${index}`} style={[styles.chatBubble, item.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant]}>
              <Text style={[styles.chatText, item.role === 'user' && styles.chatTextUser]}>{item.text}</Text>
            </View>
          ))}
          {chatLoading ? <ActivityIndicator color="#2563eb" style={styles.chatLoading} /> : null}
        </ScrollView>
        <View style={styles.chatBar}>
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Ask about inventory..."
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.chatInput]}
            multiline
          />
          <Button title="Send" small onPress={sendChat} disabled={chatLoading} />
        </View>
      </View>
    </View>
  );

  const renderProfile = () => (
    <View>
      <Text style={styles.screenTitle}>Profile</Text>
      <View style={styles.panel}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName(user).slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{displayName(user)}</Text>
            <Text style={styles.rowMeta}>@{user?.username} - {user?.role}</Text>
            <Text style={isVerified ? styles.statusGood : styles.statusWarning}>
              {isVerified ? 'Verified' : 'Needs verification'}
            </Text>
          </View>
        </View>

        <Field label="First name" value={profileForm.first_name} onChangeText={(value) => setProfileForm((form) => ({ ...form, first_name: value }))} placeholder="First name" autoCapitalize="words" />
        <Field label="Last name" value={profileForm.last_name} onChangeText={(value) => setProfileForm((form) => ({ ...form, last_name: value }))} placeholder="Last name" autoCapitalize="words" />
        <Field label="Email" value={profileForm.email} onChangeText={(value) => setProfileForm((form) => ({ ...form, email: value }))} placeholder="name@example.com" keyboardType="email-address" />
        <View style={styles.inlineActions}>
          <Button title="Save profile" onPress={saveProfile} disabled={loading} />
          <Button title="Refresh" variant="secondary" onPress={refreshProfile} />
        </View>
      </View>

      {isAdmin ? (
        <View style={styles.panel}>
          <SectionHeader title="Users" />
          {users.length ? users.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{displayName(item)}</Text>
                <Text style={styles.rowMeta}>@{item.username} - {item.email}</Text>
                <Text style={styles.rowMeta}>{item.role} - {item.branch_name || 'All branches'}</Text>
              </View>
              <Button title="Access" variant="secondary" small onPress={() => openUserRoleForm(item)} />
            </View>
          )) : <EmptyState title="No users" detail="Admin-managed users will appear here." />}
        </View>
      ) : null}
    </View>
  );

  const renderActiveTab = () => {
    if (tab === 'dashboard') return renderDashboard();
    if (tab === 'inventory') return renderInventory();
    if (tab === 'transfers') return renderTransfers();
    if (tab === 'chat') return renderChat();
    return renderProfile();
  };

  if (screen === 'register') return renderRegister();
  if (screen === 'verify') return renderVerify();
  if (screen === 'login' || !user) return renderLogin();
  if (!isVerified) return renderVerify();

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.appHeader}>
          <View style={styles.rowBody}>
            <Text style={styles.appTitle}>Inventory Mobile</Text>
            <Text style={styles.appSubtitle}>{user.role} - {user.branch_name || 'All branches'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Button title="Refresh" variant="secondary" small onPress={loadData} disabled={dataLoading} />
            <Button title="Logout" variant="ghost" small onPress={logout} />
          </View>
        </View>

        <Notice type="error" message={error} onDismiss={() => setError('')} />
        <Notice type="info" message={info} onDismiss={() => setInfo('')} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {dataLoading && !dashboard ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.loadingText}>Loading inventory data...</Text>
            </View>
          ) : null}
          {renderFormPanel()}
          {renderActiveTab()}
        </ScrollView>

        <View style={styles.bottomNav}>
          {[
            { id: 'dashboard', label: 'Home' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'transfers', label: 'Transfers' },
            { id: 'chat', label: 'Chat' },
            { id: 'profile', label: 'Profile' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[styles.navItem, tab === item.id && styles.navItemActive]}
            >
              <Text style={[styles.navText, tab === item.id && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
