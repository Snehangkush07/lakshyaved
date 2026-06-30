import { useState } from 'react';
import { Hexagon, ArrowRight, ArrowLeft, CheckCircle, User, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { saveOnboardingProfile } from '../../core/db/repo';
import { findRoles, findSkills } from '../../core/logic/dataStore';
import RoleAutocomplete from '../../ui/components/RoleAutocomplete';
import { getAllRoles } from '../../core/logic/dataStore';

const STEPS = [
    { id: 'welcome', title: 'Welcome', icon: Sparkles },
    { id: 'name', title: 'Your Name', icon: User },
    { id: 'education', title: 'Education', icon: GraduationCap },
    { id: 'role', title: 'Target Role', icon: Briefcase },
    { id: 'skills', title: 'Skills', icon: CheckCircle },
];

export default function Onboarding({ onComplete }) {
    const rolesDataset = getAllRoles();
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [education, setEducation] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    const [skillSuggestions, setSkillSuggestions] = useState([]);
    const [saving, setSaving] = useState(false);

    const handleSkillInput = (q) => {
        setSkillInput(q);
        if (q.trim()) {
            setSkillSuggestions(findSkills(q).map(s => s.skillName));
        } else {
            setSkillSuggestions([]);
        }
    };

    const addSkill = (skill) => {
        if (!skills.includes(skill)) {
            setSkills([...skills, skill]);
        }
        setSkillInput('');
        setSkillSuggestions([]);
    };

    const removeSkill = (skill) => setSkills(skills.filter(s => s !== skill));

    const canNext = () => {
        if (step === 1) return name.trim().length >= 2;
        if (step === 2) return education.trim().length > 0;
        if (step === 3) return targetRole.length > 0;
        if (step === 4) return skills.length >= 1;
        return true;
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            await saveOnboardingProfile({
                name: name.trim(),
                currentRole: '',
                education: education.trim(),
                skills,
                interests: [],
                targetRole,
            });
            onComplete();
        } catch (err) {
            console.error('Onboarding save failed:', err);
        }
        setSaving(false);
    };

    const progress = ((step) / (STEPS.length - 1)) * 100;

    return (
        <div className="fixed inset-0 z-50 bg-[#0b0f19] flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#13ec6d]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative w-full max-w-lg">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                                i < step ? 'bg-[#13ec6d] text-[#0b0f19]' :
                                i === step ? 'bg-[#13ec6d]/20 text-[#13ec6d] ring-2 ring-[#13ec6d]' :
                                'bg-slate-800 text-slate-500'
                            }`}>
                                {i < step ? <CheckCircle size={16} /> : i + 1}
                            </div>
                        ))}
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#13ec6d] rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Card */}
                <div className="bg-[#121a2a] rounded-2xl border border-[#1e293b] p-8 shadow-2xl">

                    {/* Step 0: Welcome */}
                    {step === 0 && (
                        <div className="text-center space-y-6">
                            <div className="text-[#13ec6d] mx-auto w-fit">
                                <Hexagon size={64} className="drop-shadow-[0_0_20px_rgba(19,236,109,0.4)]" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                                Welcome to <span className="text-[#13ec6d]">LAKSHYAVED</span>
                            </h1>
                            <p className="text-slate-400 leading-relaxed max-w-sm mx-auto">
                                Your offline-first career planning companion. Let's personalize your experience in under a minute.
                            </p>
                        </div>
                    )}

                    {/* Step 1: Name */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">What's your name?</h2>
                                <p className="text-slate-400 text-sm">We'll use this to personalize your dashboard.</p>
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Sneha"
                                autoFocus
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-medium focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all placeholder:text-slate-600"
                            />
                        </div>
                    )}

                    {/* Step 2: Education */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Your education level?</h2>
                                <p className="text-slate-400 text-sm">This helps contextualize career projections.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
                                {[
                                    '10th Pass (Secondary)',
                                    '12th Pass (Higher Secondary)',
                                    'Diploma / Polytechnic',
                                    'ITI / Vocational Training',
                                    'BCA / BBA / B.Com',
                                    'B.Tech / B.E. (Engineering)',
                                    'B.Sc (Science)',
                                    'BA / B.A. (Arts)',
                                    'MCA / MBA / M.Com',
                                    'M.Tech / M.E.',
                                    'M.Sc / MA',
                                    'PhD / Doctorate',
                                    'Self-Taught / Bootcamp',
                                    'Other'
                                ].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setEducation(opt)}
                                        className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                            education === opt
                                                ? 'bg-[#13ec6d]/10 border-[#13ec6d] text-[#13ec6d]'
                                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Target Role */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Dream career role?</h2>
                                <p className="text-slate-400 text-sm">Search from 100+ roles in our database.</p>
                            </div>
                            <RoleAutocomplete
                                roles={rolesDataset}
                                selectedRoleId={targetRole}
                                onSelectRole={(role) => setTargetRole(role ? role.roleId : '')}
                                placeholder="Search roles..."
                                searchFn={(query) => findRoles(query)}
                            />
                        </div>
                    )}

                    {/* Step 4: Skills */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Your current skills</h2>
                                <p className="text-slate-400 text-sm">Add at least 1 skill. You can always add more later.</p>
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={(e) => handleSkillInput(e.target.value)}
                                    placeholder="Type a skill name..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#13ec6d] transition-all placeholder:text-slate-600"
                                />
                                {skillSuggestions.length > 0 && (
                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a253a] border border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                        {skillSuggestions.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => addSkill(s)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                                {skills.map(s => (
                                    <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13ec6d]/10 text-[#13ec6d] rounded-lg text-xs font-semibold border border-[#13ec6d]/20">
                                        {s}
                                        <button onClick={() => removeSkill(s)} className="hover:text-white transition-colors">×</button>
                                    </span>
                                ))}
                                {skills.length === 0 && (
                                    <p className="text-slate-600 text-xs italic">No skills added yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                        {step > 0 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        ) : <div />}

                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canNext()}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#13ec6d] text-[#0b0f19] rounded-xl font-bold text-sm hover:bg-[#0ea64d] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#13ec6d]/20"
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                disabled={!canNext() || saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#13ec6d] text-[#0b0f19] rounded-xl font-bold text-sm hover:bg-[#0ea64d] transition-all disabled:opacity-30 shadow-lg shadow-[#13ec6d]/20"
                            >
                                {saving ? 'Setting up...' : 'Launch LAKSHYAVED'} <Sparkles size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
