import { useState, useRef } from 'react';
import { Download, Upload, Trash2, CheckCircle, AlertTriangle, Database, HardDrive } from 'lucide-react';
import { exportAllData, importAllData, clearAllData } from '../../core/db/repo';

export default function DataManager() {
    const [status, setStatus] = useState(null);
    const [statusType, setStatusType] = useState('success');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const fileRef = useRef(null);

    const showStatus = (msg, type = 'success') => {
        setStatus(msg);
        setStatusType(type);
        setTimeout(() => setStatus(null), 5000);
    };

    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lakshyaved-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showStatus('Backup downloaded successfully!');
        } catch (err) {
            showStatus(`Export failed: ${err.message}`, 'error');
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await importAllData(data);
            showStatus('Data imported successfully! Reloading...');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            showStatus(`Import failed: ${err.message}`, 'error');
        }

        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClear = async () => {
        try {
            await clearAllData();
            setShowClearConfirm(false);
            showStatus('All data cleared. Refresh the page to restart onboarding.');
        } catch (err) {
            showStatus(`Clear failed: ${err.message}`, 'error');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Data Manager</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Export, import, or clear your offline data.</p>
            </div>

            {status && (
                <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-3 ${
                    statusType === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
                }`}>
                    {statusType === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {status}
                </div>
            )}

            {/* Export */}
            <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-slate-200 dark:border-[#1e293b] shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#13ec6d] shrink-0">
                        <Download size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Export Data</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Download all your data as a JSON backup file. Includes profile, resume, career results, skill gap analysis, and roadmap progress.</p>
                        <button
                            onClick={handleExport}
                            className="px-5 py-2.5 bg-[#13ec6d] text-[#0b0f19] rounded-xl font-bold text-sm hover:bg-[#0ea64d] transition-all shadow-md cursor-pointer"
                        >
                            Download Backup
                        </button>
                    </div>
                </div>
            </div>

            {/* Import */}
            <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-slate-200 dark:border-[#1e293b] shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Upload size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Import Data</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Restore from a previously exported JSON backup. This will overwrite all current data.</p>
                        <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-200 dark:border-slate-700">
                            <HardDrive size={16} /> Select Backup File
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleImport}
                                ref={fileRef}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Clear */}
            <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-red-200 dark:border-red-900/30 shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                        <Trash2 size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Clear All Data</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Permanently delete all data from your browser. This action cannot be undone.</p>

                        {!showClearConfirm ? (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="px-5 py-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-all border border-red-200 dark:border-red-900/50 cursor-pointer"
                            >
                                Delete Everything
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl">
                                <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
                                <p className="text-red-700 dark:text-red-300 text-sm font-medium flex-1">Are you absolutely sure? This cannot be undone.</p>
                                <button onClick={handleClear} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer">
                                    Yes, Delete
                                </button>
                                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-slate-100/70 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <Database size={18} className="text-slate-500 shrink-0 mt-0.5" />
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    All data is stored locally in your browser using IndexedDB. No data is sent to any server. 
                    Clearing your browser data will remove everything — use Export to create backups regularly.
                </p>
            </div>
        </div>
    );
}
