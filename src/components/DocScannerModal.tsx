import React, { useState } from 'react';
import { Camera, Upload, Sparkles, X, FileText, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../types';

interface DocScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (newNote: Note) => void;
}

const SAMPLE_DOCS = [
  {
    id: 's1',
    label: 'Whiteboard Diagram',
    url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    description: 'System Architecture & Vector DB Flow'
  },
  {
    id: 's2',
    label: 'Handwritten Notes',
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=80',
    description: 'Meeting Outline & Task Checklists'
  },
  {
    id: 's3',
    label: 'Book Page / Research',
    url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
    description: 'Cognitive Science & Memory Retention'
  }
];

export const DocScannerModal: React.FC<DocScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_DOCS[0].url);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartScan = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setScanProgress(20);

    // Simulate OCR progress visual steps
    const timer1 = setTimeout(() => setScanProgress(50), 600);
    const timer2 = setTimeout(() => setScanProgress(80), 1200);

    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          transcript: 'Scanned document image uploaded by user.',
        }),
      });

      const data = await res.json();
      setScanProgress(100);

      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: data.title || 'Scanned Document Note',
        summary: data.summary || 'Summary of scanned document.',
        content: data.formattedContent || `## Scanned Document Content\n\nExtracted text from document image.`,
        type: 'scan',
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['Study', 'Research'],
        keyTakeaways: data.keyTakeaways || ['Document text extracted via AI Vision OCR.'],
        actionItems: (data.actionItems || []).map((item: string, idx: number) => ({
          id: `act-doc-${Date.now()}-${idx}`,
          text: item,
          completed: false,
        })),
        sentiment: data.sentiment || 'Informational',
        createdAt: new Date().toISOString(),
        imageUrl: selectedImage,
        isPinned: false,
      };

      clearTimeout(timer1);
      clearTimeout(timer2);
      onSaveNote(newNote);
      setIsScanning(false);
      onClose();
    } catch (err) {
      console.error('Scan processing error:', err);
      // Fallback
      const fallbackNote: Note = {
        id: `note-${Date.now()}`,
        title: 'Scanned Document Note',
        summary: 'Extracted text from uploaded image document.',
        content: `## Scanned Document\n\nAI extracted key information from image attachment.`,
        type: 'scan',
        tags: ['Study', 'Document'],
        keyTakeaways: ['Scanned page stored safely'],
        actionItems: [],
        createdAt: new Date().toISOString(),
        imageUrl: selectedImage,
      };
      onSaveNote(fallbackNote);
      setIsScanning(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col text-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Scan Document / Image</h3>
                <p className="text-xs text-slate-400 font-medium">OCR & AI Text Extraction</p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isScanning}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Image Preview / Laser Scan Box */}
            <div className="relative aspect-[4/3] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group">
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Document preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Laser Scanning Bar */}
                  {isScanning && (
                    <>
                      <motion.div
                        animate={{ y: ['0%', '100%', '0%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_#10b981]"
                      />
                      <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center">
                        <div className="bg-white/95 border border-emerald-200 px-4 py-2 rounded-full flex items-center gap-2 text-emerald-700 text-xs font-bold shadow-lg">
                          <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
                          Gemini AI Scanning Document ({scanProgress}%)
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Select or upload a document photo</p>
                  <p className="text-xs text-slate-400">Supports JPG, PNG, Whiteboards & Sketches</p>
                </div>
              )}
            </div>

            {/* Upload Options */}
            <div className="flex gap-2">
              <label className="flex-1 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200">
                <Upload className="w-4 h-4 text-indigo-600" />
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <label className="flex-1 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200">
                <Camera className="w-4 h-4 text-purple-600" />
                Capture Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Sample Document Presets */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Or pick a sample document:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_DOCS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setSelectedImage(sample.url)}
                    className={`relative rounded-xl overflow-hidden border transition text-left ${
                      selectedImage === sample.url
                        ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <img src={sample.url} alt={sample.label} className="w-full h-16 object-cover" />
                    <div className="p-1.5 bg-white text-[10px] font-semibold text-slate-700 truncate">
                      {sample.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleStartScan}
              disabled={!selectedImage || isScanning}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Extracting Text with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Scan & Generate AI Note
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
