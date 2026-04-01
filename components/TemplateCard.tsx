import React from 'react';
import { Download, Star, User } from 'lucide-react';
import { Template } from '../services/firebaseService';

interface TemplateCardProps {
  template: Template;
  onDownload: (template: Template) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onDownload }) => {
  let bgImage = '';
  try {
    const data = JSON.parse(template.jsonData);
    if (data.slides && data.slides[0] && data.slides[0].backgroundImage) {
      bgImage = data.slides[0].backgroundImage;
    }
  } catch (e) {}

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div 
        className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center p-4"
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl w-full h-full flex flex-col items-center justify-center text-center shadow-sm">
          <h4 className="font-black text-gray-800 text-lg line-clamp-2 leading-tight">{template.title}</h4>
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{template.description}</p>
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
          {template.pricePoints > 0 ? `${template.pricePoints} P` : '무료'}
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <User size={12} />
            </div>
            <span className="font-medium truncate">{template.authorName}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1"><Download size={14} /> {template.downloads}</span>
            <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400" /> 5.0</span>
          </div>
          <button 
            onClick={() => onDownload(template)}
            className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            복제하기
          </button>
        </div>
      </div>
    </div>
  );
};
