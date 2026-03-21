import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-fade-in border-t border-gray-800">
      <div className="flex-1 text-sm text-gray-300">
        We use cookies to ensure you get the best experience on our website, including keeping you logged in securely. By continuing to use this site, you consent to our use of cookies.
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleAccept}
          className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-2 rounded-full font-bold text-sm transition-colors"
        >
          Got it
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white p-2 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
