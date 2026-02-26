
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { PlusIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons';
import { Item } from '../types';
import { useSortableData } from '../hooks/useSortableData';

const ItemForm: React.FC<{ onClose: () => void, itemToEdit: Item | null }> = ({ onClose, itemToEdit }) => {
  const { addItem, updateItem, showNotification } = useData();
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    quantity: 0,
    rentalPrice: 0,
    remarks: '',
  });

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        name: itemToEdit.name,
        model: itemToEdit.model,
        quantity: itemToEdit.quantity,
        rentalPrice: itemToEdit.rentalPrice,
        remarks: itemToEdit.remarks,
      });
    } else {
      setFormData({ name: '', model: '', quantity: 0, rentalPrice: 0, remarks: '' });
    }
  }, [itemToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (itemToEdit) {
      const result = await updateItem({ ...itemToEdit, ...formData });
      if (!result.success) {
        alert(result.message);
        return;
      }
      showNotification("Item Successfully Updated");
    } else {
      await addItem(formData);
      showNotification("Item Successfully Saved");
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input id="name" name="name" label="Item Name" required value={formData.name} onChange={handleChange} />
        <Input id="model" name="model" label="Model/Type" required value={formData.model} onChange={handleChange} />
        <Input id="quantity" name="quantity" label="Total Quantity" type="number" required value={formData.quantity} onChange={handleChange} min="0" />
        <Input id="rentalPrice" name="rentalPrice" label="Price per Day" type="number" step="0.01" required value={formData.rentalPrice} onChange={handleChange} min="0" />
      </div>
      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Remarks</label>
        <textarea id="remarks" name="remarks" rows={3} value={formData.remarks} onChange={handleChange} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900"></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{itemToEdit ? 'Update Item' : 'Save Item'}</Button>
      </div>
    </form>
  )
}

const Inventory: React.FC = () => {
  const { items, deleteItem, showNotification } = useData();
  const { verifyPassword } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { items: sortedItems, requestSort, sortConfig } = useSortableData<Item>(filteredItems, { key: 'name', direction: 'ascending' });

  const getSortIndicator = (key: keyof Item) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronsUpDownIcon className="w-4 h-4 ml-2 text-slate-400 opacity-50 group-hover:opacity-100" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ChevronUpIcon className="w-4 h-4 ml-2" />;
    }
    return <ChevronDownIcon className="w-4 h-4 ml-2" />;
  };

  const getStatusIndicator = (available: number, quantity: number) => {
    let color = 'bg-emerald-500';
    if (available === 0) {
      color = 'bg-red-500';
    } else if (quantity > 0 && available / quantity < 0.25) {
      color = 'bg-amber-500';
    }
    return <div className={`w-3 h-3 rounded-full ${color}`} title={`${available} of ${quantity} available`}></div>;
  }

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  }

  const handleDeleteRequest = (item: Item) => {
    setItemToDelete(item);
    setDeleteError('');
    setDeletePassword('');
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    if (!verifyPassword(deletePassword)) {
      setDeleteError('Incorrect password. Deletion cancelled.');
      return;
    }
    const result = await deleteItem(itemToDelete.id);
    if (!result.success) {
      alert(result.message);
    } else {
      showNotification("Item Successfully Deleted");
    }
    setItemToDelete(null);
    setDeletePassword('');
    setDeleteError('');
  };

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Inventory Management</h2>
          <Button onClick={openAddModal} leftIcon={<PlusIcon className="w-4 h-4" />}>Add Item</Button>
        </div>
        <div className="mb-6">
          <Input
            id="search"
            label=""
            placeholder="Search Items (by Name or Model)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">
                  <button className="flex items-center group" onClick={() => requestSort('name')}>Name {getSortIndicator('name')}</button>
                </th>
                <th scope="col" className="px-6 py-4">
                  <button className="flex items-center group" onClick={() => requestSort('model')}>Model {getSortIndicator('model')}</button>
                </th>
                <th scope="col" className="px-6 py-4">
                  <button className="flex items-center group" onClick={() => requestSort('rentalPrice')}>Price/Day {getSortIndicator('rentalPrice')}</button>
                </th>
                <th scope="col" className="px-6 py-4">
                  <button className="flex items-center group" onClick={() => requestSort('available')}>Stock Level {getSortIndicator('available')}</button>
                </th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => (
                <tr key={item.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{item.name}</td>
                  <td className="px-6 py-4">{item.model}</td>
                  <td className="px-6 py-4">Rs. {item.rentalPrice.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIndicator(item.available, item.quantity)}
                      <span>{item.available} / {item.quantity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 space-x-2 text-right">
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(item)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteRequest(item)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Item" : "Add New Inventory Item"}>
        <ItemForm onClose={closeModal} itemToEdit={editingItem} />
      </Modal>

      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete the item <strong className="font-semibold">{itemToDelete?.name}</strong>? This action cannot be undone.</p>
          <p>Please enter your password to confirm.</p>
          <Input
            id="delete-password"
            label="Password"
            type="password"
            value={deletePassword}
            onChange={(e) => {
              setDeletePassword(e.target.value);
              setDeleteError('');
            }}
            autoComplete="current-password"
          />
          {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setItemToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Delete Item</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
