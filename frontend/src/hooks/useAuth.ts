import React, { useState, createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { User } from '../types';
import { useUsers } from '../context/UserContext';

interface AuthContextType {
  user: User | null;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  verifyPassword: (pass: string) => boolean;
  updateCurrentUser: (updatedDetails: Partial<User>) => { success: boolean, message: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { users, updateUser } = useUsers();

  const login = useCallback((username: string, pass: string): boolean => {
    // Dummy authentication: password is '123' for all users.
    if (pass === '123') {
      const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (foundUser) {
        setUser(foundUser);
        // Update last login time
        updateUser({ ...foundUser, lastLogin: new Date().toISOString() });
        return true;
      }
    }
    return false;
  }, [users, updateUser]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const verifyPassword = useCallback((pass: string): boolean => {
    // Dummy verification for sensitive actions.
    return pass === '123';
  }, []);

  const updateCurrentUser = useCallback((updatedDetails: Partial<User>) => {
    if (!user) {
        return { success: false, message: 'No user is logged in.' };
    }
    const updatedUserData = { ...user, ...updatedDetails };
    const result = updateUser(updatedUserData);
    if(result.success) {
        setUser(updatedUserData);
    }
    return result;
  }, [user, updateUser]);

  const value = useMemo(() => ({ user, login, logout, verifyPassword, updateCurrentUser }), [user, login, logout, verifyPassword, updateCurrentUser]);

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
