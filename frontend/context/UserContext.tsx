import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { DUMMY_USERS } from '../data/dummyData';

interface UserContextType {
  users: User[];
  addUser: (user: Omit<User, 'id'>) => { success: boolean, message: string };
  updateUser: (user: User) => { success: boolean, message: string };
  deleteUser: (userId: string) => { success: boolean, message: string };
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(DUMMY_USERS);

  const addUser = (userData: Omit<User, 'id'>): { success: boolean, message: string } => {
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        return { success: false, message: 'Username already exists.' };
    }
    const newUser: User = {
      ...userData,
      id: `u${users.length + 1}${Date.now()}`,
    };
    setUsers(prev => [...prev, newUser]);
    return { success: true, message: 'User added successfully.'};
  };

  const updateUser = (updatedUser: User): { success: boolean, message: string } => {
    if (users.some(u => u.username.toLowerCase() === updatedUser.username.toLowerCase() && u.id !== updatedUser.id)) {
        return { success: false, message: 'Username already exists.' };
    }
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    return { success: true, message: 'User updated successfully.' };
  };
  
  const deleteUser = (userId: string): { success: boolean, message: string } => {
    if (users.length <= 1) {
        return { success: false, message: 'Cannot delete the only user.' };
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    return { success: true, message: 'User deleted successfully.' };
  };

  return (
    <UserContext.Provider value={{ users, addUser, updateUser, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};
