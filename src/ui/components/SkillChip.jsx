import { CheckCircle, AlertTriangle, Plus } from 'lucide-react';

export default function SkillChip({ label, type = 'default' }) {
    const styles = {
        matched: "bg-[#13ec6d]/10 text-[#13ec6d] border-[#13ec6d]/20",
        missing: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
        default: "bg-slate-100 dark:bg-[#1c2533] text-slate-600 dark:text-slate-400 border-transparent"
    };

    const icons = {
        matched: <CheckCircle size={14} />,
        missing: <AlertTriangle size={14} />,
        default: <Plus size={14} />
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[type]}`}>
            {label}
            {icons[type]}
        </span>
    );
}
