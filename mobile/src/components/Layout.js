import React from 'react';
import { KeyboardAvoidingView, ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { styles } from '../styles';

export default function Layout({ children, showTabs = true }) {
  const { user } = useAuth();
  const { currentTab, setCurrentTab, error, setError, info, setInfo } = useNavigation();

  // Helper color for roles
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

        {/* MAIN CONTENT injected here */}
        {children}

      </ScrollView>
      
      {/* SUB LAYOUT: BOTTOM TABS BAR - Display only if requested and logged in */}
      {user && showTabs && (
        <View style={{ paddingHorizontal: 16, backgroundColor: '#f8fafc', paddingBottom: Platform.OS === 'ios' ? 24 : 10 }}>
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
                onPress={() => setCurrentTab(t.id)}
                style={[styles.tabButton, currentTab === t.id && styles.tabButtonActive]}
              >
                <Text style={styles.tabIcon}>{t.icon}</Text>
                <Text style={[styles.tabLabel, currentTab === t.id && styles.tabLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <StatusBar style="dark" />
    </KeyboardAvoidingView>
  );
}
