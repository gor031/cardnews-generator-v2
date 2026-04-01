import React, { useState, useEffect } from 'react';
import { TemplateCard } from './TemplateCard';
import { fetchTemplates, Template, downloadTemplate } from '../services/firebaseService';
import { Search, Loader2, TrendingUp, Clock, Tag } from 'lucide-react';
import { CardNewsData } from '../types';

interface MarketplaceProps {
  onApplyTemplate: (data: CardNewsData) => void;
  onProfileUpdate: () => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onApplyTemplate, onProfileUpdate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'latest' | 'popular'>('latest');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (template: Template) => {
    try {
      // Parse the JSON data
      const cardData = JSON.parse(template.jsonData) as CardNewsData;
      
      // Simulate purchase/download increment
      await downloadTemplate(template.id, template.pricePoints, template.authorId);
      
      // Apply to workspace
      onApplyTemplate(cardData);
      onProfileUpdate();
      
      alert(`'${template.title}' 템플릿이 작업공간에 복제되었습니다!`);
    } catch (error: any) {
      alert(error.message || "템플릿을 불러오는 중 오류가 발생했습니다.");
      console.error(error);
    }
  };

  const filteredTemplates = templates
    .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (filter === 'popular') return b.downloads - a.downloads;
      return 0; // Already sorted by latest from Firestore
    });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="원하는 템플릿 검색 (예: 강연용, 홍보용)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-gray-800 placeholder-gray-400"
          />
        </div>
        
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 shadow-sm self-stretch md:self-auto">
          <button 
            onClick={() => setFilter('latest')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${filter === 'latest' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Clock size={16} /> 최신순
          </button>
          <button 
            onClick={() => setFilter('popular')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${filter === 'popular' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <TrendingUp size={16} /> 인기순
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
          <Loader2 size={40} className="animate-spin text-primary" />
          <p className="font-medium">템플릿을 불러오는 중...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500 text-sm">다른 키워드로 검색해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              onDownload={handleDownload} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
