import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewTab, Note, AppSettings, PresetSample, AuthUser } from './types';
import { loadStoredNotes, saveStoredNotes, loadStoredSettings, saveStoredSettings, resetToSampleNotes, hasCompletedOnboarding, markOnboardingComplete } from './lib/storage';
import { subscribeToAuthChanges, logOutUser } from './lib/authService';
import { isFirebaseConfigured } from './lib/firebase';
import { subscribeToCloudNotes, saveNoteToCloud, deleteNoteFromCloud, saveSettingsToCloud, subscribeToBillingStatus, BillingRecord } from './lib/cloudSync';
import { BottomNav } from './components/BottomNav';
import { CaptureView } from './components/CaptureView';
import { AllNotesView } from './components/AllNotesView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { CalendarIntegrationsView } from './components/CalendarIntegrationsView';
import { OnboardingView } from './components/OnboardingView';
import { Logo } from './components/Logo';
import { AuthView } from './components/AuthView';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { MeetingModeModal } from './components/MeetingModeModal';
import { DocScannerModal } from './components/DocScannerModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { PasteSummarizeModal } from './components/PasteSummarizeModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { PricingView } from './components/PricingView';
import { FaqView } from './components/FaqView';
import { X } from 'lucide-react';

type AuthStage = 'onboarding' | 'auth' | 'app';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authResolved, setAuthResolved] = useState(!isFirebaseConfigured);
  const [authStage, setAuthStage] = useState<AuthStage>(hasCompletedOnboarding() ? 'auth' : 'onboarding');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [activeTab, setActiveTab] = useState<ViewTab>('capture');
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadStoredSettings());
  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [presetVoiceSample, setPresetVoiceSample] = useState<PresetSample | undefined>(undefined);
  const [isNewTextModalOpen, setIsNewTextModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [isCreatingTextAi, setIsCreatingTextAi] = useState(false);

  useEffect(() => { setNotes(loadStoredNotes()); }, []);
  useEffect(() => { const unsubscribe = subscribeToAuthChanges((nextUser) => { setUser(nextUser); setAuthResolved(true); if (nextUser) setAuthStage('app'); else if (authStage === 'app') { setAuthMode('login'); setAuthStage('auth'); } }); return unsubscribe; }, []);
  useEffect(() => { if (!isFirebaseConfigured || !user) return; const unsubscribe = subscribeToCloudNotes(user.id, (cloudNotes) => { setNotes(cloudNotes); saveStoredNotes(cloudNotes); }); return unsubscribe; }, [user]);
  useEffect(() => { if (!isFirebaseConfigured || !user) { setBilling(null); return; } const unsubscribe = subscribeToBillingStatus(user.id, setBilling); return unsubscribe; }, [user]);

  const isPro = isFirebaseConfigured && billing ? billing.isProPlan : (settings.isProPlan ?? false);
  const handleSaveNote = (newNote: Note) => { const updated = [newNote, ...notes]; setNotes(updated); saveStoredNotes(updated); if (user) saveNoteToCloud(user.id, newNote); };
  const handleUpdateNote = (updatedNote: Note) => { const updated = notes.map((n) => n.id === updatedNote.id ? updatedNote : n); setNotes(updated); saveStoredNotes(updated); if (user) saveNoteToCloud(user.id, updatedNote); if (selectedNote?.id === updatedNote.id) setSelectedNote(updatedNote); };
  const handleDeleteNote = (noteId: string) => { const updated = notes.filter((n) => n.id !== noteId); setNotes(updated); saveStoredNotes(updated); if (user) deleteNoteFromCloud(user.id, noteId); if (selectedNote?.id === noteId) setSelectedNote(null); };
  const handleTogglePin = (noteId: string) => { const updated = notes.map((n) => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n); setNotes(updated); saveStoredNotes(updated); const toggled = updated.find((n) => n.id === noteId); if (user && toggled) saveNoteToCloud(user.id, toggled); if (selectedNote?.id === noteId) setSelectedNote({ ...selectedNote, isPinned: !selectedNote.isPinned }); };
  const handleUpdateSettings = (newSettings: AppSettings) => { setSettings(newSettings); saveStoredSettings(newSettings); if (user) saveSettingsToCloud(user.id, newSettings); };
  const handleResetData = () => { if (confirm('Reset all notes to initial sample data?')) setNotes(resetToSampleNotes()); };
  const goToAuth = (mode: 'signup' | 'login') => { markOnboardingComplete(); if (user) setAuthStage('app'); else { setAuthMode(mode); setAuthStage('auth'); } };
  const handleAuthenticated = (newUser: AuthUser) => { markOnboardingComplete(); setUser(newUser); setAuthStage('app'); };
  const handleLogout = () => { logOutUser(); setUser(null); setAuthMode('login'); setAuthStage('auth'); };
  const handleOpenVoiceRecorder = (sample?: PresetSample) => { setPresetVoiceSample(sample); setIsVoiceModalOpen(true); };
  const handleCreateManualTextNote = async () => {
    if (!manualContent.trim()) return; setIsCreatingTextAi(true);
    try { const res = await fetch('/api/generate-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: manualContent, titleHint: manualTitle }) }); const data = await res.json(); const newNote: Note = { id: `note-${Date.now()}`, title: data.title || manualTitle || 'New Note', summary: data.summary || manualContent.slice(0, 100), content: data.formattedContent || manualContent, type: 'text', tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Idea'], keyTakeaways: data.keyTakeaways || [], actionItems: (data.actionItems || []).map((item: string, idx: number) => ({ id: `act-manual-${Date.now()}-${idx}`, text: item, completed: false })), createdAt: new Date().toISOString() }; handleSaveNote(newNote); setIsCreatingTextAi(false); setIsNewTextModalOpen(false); setManualTitle(''); setManualContent(''); }
    catch { handleSaveNote({ id: `note-${Date.now()}`, title: manualTitle || 'New Note', summary: manualContent.slice(0, 100), content: manualContent, type: 'text', tags: ['Idea'], keyTakeaways: [], actionItems: [], createdAt: new Date().toISOString() }); setIsCreatingTextAi(false); setIsNewTextModalOpen(false); setManualTitle(''); setManualContent(''); }
  };
  const renderActiveView = () => (<AnimatePresence mode="wait">
    {activeTab === 'capture' && <motion.div key="capture" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><CaptureView recentNotes={notes} onOpenVoiceRecorder={handleOpenVoiceRecorder} onOpenDocScanner={() => setIsDocModalOpen(true)} onOpenPasteSummarize={() => setIsPasteModalOpen(true)} onSelectNote={setSelectedNote} onTogglePin={handleTogglePin} onViewAllNotes={() => setActiveTab('notes')} onOpenPricing={() => setActiveTab('pricing')} isPro={isPro} /></motion.div>}
    {activeTab === 'notes' && <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><AllNotesView notes={notes} onSelectNote={setSelectedNote} onTogglePin={handleTogglePin} onDeleteNote={handleDeleteNote} onCreateNewTextNote={() => setIsNewTextModalOpen(true)} /></motion.div>}
    {activeTab === 'calendar' && <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><CalendarIntegrationsView settings={settings} onUpdateSettings={handleUpdateSettings} onSaveNote={handleSaveNote} onNavigateToMeetingNotes={() => setActiveTab('notes')} /></motion.div>}
    {activeTab === 'search' && <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><SearchView notes={notes} onSelectNote={setSelectedNote} /></motion.div>}
    {activeTab === 'pricing' && <motion.div key="pricing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><PricingView settings={settings} onUpdateSettings={handleUpdateSettings} user={user} isPro={isPro} notes={notes} /></motion.div>}
    {activeTab === 'faq' && <motion.div key="faq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><FaqView onNavigateToPricing={() => setActiveTab('pricing')} /></motion.div>}
    {activeTab === 'settings' && <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} notesCount={notes.length} notes={notes} onSaveNote={handleSaveNote} onNavigateToMeetingNotes={() => setActiveTab('notes')} onReplayOnboarding={() => setAuthStage('onboarding')} user={user} onLogout={handleLogout} isPro={isPro} /></motion.div>}
  </AnimatePresence>);
  if (!authResolved) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="flex flex-col items-center gap-3"><Logo className="w-10 h-10 animate-pulse" rounded="rounded-2xl" /><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Voxnote…</span></div></div>;
  return <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between antialiased relative"><AnimatePresence mode="wait">
    {authStage === 'onboarding' ? <motion.div key="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="min-h-screen bg-slate-50"><OnboardingView onComplete={() => goToAuth('signup')} onGetStarted={() => goToAuth('signup')} onLogin={() => goToAuth('login')} /></motion.div> : authStage === 'auth' ? <motion.div key="auth-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="min-h-screen bg-slate-50"><AuthView initialMode={authMode} onAuthenticated={handleAuthenticated} onBack={() => setAuthStage('onboarding')} /></motion.div> : <motion.div key="main-app" initial={{ opacity: 0, scale: 1.01 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between antialiased"><div className="fixed top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-400 z-50 pointer-events-none" /><div className="hidden md:flex w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 gap-6 min-h-screen"><DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} notesCount={notes.length} onOpenVoiceRecorder={() => handleOpenVoiceRecorder()} onOpenMeetingMode={() => setIsMeetingModalOpen(true)} onOpenDocScanner={() => setIsDocModalOpen(true)} onOpenPasteSummarize={() => setIsPasteModalOpen(true)} onCreateNewTextNote={() => setIsNewTextModalOpen(true)} isPro={isPro} /><main className="flex-1 min-w-0 bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm overflow-y-auto">{renderActiveView()}</main></div><div className="flex md:hidden flex-col flex-1 relative"><main className="flex-1 px-3 sm:px-4 pt-3 sm:pt-6 w-full max-w-lg mx-auto">{renderActiveView()}</main><BottomNav activeTab={activeTab} setActiveTab={setActiveTab} notesCount={notes.length} /></div></motion.div>}
  </AnimatePresence><VoiceRecorderModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onSaveNote={handleSaveNote} initialTranscript={presetVoiceSample?.transcript} initialTitle={presetVoiceSample?.title} /><MeetingModeModal isOpen={isMeetingModalOpen} onClose={() => setIsMeetingModalOpen(false)} onSaveNote={handleSaveNote} /><DocScannerModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} onSaveNote={handleSaveNote} /><PasteSummarizeModal isOpen={isPasteModalOpen} onClose={() => setIsPasteModalOpen(false)} onSaveNote={handleSaveNote} /><NoteDetailModal note={selectedNote} onClose={() => setSelectedNote(null)} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onTogglePin={handleTogglePin} />{isNewTextModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"><div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-900"><div className="flex items-center justify-between"><h3 className="text-base font-bold text-slate-900">Create New Text Note</h3><button onClick={() => setIsNewTextModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"><X className="w-5 h-5" /></button></div><input type="text" placeholder="Title (optional)..." value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /><textarea rows={5} placeholder="Write your note thoughts here... Gemini AI will auto-summarize and tag it." value={manualContent} onChange={(e) => setManualContent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /><button onClick={handleCreateManualTextNote} disabled={isCreatingTextAi || !manualContent.trim()} className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-200 transition disabled:opacity-50">{isCreatingTextAi ? 'Processing AI Note...' : 'Save & AI Categorize Note'}</button></div></div>}</div>;
}
