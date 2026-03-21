import React, { useState, useEffect } from 'react';
import { X, User, Search, CheckCircle, Loader2, ArrowRightLeft } from 'lucide-react';
import { User as UserType } from '../types';
import { searchUsers } from '../services/realApiService';
import { useTranslation } from '../contexts/LanguageContext';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (newUserId: string) => Promise<void>;
  currentSongTitle: string;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransfer, currentSongTitle }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        const users = await searchUsers(query);
        setResults(users);
        setIsSearching(false);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset on open
  useEffect(() => {
      if (isOpen) {
          setQuery('');
          setResults([]);
          setSelectedUser(null);
          setSuccess(false);
      }
  }, [isOpen]);

  const handleConfirm = async () => {
      if (!selectedUser) return;
      setIsSubmitting(true);
      await onTransfer(selectedUser.id);
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
          onClose();
      }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-900 p-6 flex justify-between items-start text-white shrink-0">
          <div>
            <h2 className="text-xl font-billboard uppercase tracking-wide flex items-center gap-2">
              <ArrowRightLeft size={20} />
              {t.transfer.title}
            </h2>
            <p className="text-indigo-200 text-xs mt-1 truncate max-w-[250px]">
              {currentSongTitle}
            </p>
          </div>
          <button onClick={onClose} className="text-indigo-300 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {success ? (
             <div className="p-12 flex flex-col items-center text-center justify-center flex-1 min-h-[300px]">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle className="text-green-600" size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900">{t.transfer.success}</h3>
             </div>
        ) : (
            <div className="p-6 flex flex-col gap-4">
                <p className="text-sm text-gray-500">
                    {t.transfer.subtitle}
                </p>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.transfer.searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none transition-all text-sm"
                        autoFocus
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-3">
                            <Loader2 className="animate-spin text-indigo-600" size={18} />
                        </div>
                    )}
                </div>

                {/* Results List */}
                <div className="border border-gray-100 rounded-lg max-h-[200px] overflow-y-auto bg-gray-50">
                    {query.length < 2 && (
                        <div className="p-4 text-center text-gray-400 text-xs italic">
                            Type at least 2 characters to search...
                        </div>
                    )}
                    {query.length >= 2 && !isSearching && results.length === 0 && (
                         <div className="p-4 text-center text-gray-400 text-xs italic">
                            {t.transfer.noUsers}
                        </div>
                    )}
                    {results.map(user => (
                        <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-b border-gray-100 last:border-0
                                ${selectedUser?.id === user.id ? 'bg-indigo-100 border-l-4 border-l-indigo-600' : 'hover:bg-white'}
                            `}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                <User size={14} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">{user.username}</p>
                                <p className="text-[10px] text-gray-400">ID: {user.id}</p>
                            </div>
                            {selectedUser?.id === user.id && (
                                <CheckCircle className="ml-auto text-indigo-600" size={18} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Action Footer */}
                <div className="mt-2 p-3 bg-orange-50 rounded border border-orange-100 text-xs text-orange-700">
                    {t.transfer.warning}
                </div>

                <button 
                    onClick={handleConfirm}
                    disabled={!selectedUser || isSubmitting}
                    className="w-full bg-black text-white font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
                >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                    {t.transfer.confirm} {selectedUser ? selectedUser.username : ''}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default TransferModal;
