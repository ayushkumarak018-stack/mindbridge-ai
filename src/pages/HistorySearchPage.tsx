import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  BookOpen, 
  HelpCircle, 
  Target, 
  Scale, 
  Lightbulb, 
  ChevronRight, 
  Sparkles, 
  Filter 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, collection, getDocs } from '../firebase';
import { JournalEntry, ProblemSession, Goal, DecisionSession, BrainstormSession } from '../types';
import { TabType } from '../components/Sidebar';
import { api } from '../services/api';

interface HistorySearchPageProps {
  onNavigate: (tab: TabType, extra?: any) => void;
}

interface UnifiedSearchItem {
  id: string;
  type: 'journal' | 'problem' | 'goal' | 'decision' | 'brainstorm';
  title: string;
  preview: string;
  date: string;
  category?: string;
  raw: any;
}

export const HistorySearchPage: React.FC<HistorySearchPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'journal' | 'problem' | 'goal' | 'decision' | 'brainstorm'>('all');
  const [items, setItems] = useState<UnifiedSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSemanticSearchActive, setAiSemanticSearchActive] = useState(false);
  const [semanticMatches, setSemanticMatches] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadAllHistory = async () => {
      setLoading(true);
      try {
        const [journalSnap, probSnap, goalSnap, decSnap, bsSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'journalEntries')),
          getDocs(collection(db, 'users', user.uid, 'problemSessions')),
          getDocs(collection(db, 'users', user.uid, 'goals')),
          getDocs(collection(db, 'users', user.uid, 'decisions')),
          getDocs(collection(db, 'users', user.uid, 'brainstorms')),
        ]);

        const unified: UnifiedSearchItem[] = [];

        journalSnap.docs.forEach((d) => {
          const data = d.data() as JournalEntry;
          unified.push({
            id: d.id,
            type: 'journal',
            title: data.title || 'Reflection',
            preview: (data.messages || []).map((m) => m.content).join(' ').substring(0, 150),
            date: data.updatedAt || data.createdAt,
            raw: data,
          });
        });

        probSnap.docs.forEach((d) => {
          const data = d.data() as ProblemSession;
          unified.push({
            id: d.id,
            type: 'problem',
            title: data.title || data.originalProblem,
            preview: data.originalProblem,
            date: data.updatedAt || data.createdAt,
            category: data.category,
            raw: data,
          });
        });

        goalSnap.docs.forEach((d) => {
          const data = d.data() as Goal;
          unified.push({
            id: d.id,
            type: 'goal',
            title: data.title,
            preview: data.description || `${data.progressPercentage}% complete`,
            date: data.updatedAt || data.createdAt,
            category: data.category,
            raw: data,
          });
        });

        decSnap.docs.forEach((d) => {
          const data = d.data() as DecisionSession;
          unified.push({
            id: d.id,
            type: 'decision',
            title: data.title,
            preview: (data.options || []).map((o) => o.name).join(' vs '),
            date: data.updatedAt || data.createdAt,
            raw: data,
          });
        });

        bsSnap.docs.forEach((d) => {
          const data = d.data() as BrainstormSession;
          unified.push({
            id: d.id,
            type: 'brainstorm',
            title: data.title,
            preview: data.originalIdea,
            date: data.updatedAt || data.createdAt,
            raw: data,
          });
        });

        unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(unified);
      } catch (err) {
        console.error('[History Load Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllHistory();
  }, [user]);

  const handleSemanticSearch = async () => {
    if (!query.trim() || !user) return;
    setAiSemanticSearchActive(true);
    try {
      const candidates = items.map((i) => ({ id: i.id, text: `${i.title} - ${i.preview}` }));
      const res = await api.smartSemanticSearch(query, candidates);
      setSemanticMatches(res.matchingIds || []);
    } catch (err) {
      console.warn('[Semantic Search Error]:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedType !== 'all' && item.type !== selectedType) return false;

    if (!query.trim()) return true;

    if (aiSemanticSearchActive && semanticMatches.length > 0) {
      return semanticMatches.includes(item.id);
    }

    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'journal': return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'problem': return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case 'goal': return <Target className="w-4 h-4 text-emerald-500" />;
      case 'decision': return <Scale className="w-4 h-4 text-cyan-500" />;
      case 'brainstorm': return <Lightbulb className="w-4 h-4 text-purple-500" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const handleItemClick = (item: UnifiedSearchItem) => {
    if (item.type === 'journal') onNavigate('journal');
    else if (item.type === 'problem') onNavigate('problems', { problemId: item.id });
    else if (item.type === 'goal') onNavigate('goals');
    else if (item.type === 'decision') onNavigate('decisions');
    else if (item.type === 'brainstorm') onNavigate('brainstorm');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Unified Knowledge
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <History className="w-7 h-7 text-indigo-500" />
          <span>History & Smart Search</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Search across all reflections, problem sessions, decisions, goals, and brainstormed blueprints with instant keyword and AI semantic matching.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-unified-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAiSemanticSearchActive(false);
            }}
            placeholder="Search keywords (e.g., 'internship', 'conflict', 'career')..."
            className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <button
          id="btn-semantic-ai-search"
          onClick={handleSemanticSearch}
          disabled={!query.trim()}
          className="px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 flex items-center justify-center gap-2 disabled:opacity-40 transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Semantic Search</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        {[
          { id: 'all', label: `All (${items.length})` },
          { id: 'journal', label: `Reflections (${items.filter((i) => i.type === 'journal').length})` },
          { id: 'problem', label: `Problems (${items.filter((i) => i.type === 'problem').length})` },
          { id: 'goal', label: `Goals (${items.filter((i) => i.type === 'goal').length})` },
          { id: 'decision', label: `Decisions (${items.filter((i) => i.type === 'decision').length})` },
          { id: 'brainstorm', label: `Brainstorm (${items.filter((i) => i.type === 'brainstorm').length})` },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setSelectedType(chip.id as any)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              selectedType === chip.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading history...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
          <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Matching History</h3>
          <p className="text-xs max-w-sm mx-auto mt-1">
            Try adjusting your search query or filter category.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={`${item.type}_${item.id}`}
              onClick={() => handleItemClick(item)}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-start gap-3 min-w-0 pr-4">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 mt-0.5 shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.type}
                    </span>
                    {item.category && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        • {item.category}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      • {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {item.preview}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
