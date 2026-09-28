import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Send, 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Mic, 
  Check, 
  X, 
  Clock, 
  ChevronRight, 
  BrainCircuit, 
  Tag 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  sanitizePayload 
} from '../firebase';
import { JournalEntry, JournalMessage, ExtractedIntelligence, AIMemory } from '../types';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';

interface JournalPageProps {
  onOpenVoice: (onConfirmed: (text: string) => void) => void;
}

export const JournalPage: React.FC<JournalPageProps> = ({ onOpenVoice }) => {
  const { user, profile } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [userMemories, setUserMemories] = useState<AIMemory[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load User Memories & Journal Entries from Firestore
  useEffect(() => {
    if (!user) return;

    // Load AI Memories
    const memRef = collection(db, 'users', user.uid, 'memories');
    const unsubMem = onSnapshot(memRef, (snap) => {
      setUserMemories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIMemory)));
    });

    // Load Journal Entries
    const entriesRef = collection(db, 'users', user.uid, 'journalEntries');
    const unsubEntries = onSnapshot(entriesRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry));
      // Sort: pinned first, then newest updatedAt/createdAt
      list.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
      setEntries(list);

      // Auto-select latest or create if empty
      if (list.length > 0 && !selectedEntryId) {
        setSelectedEntryId(list[0].id);
      }
    });

    return () => {
      unsubMem();
      unsubEntries();
    };
  }, [user]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedEntryId, entries, isAiResponding]);

  const currentEntry = entries.find((e) => e.id === selectedEntryId);

  const handleCreateNewEntry = async () => {
    if (!user) return;
    const newId = 'journal_' + Date.now();
    const newEntry: JournalEntry = {
      id: newId,
      title: 'New Reflection',
      pinned: false,
      messages: [
        {
          id: 'msg_initial_' + Date.now(),
          role: 'assistant',
          content: 
            language === 'hi'
              ? 'नमस्ते! आज आप किस विषय या विचार पर चर्चा या चिंतन करना चाहते हैं?'
              : language === 'hinglish'
              ? 'Hello! Aaj aap kya reflect karna chahte hain? Feel free to share your thoughts openly.'
              : 'Hello. What is on your mind today? Let us unpack your thoughts together with clarity.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'journalEntries', newId), sanitizePayload(newEntry));
      setSelectedEntryId(newId);
      addToast('success', 'New Reflection Created', 'Ready for your thoughts.');
    } catch (err: any) {
      console.error('[Journal] Error creating entry:', err);
      addToast('error', 'Could not create reflection', err.message);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !user || isAiResponding) return;

    let targetEntry = currentEntry;

    // If no entry exists, create one first
    if (!targetEntry) {
      const newId = 'journal_' + Date.now();
      const firstEntry: JournalEntry = {
        id: newId,
        title: text.length > 25 ? text.substring(0, 25) + '...' : text,
        pinned: false,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid, 'journalEntries', newId), sanitizePayload(firstEntry));
      targetEntry = firstEntry;
      setSelectedEntryId(newId);
    }

    const userMessage: JournalMessage = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(targetEntry.messages || []), userMessage];
    const updatedEntry: JournalEntry = {
      ...targetEntry,
      title: targetEntry.title === 'New Reflection' ? (text.length > 28 ? text.substring(0, 28) + '...' : text) : targetEntry.title,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic / Firestore save
    try {
      await setDoc(doc(db, 'users', user.uid, 'journalEntries', targetEntry.id), sanitizePayload(updatedEntry));
      setInputText('');
      setIsAiResponding(true);

      // Call Gemini reflection API
      const relevantMemories = profile?.memoryEnabled ? userMemories : [];
      const res = await api.postReflection(updatedMessages, language, relevantMemories, { displayName: profile?.displayName });

      const aiMessage: JournalMessage = {
        id: 'msg_a_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      const finalEntry: JournalEntry = {
        ...updatedEntry,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'journalEntries', targetEntry.id), sanitizePayload(finalEntry));

      // Extract AI intelligence after 3 turns if not yet extracted
      if (finalMessages.length >= 4 && !finalEntry.intelligence) {
        handleExtractIntelligence(targetEntry.id, finalMessages);
      }
    } catch (err: any) {
      console.error('[Journal] Send message error:', err);
      addToast('error', 'Reflection Error', err.message || 'Failed to reach Gemini. Your text has been saved.');
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleExtractIntelligence = async (entryId: string, messagesList: JournalMessage[]) => {
    if (!user) return;
    setIsExtracting(true);
    try {
      const convText = messagesList.map((m) => `${m.role === 'user' ? 'User' : 'MindBridge AI'}: ${m.content}`).join('\n\n');
      const { intelligence } = await api.extractIntelligence(convText, language);

      const entryDocRef = doc(db, 'users', user.uid, 'journalEntries', entryId);
      await setDoc(entryDocRef, sanitizePayload({ intelligence, updatedAt: new Date().toISOString() }), { merge: true });

      // If intelligence revealed a goal or memory, store to user memory if enabled
      if (profile?.memoryEnabled && (intelligence.goal || intelligence.problem)) {
        const memId = 'mem_' + Date.now();
        const newMemory: AIMemory = {
          id: memId,
          keyTopic: intelligence.mainTopic || 'Reflection Topic',
          content: intelligence.goal ? `User goal: ${intelligence.goal}` : `User challenge: ${intelligence.problem}`,
          category: intelligence.goal ? 'Goal' : 'Problem',
          sourceType: 'journal',
          sourceId: entryId,
          timestamp: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', user.uid, 'memories', memId), sanitizePayload(newMemory));
      }

      addToast('success', 'Journal Intelligence Extracted', 'Topic and key action items generated.');
    } catch (err: any) {
      console.warn('[Journal] Intelligence extraction failed:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTogglePin = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const entryDocRef = doc(db, 'users', user.uid, 'journalEntries', entry.id);
      await setDoc(entryDocRef, { pinned: !entry.pinned, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {}
  };

  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journalEntries', entryId));
      addToast('info', 'Reflection Deleted');
      if (selectedEntryId === entryId) {
        const remaining = entries.filter((x) => x.id !== entryId);
        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      addToast('error', 'Could not delete entry', err.message);
    }
  };

  const handleRenameEntry = async (entryId: string) => {
    if (!user || !newTitle.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const entryDocRef = doc(db, 'users', user.uid, 'journalEntries', entryId);
      await setDoc(entryDocRef, { title: newTitle.trim(), updatedAt: new Date().toISOString() }, { merge: true });
      setRenamingId(null);
      setNewTitle('');
    } catch (err) {}
  };

  // Filtered search list
  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const inTitle = e.title.toLowerCase().includes(q);
    const inMessages = (e.messages || []).some((m) => m.content.toLowerCase().includes(q));
    const inTopic = e.intelligence?.mainTopic?.toLowerCase().includes(q);
    return inTitle || inMessages || inTopic;
  });

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col md:flex-row overflow-hidden border-t md:border border-slate-200 dark:border-slate-800 md:rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
      {/* Left Column: Sessions List */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Header & New Button */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Reflections</h2>
          </div>
          <button
            id="btn-journal-new-entry"
            onClick={handleCreateNewEntry}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-journal-search"
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-400 text-xs">
              <p>No reflections found.</p>
              <button
                id="btn-journal-empty-create"
                onClick={handleCreateNewEntry}
                className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                + Start your first reflection
              </button>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === selectedEntryId;
              const isRenaming = renamingId === entry.id;

              return (
                <div
                  key={entry.id}
                  id={`journal-session-${entry.id}`}
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500/50 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-xs'
                      : 'border-transparent hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameEntry(entry.id)}
                            autoFocus
                            className="text-xs font-semibold px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 w-full"
                          />
                          <button
                            onClick={() => handleRenameEntry(entry.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-xs font-bold truncate">{entry.title}</h4>
                      )}

                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.updatedAt || entry.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{entry.messages?.length || 0} messages</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        id={`btn-pin-${entry.id}`}
                        onClick={(e) => handleTogglePin(entry, e)}
                        title={entry.pinned ? 'Unpin' : 'Pin to top'}
                        className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
                          entry.pinned ? 'text-amber-500 opacity-100' : 'text-slate-400'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-rename-${entry.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(entry.id);
                          setNewTitle(entry.title);
                        }}
                        title="Rename"
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-${entry.id}`}
                        onClick={(e) => handleDeleteEntry(entry.id, e)}
                        title="Delete reflection"
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Stream & Intelligence Details */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
        {currentEntry ? (
          <>
            {/* Active Session Header & Intelligence Extractor CTA */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {currentEntry.title}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Reflecting with MindBridge AI Companion
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-extract-intelligence"
                  onClick={() => handleExtractIntelligence(currentEntry.id, currentEntry.messages || [])}
                  disabled={isExtracting || !currentEntry.messages || currentEntry.messages.length < 2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100/50 disabled:opacity-40 transition-all shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isExtracting ? 'Extracting...' : 'Extract Intelligence'}</span>
                </button>
              </div>
            </div>

            {/* Extracted Intelligence Banner if available */}
            {currentEntry.intelligence && (
              <div className="p-4 border-b border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider text-[10px]">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>AI Journal Intelligence</span>
                </div>
                {currentEntry.intelligence.summary && (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {currentEntry.intelligence.summary}
                  </p>
                )}
                {currentEntry.intelligence.actionItems && currentEntry.intelligence.actionItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentEntry.intelligence.actionItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {(currentEntry.messages || []).map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/50 dark:border-slate-700/50'
                      }`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                );
              })}

              {isAiResponding && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl w-fit">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>MindBridge AI is reflecting...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  id="btn-journal-voice-trigger"
                  onClick={() => onOpenVoice((text) => handleSendMessage(text))}
                  className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors shrink-0"
                  title="Speak your reflection"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  id="input-journal-message"
                  type="text"
                  placeholder={t.typeMessage}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isAiResponding}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                <button
                  id="btn-journal-send-message"
                  type="submit"
                  disabled={!inputText.trim() || isAiResponding}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.send}</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Reflection Selected</h3>
            <p className="text-xs max-w-sm mt-1 mb-4">
              Select a previous conversation from the left or start a new reflection session.
            </p>
            <button
              id="btn-journal-init"
              onClick={handleCreateNewEntry}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              + Start New Reflection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
