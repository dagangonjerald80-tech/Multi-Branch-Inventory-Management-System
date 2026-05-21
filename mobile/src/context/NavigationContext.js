import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  // Screens: 'login', 'register', 'pending', 'app'
  const [currentScreen, setCurrentScreen] = useState('login');
  
  // Tabs: 'dashboard', 'inventory', 'transfers', 'chat', 'profile'
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Sub-tabs: 'products', 'stocks', 'suppliers', 'branches', 'history'
  const [invSubTab, setInvSubTab] = useState('products');
  
  // Parameters to pass to screens (e.g. user ID for UserDetail)
  const [params, setParams] = useState({});

  // Modals & Action Drawer states
  const [activeModal, setActiveModal] = useState(null); 
  const [editingItem, setEditingItem] = useState(null); 
  
  // Global messages
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const navigate = useCallback((screen, newParams = {}) => {
    setCurrentScreen(screen);
    setParams(newParams);
  }, []);

  const value = useMemo(() => ({
    currentScreen,
    setCurrentScreen,
    currentTab,
    setCurrentTab,
    invSubTab,
    setInvSubTab,
    params,
    navigate,
    activeModal,
    setActiveModal,
    editingItem,
    setEditingItem,
    error,
    setError,
    info,
    setInfo,
  }), [
    currentScreen, currentTab, invSubTab, params, navigate, 
    activeModal, editingItem, error, info
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
