import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { LogoIcon, UserIcon, LockIcon, AlertTriangleIcon } from '../components/icons';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username, password);
    if (!success) {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-slate-50 dark:bg-slate-900 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50 dark:from-blue-900/40 dark:via-slate-900 dark:to-slate-900"></div>
      </div>
      
      <div className="max-w-md w-full space-y-6 animate-fade-in-up">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-col items-center text-center">
              <div className="mx-auto h-16 w-16 flex items-center justify-center text-blue-500 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-inner">
                  <LogoIcon className="h-10 w-10"/>
              </div>
            <h2 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sign in to RentalPro
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Welcome back! Please enter your credentials.
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="animate-fade-in-up-delay-1">
                <Input
                  id="username"
                  label="Username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., Admin 123"
                  leftIcon={<UserIcon className="w-5 h-5 text-slate-400" />}
                />
              </div>
              <div className="animate-fade-in-up-delay-2">
                <Input
                  id="password"
                  label="Password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="123"
                  leftIcon={<LockIcon className="w-5 h-5 text-slate-400" />}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 p-3 rounded-lg text-red-500 dark:text-red-400 text-sm animate-fade-in-up-delay-3">
                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 animate-fade-in-up-delay-4">
              <Button type="submit" className="w-full shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow" size="lg">
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
      <footer className="absolute bottom-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Software Created by : <a href="https://althario.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
            Al Thario
        </a>
      </footer>
    </div>
  );
};

export default Login;