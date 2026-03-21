
import React, { useState, useEffect } from 'react';
import { Search, LogIn, User as UserIcon, PlusCircle, Shield, Globe, LayoutDashboard, X } from 'lucide-react';
import { User } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface NavbarProps {
  user: User | null;
  onLoginClick: () => void;
  onUploadClick: () => void;
  currentGenre: string;
  onSearch: (query: string) => void;
  onToggleAdmin?: () => void;
  onProfileClick?: () => void;
  onDashboardClick?: () => void;
  onAdminDashboardClick?: () => void;
  onHomeClick?: () => void;
  notificationCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLoginClick, onUploadClick, onToggleAdmin, onProfileClick, onDashboardClick, onAdminDashboardClick, onSearch, onHomeClick, notificationCount = 0 }) => {
  const { t, language, setLanguage } = useTranslation();
  const [localSearch, setLocalSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        onSearch(localSearch);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, onSearch]);

  const getLangAbbr = (lang: string) => {
      switch(lang) {
          case 'English': return 'EN';
          case 'Spanish': return 'ES';
          case 'Korean': return 'KR';
          case 'Japanese': return 'JP';
          default: return 'EN';
      }
  }

  return (
    <nav className="sticky top-0 z-50 bg-black text-white h-16 shadow-md border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-2">
        
        {/* Brand + Navigation */}
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-1 group cursor-pointer" onClick={onHomeClick}>
             <div className="w-8 h-8 bg-white text-black rounded-sm flex items-center justify-center font-black text-xl italic transform -skew-x-12">M</div>
             <span className="font-billboard text-3xl font-black italic tracking-tighter transform -skew-x-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:to-white transition-all hidden sm:block">
                MELODIA
             </span>
           </div>

           {/* New Navigation Links */}
           <div className="hidden md:flex items-center gap-6">
               <a 
                href="https://melodia.top/" 
                className="text-xs font-bold uppercase tracking-widest text-white hover:text-purple-400 transition-colors"
               >
                   HOME
               </a>
               <a 
                href="https://melodia.top/blog" 
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
               >
                   BLOG
               </a>
           </div>
        </div>

        {/* Center Search - Hidden on mobile for simplicity */}
        <div className="hidden lg:flex flex-1 max-w-sm mx-4 relative group">
           <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
           <input 
             value={localSearch}
             onChange={(e) => setLocalSearch(e.target.value)}
             className="w-full bg-gray-900 border border-gray-800 rounded-full py-2 pl-9 pr-8 text-xs focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-white placeholder-gray-600"
             placeholder={t.nav.search}
           />
           {localSearch && (
               <button 
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
               >
                   <X size={14} />
               </button>
           )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Language Switcher */}
            <div className="relative group mr-2 h-full flex items-center">
              <button className="flex items-center gap-1 text-gray-400 hover:text-white p-2 rounded-full transition-colors">
                  <Globe size={18} />
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">{getLangAbbr(language)}</span>
              </button>
              
              {/* Dropdown with bridge for hover */}
              <div className="absolute right-0 top-full pt-2 w-20 hidden group-hover:block z-50">
                  <div className="bg-white rounded-lg shadow-xl py-1 border border-gray-200 animate-fade-in">
                    {(['English', 'Spanish', 'Korean', 'Japanese'] as const).map(lang => (
                        <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            className={`block w-full text-center px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 ${language === lang ? 'text-purple-600' : 'text-gray-600'}`}
                        >
                            {getLangAbbr(lang)}
                        </button>
                    ))}
                  </div>
              </div>
            </div>

            {/* Admin Controls */}
            {user && (
                <div className="flex items-center gap-1">
                    {/* User Dashboard Button (Visible to all logged-in users) */}
                    {onDashboardClick && (
                        <button
                            onClick={onDashboardClick}
                            className="relative flex items-center justify-center p-2 rounded-full bg-gray-800 text-purple-400 hover:bg-purple-900 hover:text-white transition-colors"
                            title={t.nav.dashboard}
                        >
                            <LayoutDashboard size={18} />
                            {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-black animate-pulse">
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Admin Dashboard Button (Only for Super Admins) */}
                    {user.isSuperAdmin && onAdminDashboardClick && (
                        <button
                            onClick={onAdminDashboardClick}
                            className="flex items-center justify-center p-2 rounded-full bg-gray-800 text-red-400 hover:bg-red-900 hover:text-white transition-colors"
                            title="Admin Dashboard"
                        >
                            <Shield size={18} />
                        </button>
                    )}

                    {/* Toggle Admin (Visible if user has admin role) */}
                    {user.role === 'admin' && onToggleAdmin && (
                        <button
                            onClick={onToggleAdmin}
                            className={`flex items-center justify-center p-2 rounded-full transition-colors border ${user.isSuperAdmin ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white'}`}
                            title={user.isSuperAdmin ? "Switch to User View" : "Switch to Admin View"}
                        >
                            <UserIcon size={18} />
                        </button>
                    )}
                </div>
            )}
           
           {/* Submit Button - VISIBLE ON MOBILE AS ICON */}
           <button 
             onClick={onUploadClick}
             className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full transition-all active:scale-95 shadow-lg shadow-purple-900/20"
             title={t.nav.submit}
           >
             <PlusCircle size={20} />
             <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">{t.nav.submit}</span>
           </button>

           {/* User / Login */}
           {user ? (
             <div 
                className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l sm:border-gray-800 ml-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onProfileClick}
             >
                <span className="hidden lg:block text-xs font-bold text-gray-400 text-right">
                  {user.username}
                  {user.isSuperAdmin && <span className="block text-[10px] text-red-500 uppercase">{t.nav.admin}</span>}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${user.isSuperAdmin ? 'border-red-500 text-red-500' : 'border-gray-700 text-purple-400'} bg-gray-800`}>
                    <UserIcon size={16} />
                </div>
             </div>
           ) : (
             <button 
                onClick={onLoginClick} 
                className="flex items-center gap-2 text-gray-400 hover:text-white px-2 py-1"
             >
               <LogIn size={20} />
               <span className="hidden sm:inline text-xs font-bold uppercase">{t.nav.login}</span>
             </button>
           )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
