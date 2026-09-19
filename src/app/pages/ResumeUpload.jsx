import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { parseResumeText, extractSkillsFromResume, scoreResumeCompleteness, enhanceResumeAnalysis } from '../../core/parsing/resumeParser';
import { saveResume, getResume } from '../../core/db/repo';
import ProgressBar from '../../ui/components/ProgressBar';

export default function ResumeUpload() {
    const [text, setText] = useState('');
    const [mode, setMode] = useState('pdf');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [score, setScore] = useState(0);
    const [sections, setSections] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [previewSkills, setPreviewSkills] = useState([]);
    const [enhancedAnalysis, setEnhancedAnalysis] = useState(null);

    const fileInputRef = useRef(null);

    const updateInsights = (resumeText) => {
        const { score: sc, sections: sec, suggestions: sug } = scoreResumeCompleteness(resumeText);
        setScore(sc);
        setSections(sec);
        setSuggestions(sug);
        const extracted = extractSkillsFromResume(resumeText);
        setPreviewSkills(extracted);
        const enhanced = enhanceResumeAnalysis(resumeText);
        setEnhancedAnalysis(enhanced);
    };

    useEffect(() => {
        const loadExisting = async () => {
            const data = await getResume();
            if (data && data.rawText) {
                setText(data.rawText);
                updateInsights(data.rawText);
            }
        };
        loadExisting();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setStatus('Error: Only PDF files are supported.');
            return;
        }

        setLoading(true);
        setStatus('Processing PDF locally...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.mjs',
                import.meta.url
            ).toString();

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item) => item.str).join(' ');
                fullText += pageText + '\n';
            }

            setText(fullText);
            updateInsights(fullText);

            const parsed = parseResumeText(fullText);
            await saveResume({
                fileName: file.name,
                fileType: 'pdf',
                rawText: fullText,
                parsedData: parsed
            });

            setStatus(`Successfully parsed and saved ${file.name} locally!`);
        } catch (err) {
            console.error('PDF parsing error:', err);
            setStatus(`Failed to read PDF locally. ${err.message}`);
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        updateInsights(val);
    };

    const handleSaveText = async () => {
        if (!text.trim()) {
            setStatus('Please provide resume text first.');
            return;
        }
        const parsed = parseResumeText(text);
        await saveResume({
            fileName: 'Manual Text Input',
            fileType: 'text',
            rawText: text,
            parsedData: parsed
        });
        setStatus('Manual text successfully saved locally!');
    };

    const handleLoad = async () => {
        const data = await getResume();
        if (data && data.rawText) {
            setText(data.rawText);
            updateInsights(data.rawText);
            setStatus('Loaded existing resume from local storage.');
        } else {
            setStatus('No saved resume found in local storage.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Resume Upload</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ingest your raw data safely without cloud servers.</p>
                </div>
                <button
                    onClick={handleLoad}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                >
                    <RefreshCw size={16} /> Load Local Data
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs Area */}
                <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-slate-200 dark:border-[#1e293b] lg:col-span-2 shadow-lg flex flex-col h-full">

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                        <button
                            onClick={() => setMode('pdf')}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                                mode === 'pdf' 
                                    ? 'bg-[#13ec6d]/15 text-emerald-700 dark:text-[#13ec6d] border border-[#13ec6d]/30' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Upload size={16} /> Upload PDF
                        </button>
                        <button
                            onClick={() => setMode('text')}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                                mode === 'text' 
                                    ? 'bg-[#13ec6d]/15 text-emerald-700 dark:text-[#13ec6d] border border-[#13ec6d]/30' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <FileText size={16} /> Paste Raw Text
                        </button>
                    </div>

                    {mode === 'pdf' ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-10 sm:p-12 text-center transition-colors hover:border-[#13ec6d]/50 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#13ec6d] mb-4"></div>
                                    <p className="text-[#13ec6d] font-bold animate-pulse">Running Offline Parser...</p>
                                </div>
                            )}

                            <Upload size={48} className="text-slate-400 dark:text-slate-500 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Drag & Drop PDF</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm">Securely parse your PDF entirely in your browser. File contents never leave your device.</p>

                            <label className="cursor-pointer bg-[#13ec6d] text-[#0b0f19] font-bold px-6 py-3 rounded-xl hover:bg-[#0ea64d] transition-colors shadow-md shadow-[#13ec6d]/20">
                                Select PDF File
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    ref={fileInputRef}
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <textarea
                                className="w-full flex-1 min-h-[300px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-slate-300 focus:outline-none focus:border-[#13ec6d] font-mono text-xs resize-y"
                                placeholder="Paste your resume content in raw text here..."
                                value={text}
                                onChange={handleTextChange}
                            />
                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                <button
                                    onClick={handleSaveText}
                                    className="bg-[#13ec6d] text-[#0b0f19] font-bold px-6 py-2.5 rounded-xl hover:bg-[#0ea64d] transition-colors cursor-pointer shadow-md"
                                >
                                    Save Text to DB
                                </button>
                            </div>
                        </div>
                    )}

                    {status && (
                        <div className={`mt-4 p-3 rounded-xl text-sm font-bold border ${
                            status.includes('Error') || status.includes('Failed')
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' 
                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                        }`}>
                            {status}
                        </div>
                    )}
                </div>

                {/* Analysis Area */}
                <div className="flex flex-col gap-6">
                    {/* Scoring & Heuristics */}
                    <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-slate-200 dark:border-[#1e293b] shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#13ec6d]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 mb-4 uppercase tracking-wide">Resume Strength</h3>

                        <div className="mb-6">
                            <ProgressBar value={score} label="Parse Score" />
                        </div>

                        {sections && (
                            <div className="space-y-3 mb-6">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Section Detection</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(sections).map(([key, isPresent]) => (
                                        <div key={key} className={`flex items-center gap-2 p-2 rounded-lg border ${
                                            isPresent 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50' 
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                        }`}>
                                            {isPresent ? <CheckCircle size={14} className="text-emerald-600 dark:text-[#13ec6d]" /> : <AlertCircle size={14} className="text-slate-400" />}
                                            <span className={`text-xs font-bold capitalize ${isPresent ? 'text-slate-800 dark:text-slate-300' : 'text-slate-400'}`}>{key}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {suggestions && suggestions.length > 0 && (
                            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">AI Suggestions</span>
                                {suggestions.map((sug, i) => (
                                    <div key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 items-start bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5">
                                        <div className="text-emerald-600 dark:text-[#13ec6d] shrink-0 mt-0.5">•</div>
                                        <p>{sug}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Extracted Skills */}
                    <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-slate-200 dark:border-[#1e293b] shadow-lg flex-1">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 mb-4 uppercase tracking-wide">Extracted Skills</h3>
                        {previewSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {previewSkills.map(s => (
                                    <span key={s} className="px-2.5 py-1 bg-[#13ec6d]/10 text-emerald-700 dark:text-[#13ec6d] rounded-lg text-xs font-semibold border border-emerald-500/20 dark:border-[#13ec6d]/20">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-400 dark:text-slate-600 text-xs text-center py-8">
                                No skills detected yet. Upload or paste resume.
                            </div>
                        )}
                    </div>

                    {/* Enhanced Analysis */}
                    {enhancedAnalysis && (
                        <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 border border-slate-200 dark:border-[#1e293b] shadow-lg">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 mb-4 uppercase tracking-wide">Deep Analysis</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Enhanced Score</p>
                                        <p className="text-xl font-bold text-emerald-600 dark:text-[#13ec6d]">{enhancedAnalysis.enhancedScore}/100</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Bullet Points</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">{enhancedAnalysis.bullets}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
