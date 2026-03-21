import React from 'react';

interface LegalPageProps {
  title: string;
  content: React.ReactNode;
  onGoHome: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, content, onGoHome }) => {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onGoHome}
          className="mb-8 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors"
        >
          ← Go back to home
        </button>
        
        <div className="prose prose-sm max-w-none">
          <h1 className="text-3xl font-billboard font-bold uppercase mb-6">{title}</h1>
          {content}
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
