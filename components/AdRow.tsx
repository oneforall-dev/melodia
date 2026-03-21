
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { CustomAd } from '../types';

interface AdRowProps {
  type: 'bach' | 'auramaster' | 'custom';
  customAd?: CustomAd;
}

const AdRow: React.FC<AdRowProps> = ({ type, customAd }) => {
  const { language } = useTranslation();
  
  const isBach = type === 'bach';
  const isCustom = type === 'custom';
  
  let link = '';
  let title = '';
  let description = '';
  let cta = language === 'Spanish' ? "Click para saber más" : "Click to learn more";
  let bgColorClass = '';
  let borderColorClass = '';
  let logoBgClass = '';
  let logoText = '';
  let titleColorClass = '';
  let descColorClass = '';
  let iconColorClass = '';

  if (isCustom && customAd) {
      link = customAd.url;
      title = customAd.title;
      description = customAd.description;
      // Default styling for custom ads
      bgColorClass = 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      borderColorClass = 'border-gray-200';
      logoBgClass = 'bg-gray-800';
      logoText = 'AD';
      titleColorClass = 'text-gray-900';
      descColorClass = 'text-gray-700';
      iconColorClass = 'text-gray-400';
  } else if (isBach) {
      link = 'https://bach.melodia.top';
      title = language === 'Spanish' ? 'Bach - Herramienta de Pre-Producción IA' : 'Bach - AI Pre-Production Tool';
      description = language === 'Spanish' 
        ? "Este chart está patrocinado por Bach, la mejor herramienta de pre-producción para música IA." 
        : "This chart is sponsored by Bach, the best pre-production tool for AI music.";
      bgColorClass = 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200';
      logoBgClass = 'bg-indigo-600';
      logoText = 'BACH';
      titleColorClass = 'text-indigo-900';
      descColorClass = 'text-indigo-700';
      iconColorClass = 'text-indigo-400';
  } else {
      // Auramaster
      link = 'https://auramaster.melodia.top';
      title = language === 'Spanish' ? 'Auramaster - Herramienta de Post-Producción IA' : 'Auramaster - AI Post-Production Tool';
      description = language === 'Spanish' 
        ? "La mejor herramienta de post-producción para música IA." 
        : "The best post-production tool for AI music.";
      bgColorClass = 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200';
      logoBgClass = 'bg-purple-600';
      logoText = 'AURA';
      titleColorClass = 'text-purple-900';
      descColorClass = 'text-purple-700';
      iconColorClass = 'text-purple-400';
  }

  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block mb-2 group"
    >
      <div className={`
        flex items-center p-3 rounded-lg shadow-sm border border-opacity-50 transition-all transform group-hover:scale-[1.01] group-hover:shadow-md
        ${bgColorClass}
      `}>
        {/* Rank Placeholder */}
        <div className="w-8 sm:w-16 flex-shrink-0 text-center font-billboard text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-widest">
          {language === 'Spanish' ? 'PUBLI' : 'AD'}
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center gap-4 overflow-hidden">
           {/* Logo Placeholder */}
           <div className={`w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-md shadow-sm flex items-center justify-center text-white font-bold text-xs sm:text-sm
              ${logoBgClass}
           `}>
              {isCustom && customAd?.imageUrl ? (
                  <img src={customAd.imageUrl} alt="Ad" className="w-full h-full object-cover rounded-md" />
              ) : (
                  logoText
              )}
           </div>

           <div className="min-w-0 flex-1 pr-4">
              <h3 className={`font-bold truncate text-sm sm:text-base ${titleColorClass}`}>
                {title}
              </h3>
              <p className={`text-xs sm:text-sm truncate ${descColorClass}`}>
                 {description} <span className="underline font-medium ml-1">{cta}</span>
              </p>
           </div>
        </div>

        <div className={`px-4 ${iconColorClass}`}>
           <ExternalLink size={16} />
        </div>
      </div>
    </a>
  );
};

export default AdRow;
