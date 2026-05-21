import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth, useCanWrite, useIsAdmin } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { api } from '../api';
import { styles } from '../styles';

export default function ModalManager({ 
  productForm, setProductForm, 
  stockForm, setStockForm, 
  thresholdForm, setThresholdForm, 
  transferForm, setTransferForm, 
  branchForm, setBranchForm, 
  supplierForm, setSupplierForm, 
  userRoleForm, setUserRoleForm,
  loadMainData 
}) {
  const { 
    activeModal, setActiveModal, 
    editingItem, setEditingItem, 
    setError, setInfo 
  } = useNavigation();
  
  const canWrite = useCanWrite();
  const isAdmin = useIsAdmin();
  const [loading, setLoading] = useState(false);

  if (!activeModal) return null;

  // --- Submit Handlers ---
  const handleProductSubmit = async () => {
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
        await api.products.create(body);
        setInfo('Product added successfully!');
      } else if (activeModal === 'edit_product' && editingItem) {
        await api.products.update(editingItem.id, body);
        setInfo('Product updated successfully!');
      }

      setActiveModal(null);
      setEditingItem(null);
      setProductForm({ name: '', sku: '', price: '', description: '', supplier: '' });
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Error processing product.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockActionSubmit = async () => {
    setError('');
    const { branch_id, product_id, quantity } = stockForm;
    const qtyNum = parseInt(quantity, 10);
    if (!branch_id || !product_id || isNaN(qtyNum) || qtyNum < 1) {
      setError('Ensure branch, product, and a valid quantity (1+) are provided.');
      return;
    }
    setLoading(true);
    try {
      if (activeModal === 'add_stock') {
        await api.stocks.addStock(branch_id, product_id, qtyNum);
        setInfo('Stock level added!');
      } else {
        await api.stocks.recordSale(branch_id, product_id, qtyNum);
        setInfo('Sale recorded!');
      }
      setActiveModal(null);
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Stock operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdSubmit = async () => {
    if (!editingItem) return;
    const qty = parseInt(thresholdForm.quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setError('Threshold must be a valid number (0+).');
      return;
    }
    setLoading(true);
    try {
      await api.stocks.update(editingItem.id, {
        low_stock_threshold: qty,
        branch: editingItem.branch,
        product: editingItem.product,
      });
      setInfo('Threshold updated successfully.');
      setActiveModal(null);
      setEditingItem(null);
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Threshold update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async () => {
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
      await api.transfers.create({
        product: product_id,
        from_branch: from_branch_id,
        to_branch: to_branch_id,
        quantity: qty,
      });
      setInfo('Stock transfer initiated.');
      setActiveModal(null);
      setTransferForm({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '10' });
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Stock transfer initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSubmit = async () => {
    if (!canWrite) return;
    const { name, location } = branchForm;
    if (!name.trim() || !location.trim()) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await api.branches.create({ name: name.trim(), location: location.trim() });
      setInfo('Branch created.');
      setBranchForm({ name: '', location: '' });
      setActiveModal(null);
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Branch creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSubmit = async () => {
    if (!canWrite) return;
    const { name, email, contact_person, phone, address } = supplierForm;
    if (!name.trim()) {
      setError('Supplier name is required.');
      return;
    }
    setLoading(true);
    try {
      await api.suppliers.create({
        name: name.trim(),
        email: email.trim() || undefined,
        contact_person: contact_person.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      setInfo('Supplier created.');
      setSupplierForm({ name: '', email: '', contact_person: '', phone: '', address: '' });
      setActiveModal(null);
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Supplier creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserRoleUpdate = async () => {
    if (!isAdmin || !editingItem) return;
    setError('');
    setLoading(true);
    try {
      const body = {
        role: userRoleForm.role,
        branch_id: userRoleForm.branch_id ? Number(userRoleForm.branch_id) : null,
      };
      await api.users.update(editingItem.id, body);
      setInfo('User role and branch assignment updated.');
      setActiveModal(null);
      setEditingItem(null);
      if (loadMainData) loadMainData();
    } catch (e) {
      setError(e.message || 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleProductSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Details</Text>}
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStockActionSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Apply Stock Adjustment</Text>}
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleThresholdSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update threshold</Text>}
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleTransferSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Transfer Request</Text>}
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleBranchSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Branch</Text>}
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSupplierSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Supplier</Text>}
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
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUserRoleUpdate} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirm System Roles</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.modalCancelBtn} 
          onPress={() => { setActiveModal(null); setEditingItem(null); setError(''); }}
        >
          <Text style={styles.modalCancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
