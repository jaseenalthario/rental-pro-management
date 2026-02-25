
import React, { useState, useRef, useEffect } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { useUsers } from '../context/UserContext';
import { User, UserRole } from '../types';
import { PlusIcon, UploadCloudIcon, XIcon } from '../components/icons';

type SettingsTab = 'branding' | 'whatsapp' | 'account' | 'users';

const ImageDropzone: React.FC<{ title: string; onImageUpload: (base64: string | null) => void, initialImageUrl?: string | null }> = ({ title, onImageUpload, initialImageUrl }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setImagePreview(initialImageUrl || null) }, [initialImageUrl]);
    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String); onImageUpload(base64String);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleClick = () => fileInputRef.current?.click();
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); };
    const handleRemove = (e: React.MouseEvent) => { e.stopPropagation(); setImagePreview(null); onImageUpload(null); if(fileInputRef.current) fileInputRef.current.value = ""; }
    return (
        <div onClick={handleClick} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="relative group cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 border-slate-300 dark:border-slate-600 hover:border-blue-400">
            <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleFile(e.target.files[0])} className="hidden" accept="image/*" />
            {imagePreview ? (<><img src={imagePreview} alt={`${title} preview`} className="mx-auto h-24 w-auto rounded-md object-contain" /><button onClick={handleRemove} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="w-4 h-4" /></button></>) : (<div className="flex flex-col items-center"><UploadCloudIcon className="w-10 h-10 text-slate-400 mb-2"/><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p><p className="text-xs text-slate-500 dark:text-slate-400">Click or drag & drop</p></div>)}
        </div>
    );
};

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
    const { user } = useAuth();
    const renderContent = () => {
        switch (activeTab) {
            case 'branding': return <BrandingSettings />;
            case 'whatsapp': return <WhatsAppSettings />;
            case 'account': return <AccountSettings />;
            case 'users': return <UserManagement />;
            default: return null;
        }
    };
    const tabs: {id: SettingsTab; label: string; visible: boolean;}[] = [
        { id: 'branding', label: 'Branding & Invoice', visible: true },
        { id: 'whatsapp', label: 'WhatsApp', visible: true },
        { id: 'account', label: 'My Account', visible: true },
        { id: 'users', label: 'User Management', visible: user?.role === UserRole.ADMIN },
    ]
    return (
        <div className="space-y-8">
            <div className="flex border-b border-slate-200 dark:border-slate-700">{tabs.filter(t => t.visible).map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-500 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{tab.label}</button>))}</div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">{renderContent()}</div>
        </div>
    );
};

const BrandingSettings: React.FC = () => {
    const { settings, setSettings } = useSettings();
    const { showNotification } = useData();
    const handleUpdate = (field: string, value: any) => setSettings(s => ({...s, [field]: value}));
    return (
        <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Branding & Invoice Settings</h2>
            <Input id="shopName" label="Shop Name" value={settings.shopName} onChange={e => handleUpdate('shopName', e.target.value)} />
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shop Logo</label><ImageDropzone title="Upload Logo" initialImageUrl={settings.logoUrl} onImageUpload={(base64) => handleUpdate('logoUrl', base64)} /></div>
            <div className="border-t pt-6 dark:border-slate-700">
                <label htmlFor="invoiceCustomText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Invoice Custom Text</label>
                <textarea id="invoiceCustomText" rows={4} value={settings.invoiceCustomText} onChange={e => handleUpdate('invoiceCustomText', e.target.value)} className="block w-full text-sm p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 font-sans" placeholder="e.g., Terms & Conditions, Thank you note..." />
            </div>
            <Button onClick={() => showNotification("Branding Settings Successfully Updated")}>Save Branding Changes</Button>
        </div>
    );
};

const WhatsAppSettings: React.FC = () => {
    const { settings, setSettings } = useSettings();
    const { showNotification } = useData();
    const handleUpdate = (field: string, value: any) => setSettings(s => ({...s, [field]: value}));
    const placeholders = ['[ShopName]', '[CustomerName]', '[InvoiceID]', '[ItemsList]', '[ReturnDate]', '[TotalAmount]', '[AdvancePaid]', '[BalanceDue]', '[Fines]', '[Discount]', '[TotalDueToday]'];
    return (
        <div className="max-w-3xl space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">WhatsApp Message Templates</h2>
            <Input id="countryCode" label="Default Country Code (without +)" value={settings.whatsAppCountryCode} onChange={e => handleUpdate('whatsAppCountryCode', e.target.value)} />
            <div><label htmlFor="checkoutTemplate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Check-Out Message</label><textarea id="checkoutTemplate" rows={10} value={settings.checkoutTemplate} onChange={e => handleUpdate('checkoutTemplate', e.target.value)} className="block w-full text-sm p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 font-mono" /></div>
            <div><label htmlFor="checkinTemplate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Check-In Message</label><textarea id="checkinTemplate" rows={8} value={settings.checkinTemplate} onChange={e => handleUpdate('checkinTemplate', e.target.value)} className="block w-full text-sm p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 font-mono" /></div>
            <Button onClick={() => showNotification("WhatsApp Templates Successfully Updated")}>Save Template Changes</Button>
        </div>
    );
};

