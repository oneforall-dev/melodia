
import React from 'react';
import { ArrowRight, Sparkles, CheckCircle, Trophy, Globe, Lock, Play } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-600 selection:text-white flex flex-col relative">
      
      {/* Absolute Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
              <button 
                  onClick={() => setLanguage('English')}
                  className={`px-3 py-1 text-xs font-bold uppercase rounded-full transition-all ${language === 'English' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
              >
                  EN
              </button>
              <button 
                  onClick={() => setLanguage('Spanish')}
                  className={`px-3 py-1 text-xs font-bold uppercase rounded-full transition-all ${language === 'Spanish' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
              >
                  ES
              </button>
          </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-20 sm:pt-32 sm:pb-32 flex-1 flex flex-col justify-center">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-900/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-700/50 mb-8 animate-fade-in">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span className="text-xs font-bold uppercase tracking-widest text-purple-200">Live Rankings Active</span>
          </div>

          <h1 className="font-billboard text-7xl sm:text-8xl md:text-9xl font-bold uppercase leading-[0.9] tracking-tighter mb-8 bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
            Melodia
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            {t.landing.heroDesc}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={onEnter}
              className="px-10 py-4 bg-white text-black font-billboard text-2xl font-bold uppercase tracking-wider hover:scale-105 transition-transform rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-3"
            >
              {t.landing.enterBtn} <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Value Proposition (Spotify + Quality) */}
      <div className="bg-white text-black py-20 sm:py-32">
        <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
                <h2 className="font-billboard text-5xl sm:text-6xl font-bold uppercase tracking-tight leading-none max-w-xl">
                   {t.landing.whyTitle}
                </h2>
                <div className="w-full md:w-auto h-1 bg-black flex-1 ml-0 md:ml-8 mb-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Feature 1 */}
                <div className="group">
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Sparkles size={28} className="text-purple-600" />
                    </div>
                    <h3 className="font-billboard text-2xl font-bold uppercase mb-3">{t.landing.reason1Title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                        {t.landing.reason1Desc}
                    </p>
                </div>

                {/* Feature 2 (Spotify Core) */}
                <div className="group">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <CheckCircle size={28} className="text-green-600" />
                    </div>
                    <h3 className="font-billboard text-2xl font-bold uppercase mb-3">{t.landing.reason2Title}</h3>
                    <p className="text-gray-600 leading-relaxed border-l-2 border-green-500 pl-4">
                        {t.landing.reason2Desc}
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="group">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Trophy size={28} className="text-blue-600" />
                    </div>
                    <h3 className="font-billboard text-2xl font-bold uppercase mb-3">{t.landing.reason3Title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                        {t.landing.reason3Desc}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Sponsorship Section */}
      <div className="bg-zinc-900 border-t border-zinc-800 py-16">
        <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-center text-zinc-500 font-bold uppercase tracking-widest text-sm mb-12">{t.landing.sponsorTitle}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bach Sponsor */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-8 relative overflow-hidden shadow-2xl group hover:shadow-amber-500/10 transition-shadow">
                    {/* Decorative */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                             <h2 className="font-billboard text-5xl font-black text-black uppercase tracking-tighter">BACH</h2>
                             <div className="w-12 h-12 rounded-full border-2 border-black/10 flex items-center justify-center bg-white shadow-sm">
                                 <span className="font-billboard text-2xl font-black text-black">B</span>
                             </div>
                        </div>
                        
                        <p className="text-gray-800 text-lg font-medium mb-8 leading-relaxed flex-1">
                            {t.landing.bachDesc}
                        </p>
                        
                        <a 
                            href="https://bach.melodia.top" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-black text-amber-50 font-bold uppercase tracking-widest rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            {t.landing.bachBtn} <Globe size={16} />
                        </a>
                    </div>
                </div>

                {/* Auramaster Sponsor */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-8 relative overflow-hidden shadow-2xl group hover:shadow-indigo-500/10 transition-shadow">
                    {/* Decorative */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                             <h2 className="font-billboard text-5xl font-black text-black uppercase tracking-tighter">AURA</h2>
                             <div className="w-12 h-12 rounded-full border-2 border-black/10 flex items-center justify-center bg-white shadow-sm">
                                 <span className="font-billboard text-2xl font-black text-black">A</span>
                             </div>
                        </div>
                        
                        <p className="text-gray-800 text-lg font-medium mb-8 leading-relaxed flex-1">
                            {t.landing.auramasterDesc}
                        </p>
                        
                        <a 
                            href="https://auramaster.melodia.top" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-black text-indigo-50 font-bold uppercase tracking-widest rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            {t.landing.auramasterBtn} <Globe size={16} />
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center">
                 <button 
                    onClick={onEnter}
                    className="px-10 py-4 bg-transparent border-2 border-white/20 text-white font-bold uppercase tracking-widest rounded-full hover:bg-white hover:text-black transition-colors"
                >
                    {t.landing.enterBtn}
                </button>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black py-8 border-t border-gray-900">
        <div className="max-w-6xl mx-auto px-4 text-center">
             <div className="w-8 h-8 bg-white text-black rounded-sm flex items-center justify-center font-black text-xl italic transform -skew-x-12 mx-auto mb-4">M</div>
             <p className="text-gray-600 text-sm">© 2026 Melodia Charts. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
