import { useState, useEffect, useRef, useCallback } from 'react';
import { saveResume, getResume } from '../../core/db/repo';
import { extractSkillsFromText, detectResumeSections, computeResumeScore, generateResumeSuggestions, getEnhancedResumeAnalysis } from '../../core/parsing/resumeParser';
import { getAllRoles } from '../../core/logic/dataStore';
import { extractTextFromPdf } from '../../core/parsing/pdfTextExtractor';
import ProgressBar from '../../ui/components/ProgressBar';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function ResumeUpload() {
    const rolesDataset = getAllRoles();
    const [mode, setMode] = useState('pdf'); // 'pdf' or 'text'
    const [text, setText] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const [previewSkills, setPreviewSkills] = useState([]);
    const [sections, setSections] = useState(null);
    const [score, setScore] = useState(0);
    const [suggestions, setSuggestions] = useState([]);
    const [enhancedAnalysis, setEnhancedAnalysis] = useState(null);

    const fileInputRef = useRef(null);

    const updatePreview = useCallback((t) => {
        const skills = extractSkillsFromText(t, rolesDataset);
        setPreviewSkills(skills);

        const detected = detectResumeSections(t);
        setSections(detected);

        const computedScore = computeResumeScore(detected);
        setScore(computedScore);

        const suggs = generateResumeSuggestions(detected);
        setSuggestions(suggs);

        // Enhanced analysis
        const enhanced = getEnhancedResumeAnalysis(t, rolesDataset.flatMap(r => r.requiredSkills || []));
        setEnhancedAnalysis(enhanced);
    }, [rolesDataset]);

    useEffect(() => {
        const loadResume = async () => {
            const dbResume = await getResume();
            if (dbResume && dbResume.rawText) {
                setText(dbResume.rawText);
                updatePreview(dbResume.rawText);
            }
        };
        loadResume();
    }, [updatePreview]);

    const handleTextChange = (e) => {
        setText(e.target.value);
        updatePreview(e.target.value);
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus('');

        try {
            const extracted = await extractTextFromPdf(file);
            setText(extracted);
            updatePreview(extracted);

            // Auto save on successful PDF parse
            await saveResume(extracted);
            setStatus('PDF parsed and logically saved perfectly!');
            setTimeout(() => setStatus(''), 3000);

        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveText = async () => {
        try {
            await saveResume(text);
            setStatus('Text resume saved to offline DB successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
    };

    const handleLoad = async () => {
        const dbResume = await getResume();
        if (dbResume && dbResume.rawText) {
            setText(dbResume.rawText);
            updatePreview(dbResume.rawText);
            setStatus('Resume loaded from DB!');
            setTimeout(() => setStatus(''), 3000);
        } else {
            setStatus('No resume found in DB.');
            setTimeout(() => setStatus(''), 3000);
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Resume Upload</h1>
                    <p className="text-slate-400 mt-1">Ingest your raw data safely without servers.</p>
                </div>
                <button
                    onClick={handleLoad}
                    className="bg-slate-800 text-white font-bold px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                >
                    <RefreshCw size={16} /> Load DB Backup
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs Area */}
                <div className="bg-[#121a2a] rounded-xl p-6 border border-[#1e293b] lg:col-span-2 shadow-lg flex flex-col h-full">

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-slate-800 pb-4 mb-4">
                        <button
                            onClick={() => setMode('pdf')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${mode === 'pdf' ? 'bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Upload size={16} /> Upload PDF
                        </button>
                        <button
                            onClick={() => setMode('text')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${mode === 'text' ? 'bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <FileText size={16} /> Paste Raw Text
                        </button>
                    </div>

                    {mode === 'pdf' ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 p-12 text-center transition-colors hover:border-[#13ec6d]/50 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#13ec6d] mb-4"></div>
                                    <p className="text-[#13ec6d] font-bold animate-pulse">Running Offline OCR/Parser...</p>
                                </div>
                            )}

                            <Upload size={48} className="text-slate-500 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Drag & Drop PDF</h3>
                            <p className="text-slate-400 text-sm mb-6 max-w-sm">Securely parse your PDF entirely in the browser. File contents never hit a cloud server.</p>

                            <label className="cursor-pointer bg-[#13ec6d] text-slate-900 font-bold px-6 py-3 rounded-lg hover:bg-[#0ea64d] transition-colors shadow-lg shadow-[#13ec6d]/20">
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
                                className="w-full flex-1 min-h-[300px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 focus:outline-none focus:border-[#13ec6d] font-mono text-sm resize-y"
                                placeholder="Paste your resume content in raw text here..."
                                value={text}
                                onChange={handleTextChange}
                            />
                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                <button
                                    onClick={handleSaveText}
                                    className="bg-[#13ec6d] text-[#0b0f19] font-bold px-6 py-2.5 rounded-lg hover:bg-[#0ea64d] transition-colors"
                                >
                                    Save Text to DB
                                </button>
                            </div>
                        </div>
                    )}

                    {status && (
                        <div className={`mt-4 p-3 rounded-lg text-sm font-bold border ${status.includes('Error') ? 'bg-red-900/20 text-red-400 border-red-900' : 'bg-emerald-900/20 text-emerald-400 border-emerald-900'}`}>
                            {status}
                        </div>
                    )}
                </div>

                {/* Analysis Area */}
                <div className="flex flex-col gap-6">
                    {/* Scoring & Heuristics */}
                    <div className="bg-[#121a2a] rounded-xl p-6 border border-[#1e293b] shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#13ec6d]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide">Resume Strength</h3>

                        <div className="mb-6">
                            <ProgressBar value={score} label="Parse Score" />
                        </div>

                        {sections && (
                            <div className="space-y-3 mb-6">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Section Detection</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(sections).map(([key, isPresent]) => (
                                        <div key={key} className={`flex items-center gap-2 p-2 rounded border ${isPresent ? 'bg-emerald-900/10 border-emerald-900/50' : 'bg-slate-900 border-slate-800'}`}>
                                            {isPresent ? <CheckCircle size={14} className="text-[#13ec6d]" /> : <AlertCircle size={14} className="text-slate-600" />}
                                            <span className={`text-xs font-bold capitalize ${isPresent ? 'text-slate-300' : 'text-slate-600'}`}>{key}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {suggestions && suggestions.length > 0 && (
                            <div className="space-y-2 border-t border-slate-800 pt-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">AI Suggestions</span>
                                {suggestions.map((sug, i) => (
                                    <div key={i} className="flex gap-2 text-sm text-slate-300 items-start bg-slate-900/50 rounded p-2">
                                        <div className="text-[#13ec6d] shrink-0 mt-0.5">•</div>
                                        <p>{sug}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Extracted Skills */}
                    <div className="bg-[#121a2a] rounded-xl p-6 border border-[#1e293b] shadow-lg flex-1">
                        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide">Extracted Skills</h3>
                        {previewSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {previewSkills.map(s => (
                                    <span key={s} className="px-2 py-1 bg-[#13ec6d]/10 text-[#13ec6d] rounded text-xs font-semibold border border-[#13ec6d]/20">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-600 text-sm text-center py-8">
                                No skills detected yet. Upload or paste resume.
                            </div>
                        )}
                    </div>

                    {/* Enhanced Analysis */}
                    {enhancedAnalysis && (
                        <div className="bg-[#121a2a] rounded-xl p-6 border border-[#1e293b] shadow-lg">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide">Deep Analysis</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Enhanced Score</p>
                                        <p className="text-xl font-bold text-[#13ec6d]">{enhancedAnalysis.enhancedScore}/100</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Bullet Points</p>
                                        <p className="text-xl font-bold text-white">{enhancedAnalysis.bullets}</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Action Verbs</p>
                                        <p className="text-xl font-bold text-white">{enhancedAnalysis.actionVerbs.count}</p>
                                        <p className="text-[9px] text-slate-500 mt-0.5">Score: {enhancedAnalysis.actionVerbs.score}/100</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Est. Experience</p>
                                        <p className="text-xl font-bold text-white">{enhancedAnalysis.experience.years} yr{enhancedAnalysis.experience.years !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>

                                {enhancedAnalysis.actionVerbs.found.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Detected Action Verbs</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {enhancedAnalysis.actionVerbs.found.map(v => (
                                                <span key={v} className="px-2 py-0.5 bg-emerald-900/20 text-emerald-400 rounded text-[10px] font-semibold border border-emerald-900/30 capitalize">{v}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Keyword Density</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#13ec6d] rounded-full transition-all" style={{ width: `${enhancedAnalysis.keywordDensity.density}%` }} />
                                        </div>
                                        <span className="text-xs text-white font-bold">{enhancedAnalysis.keywordDensity.density}%</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1">{enhancedAnalysis.keywordDensity.found.length} of {enhancedAnalysis.keywordDensity.found.length + enhancedAnalysis.keywordDensity.missing.length} target keywords found</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
