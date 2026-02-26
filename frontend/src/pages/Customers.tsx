
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { PlusIcon, UploadCloudIcon, XIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons';
import { Customer } from '../types';
import { useSortableData } from '../hooks/useSortableData';

const ImageDropzone: React.FC<{ title: string; onImageUpload: (base64: string | null) => void, initialImageUrl?: string | null }> = ({ title, onImageUpload, initialImageUrl }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImagePreview(initialImageUrl || null);
    }, [initialImageUrl]);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                onImageUpload(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClick = () => fileInputRef.current?.click();
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImagePreview(null);
        onImageUpload(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    return (
        <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative group cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
                ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'}`}
        >
            <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleFile(e.target.files[0])} className="hidden" accept="image/*" />
            {imagePreview ? (
                <>
                    <img src={imagePreview} alt={`${title} preview`} className="mx-auto h-24 w-auto rounded-md object-contain" />
                    <button onClick={handleRemove} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XIcon className="w-4 h-4" />
                    </button>
                </>
            ) : (
                <div className="flex flex-col items-center">
                    <UploadCloudIcon className="w-10 h-10 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Drag & drop or click</p>
                </div>
            )}
        </div>
    );
};

const CustomerForm: React.FC<{ onClose: () => void, customerToEdit: Customer | null }> = ({ onClose, customerToEdit }) => {
    const { addCustomer, updateCustomer, showNotification } = useData();
    const [formData, setFormData] = useState({
        name: '', nic: '', phone: '', address: '', notes: ''
    });
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [nicFrontUrl, setNicFrontUrl] = useState<string | null>(null);
    const [nicBackUrl, setNicBackUrl] = useState<string | null>(null);

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name,
                nic: customerToEdit.nic,
                phone: customerToEdit.phone,
                address: customerToEdit.address,
                notes: customerToEdit.notes,
            });
            setPhotoUrl(customerToEdit.photoUrl || null);
            setNicFrontUrl(customerToEdit.nicFrontUrl || null);
            setNicBackUrl(customerToEdit.nicBackUrl || null);
        } else {
            setFormData({ name: '', nic: '', phone: '', address: '', notes: '' });
            setPhotoUrl(null);
            setNicFrontUrl(null);
            setNicBackUrl(null);
        }
    }, [customerToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const customerData = {
            ...formData,
            photoUrl: photoUrl || undefined,
            nicFrontUrl: nicFrontUrl || undefined,
            nicBackUrl: nicBackUrl || undefined,
        };

        if (customerToEdit) {
            await updateCustomer({ ...customerToEdit, ...customerData });
            showNotification("Customer Successfully Updated");
        } else {
            await addCustomer(customerData);
            showNotification("Customer Successfully Saved");
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="name" name="name" label="Full Name" required value={formData.name} onChange={handleChange} />
                <Input id="nic" name="nic" label="NIC Number" required value={formData.nic} onChange={handleChange} />
                <Input id="phone" name="phone" label="Mobile Number" required value={formData.phone} onChange={handleChange} />
                <Input id="address" name="address" label="Address" required value={formData.address} onChange={handleChange} />
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notes</label>
                <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900"></textarea>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <ImageDropzone title="Customer Photo" onImageUpload={setPhotoUrl} initialImageUrl={photoUrl} />
                <ImageDropzone title="NIC Front" onImageUpload={setNicFrontUrl} initialImageUrl={nicFrontUrl} />
                <ImageDropzone title="NIC Back" onImageUpload={setNicBackUrl} initialImageUrl={nicBackUrl} />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">{customerToEdit ? 'Update Customer' : 'Save Customer'}</Button>
            </div>
        </form>
    )
}

const Customers: React.FC = () => {
    const { customers, deleteCustomer, showNotification } = useData();
    const { verifyPassword } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nic.includes(searchTerm) ||
        c.phone.includes(searchTerm)
    );

    const { items: sortedCustomers, requestSort, sortConfig } = useSortableData<Customer>(filteredCustomers, { key: 'name', direction: 'ascending' });

    const getSortIndicator = (key: keyof Customer) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronsUpDownIcon className="w-4 h-4 ml-2 text-slate-400 opacity-50 group-hover:opacity-100" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUpIcon className="w-4 h-4 ml-2" />;
        }
        return <ChevronDownIcon className="w-4 h-4 ml-2" />;
    };

    const openAddModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleDeleteRequest = (customer: Customer) => {
        setCustomerToDelete(customer);
        setDeleteError('');
        setDeletePassword('');
    };

    const handleConfirmDelete = async () => {
        if (!customerToDelete) return;

        if (!verifyPassword(deletePassword)) {
            setDeleteError('Incorrect password. Deletion cancelled.');
            return;
        }

        const result = await deleteCustomer(customerToDelete.id);
        if (!result.success) {
            alert(result.message);
        } else {
            showNotification("Customer Successfully Deleted");
        }

        setCustomerToDelete(null);
        setDeletePassword('');
        setDeleteError('');
    };


    return (
        <div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Customer Management</h2>
                    <Button onClick={openAddModal} leftIcon={<PlusIcon className="w-4 h-4" />}>Add Customer</Button>
                </div>
                <div className="mb-6">
                    <Input
                        id="search"
                        label=""
                        placeholder="Search Customers (by Name, NIC, or Phone)..."
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
                                    <button className="flex items-center group" onClick={() => requestSort('nic')}>NIC {getSortIndicator('nic')}</button>
                                </th>
                                <th scope="col" className="px-6 py-4">
                                    <button className="flex items-center group" onClick={() => requestSort('phone')}>Phone {getSortIndicator('phone')}</button>
                                </th>
                                <th scope="col" className="px-6 py-4">
                                    <button className="flex items-center group" onClick={() => requestSort('address')}>Address {getSortIndicator('address')}</button>
                                </th>
                                <th scope="col" className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCustomers.map(customer => (
                                <tr key={customer.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{customer.name}</td>
                                    <td className="px-6 py-4">{customer.nic}</td>
                                    <td className="px-6 py-4">{customer.phone}</td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={customer.address}>{customer.address}</td>
                                    <td className="px-6 py-4 space-x-2 text-right">
                                        <Button size="sm" variant="secondary" onClick={() => openEditModal(customer)}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeleteRequest(customer)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCustomer ? "Edit Customer" : "Add New Customer"}>
                <CustomerForm onClose={closeModal} customerToEdit={editingCustomer} />
            </Modal>

            <Modal
                isOpen={!!customerToDelete}
                onClose={() => setCustomerToDelete(null)}
                title="Confirm Deletion"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete the customer <strong className="font-semibold">{customerToDelete?.name}</strong>? This action cannot be undone.</p>
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
                        <Button variant="secondary" onClick={() => setCustomerToDelete(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmDelete}>Delete Customer</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Customers;
