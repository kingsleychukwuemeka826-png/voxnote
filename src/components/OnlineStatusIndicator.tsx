import React, { useState, useEffect, ChangeEvent } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnlineStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  className = '',
  compact = false,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOnline = isOnline && !simulatedOffline;

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition border whitespace-nowrap shrink-0 ${
          effectiveOnline
            ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70'
            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
        }`}
        title="Click to view connection & sync status"
      >
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              effectiveOnline ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              effectiveOnline ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>

        {effectiveOnline ? (
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-600" />
            {!compact && <span>Online</span>}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-amber-600" />
            {!compact && <span>Offline</span>}
          </span>
        )}
      </button>

      {/* Popover / Status Modal Dropdown */}
      <AnimatePresence>
        {showPopover && (
          <>
            {/* Backdrop click dismiss */}
            <div
              className="fixed inset-0 z-40 bg-slate-900/10 sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none"
              onClick={() => setShowPopover(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
             className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] z-50 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xl text-slate-900 text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> Connection & Sync
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    effectiveOnline
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}
                >
                  {effectiveOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Network Status Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Network Connectivity:</span>
                  <span className="font-bold text-slate-800">
                    {isOnline ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Local Data Engine:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Persistent Safe
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>AI Requests & Sync:</span>
                  <span
                    className={`font-bold ${
                      effectiveOnline ? 'text-indigo-600' : 'text-amber-600'
                    }`}
                  >
                    {effectiveOnline ? 'Active (Ready)' : 'Queued until online'}
                  </span>
                </div>
              </div>

              {!effectiveOnline && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Offline Mode:</strong> All notes are securely saved to your device. Manual syncs and Gemini AI transcriptions will resume when reconnected.
                  </div>
                </div>
              )}

              {/* Actions & Simulation Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Force Sync Now'}</span>
                </button>

                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 hover:text-slate-800">
                  <input
                    type="checkbox"
                    checked={simulatedOffline}
                    onChange={(e) => setSimulatedOffline(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Simulate Offline</span>
                </label>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