const AccountSettings: React.FC = () => {
    const { user, updateCurrentUser, verifyPassword } = useAuth();
    const { showNotification } = useData();
    const [username, setUsername] = useState(user?.username || '');
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const handleUsernameUpdate = () => {
        const result = updateCurrentUser({ username });
        if(result.success) showNotification("Account Username Successfully Updated");
        else alert(result.message);
    };
    const handlePasswordUpdate = () => {
        if (passwordData.new !== passwordData.confirm) { alert('New passwords do not match.'); return; }
        if (passwordData.new.length < 6) { alert('Password must be at least 6 characters.'); return; }
        if (!verifyPassword(passwordData.current)) { alert('Current password is incorrect.'); return; }
        showNotification("Password Successfully Updated");
        setPasswordData({ current: '', new: '', confirm: '' });
    };
    return (
        <div className="max-w-2xl space-y-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">My Account</h2>
            <div className="space-y-4"><Input id="username" label="Username" value={username} onChange={e => setUsername(e.target.value)} /><Button onClick={handleUsernameUpdate}>Update Username</Button></div>
            <div className="space-y-4 border-t pt-6 dark:border-slate-700"><h3 className="font-semibold">Change Password</h3><Input id="currentPass" label="Current Password" type="password" value={passwordData.current} onChange={e => setPasswordData(p => ({...p, current: e.target.value}))} /><Input id="newPass" label="New Password" type="password" value={passwordData.new} onChange={e => setPasswordData(p => ({...p, new: e.target.value}))} /><Input id="confirmPass" label="Confirm New Password" type="password" value={passwordData.confirm} onChange={e => setPasswordData(p => ({...p, confirm: e.target.value}))} /><Button onClick={handlePasswordUpdate}>Update Password</Button></div>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { users, addUser, updateUser, deleteUser } = useUsers();
    const { user: currentUser, verifyPassword } = useAuth();
    const { showNotification } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const openAddModal = () => { setEditingUser(null); setIsModalOpen(true); };
    const openEditModal = (user: User) => { setEditingUser(user); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingUser(null); };
    const handleDeleteRequest = (user: User) => { if(user.id === currentUser?.id) { alert("You cannot delete yourself."); return; } setUserToDelete(user); setError(''); setPassword(''); };
    const handleConfirmDelete = () => { if (!userToDelete) return; if (!verifyPassword(password)) { setError('Incorrect password.'); return; } deleteUser(userToDelete.id); showNotification("User Successfully Deleted"); setUserToDelete(null); };
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800 dark:text-white">User Management</h2><Button onClick={openAddModal} leftIcon={<PlusIcon className="w-4 h-4" />}>Add User</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Username</th><th className="px-6 py-3">Role</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-b dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"><td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{u.name}</td><td className="px-6 py-4">{u.username}</td><td className="px-6 py-4">{u.role}</td><td className="px-6 py-4 space-x-2 text-right"><Button size="sm" variant="secondary" onClick={() => openEditModal(u)}>Edit</Button><Button size="sm" variant="danger" onClick={() => handleDeleteRequest(u)} disabled={u.id === currentUser?.id}>Delete</Button></td></tr>))}</tbody></table></div>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? 'Edit User' : 'Add New User'}><UserForm userToEdit={editingUser} onClose={closeModal} addUser={addUser} updateUser={updateUser} /></Modal>
            <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirm Deletion"><div className="space-y-4"><p>Are you sure you want to delete <strong className="font-semibold">{userToDelete?.name}</strong>?</p><Input id="confirm-pass" label="Enter your password to confirm" type="password" value={password} onChange={e => {setPassword(e.target.value); setError('')}}/>{error && <p className="text-red-500 text-sm">{error}</p>}<div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={() => setUserToDelete(null)}>Cancel</Button><Button variant="danger" onClick={handleConfirmDelete}>Delete User</Button></div></div></Modal>
        </div>
    );
};

const UserForm: React.FC<{userToEdit: User | null; onClose: () => void; addUser: Function; updateUser: Function}> = ({userToEdit, onClose, addUser, updateUser}) => {
    const { showNotification } = useData();
    const [formData, setFormData] = useState({ name: '', username: '', role: UserRole.STAFF });
    const [message, setMessage] = useState('');
    useEffect(() => { if(userToEdit) setFormData({ name: userToEdit.name, username: userToEdit.username, role: userToEdit.role }) }, [userToEdit]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(s => ({...s, [e.target.name]: e.target.value}));
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); setMessage('');
        const action = userToEdit ? updateUser : addUser;
        const data = userToEdit ? { ...userToEdit, ...formData } : formData;
        const result = action(data);
        if (result.success) { showNotification(userToEdit ? "User Successfully Updated" : "User Successfully Saved"); onClose(); } else { setMessage(result.message); }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">{message && <p className="text-red-500 text-sm">{message}</p>}<Input id="name" name="name" label="Full Name" required value={formData.name} onChange={handleChange} /><Input id="username" name="username" label="Username" required value={formData.username} onChange={handleChange} /><div><label htmlFor="role" className="block text-sm font-medium mb-2">Role</label><select id="role" name="role" value={formData.role} onChange={handleChange} className="block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">{Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}</select></div><p className="text-sm text-slate-500">New users will have a default password of "password".</p><div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{userToEdit ? 'Update User' : 'Add User'}</Button></div></form>
    )
}

export default Settings;
