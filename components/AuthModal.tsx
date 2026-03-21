
import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password?: string, email?: string, isRegister?: boolean) => Promise<boolean>;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    setIsLoading(true);
    // Pass execution up to App and wait for success result
    const success = await onLogin(username, password, email, isRegister);
    setIsLoading(false);
    
    if (success) {
        onClose();
        // Reset fields on success
        setUsername('');
        setPassword('');
        setEmail('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gray-900 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-billboard text-white uppercase tracking-wide">
              {isRegister ? t.auth.join : t.auth.welcome}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isRegister ? t.auth.joinDesc : t.auth.welcomeDesc}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          
          {/* Google Login Button */}
          <button
            onClick={async () => {
                try {
                  const redirectUri = `${window.location.origin}/auth/google/callback`;
                  const res = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
                  const data = await res.json();
                  
                  if (!res.ok || !data.url) {
                    alert(data.error || "Failed to get Google Login URL. Please check your configuration.");
                    return;
                  }
                  
                  const width = 500;
                  const height = 600;
                  const left = window.screen.width / 2 - width / 2;
                  const top = window.screen.height / 2 - height / 2;
                  
                  const authWindow = window.open(data.url, 'google_login', `width=${width},height=${height},top=${top},left=${left}`);
                  if (!authWindow) {
                    alert('Please allow popups for this site to connect your account.');
                  }
                } catch (e) {
                  console.error("Failed to start Google Login", e);
                  alert("Failed to start Google Login. Please try again.");
                }
            }}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all shadow-sm mb-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold tracking-widest">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.auth.username}</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder={t.auth.usernamePlaceholder}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.auth.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder-gray-400"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.auth.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder-gray-400"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-gray-800 transition-colors mt-4 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
            {isRegister ? t.auth.create : t.auth.signin}
          </button>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {isRegister ? t.auth.hasAccount : t.auth.noAccount}{' '}
              <button 
                type="button" 
                onClick={() => setIsRegister(!isRegister)}
                className="text-purple-600 font-bold hover:underline"
              >
                {isRegister ? t.auth.login : t.auth.register}
              </button>
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
