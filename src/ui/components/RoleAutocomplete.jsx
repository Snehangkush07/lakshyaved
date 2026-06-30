import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';

export default function RoleAutocomplete({
    label,
    roles = [],
    selectedRoleId,
    onSelectRole,
    placeholder = "Search roles...",
    searchFn
}) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    const [prevSelectedRoleId, setPrevSelectedRoleId] = useState(selectedRoleId);

    // Sync query when selectedRoleId prop changes
    if (selectedRoleId !== prevSelectedRoleId) {
        setPrevSelectedRoleId(selectedRoleId);
        if (selectedRoleId) {
            const role = roles.find(r => r.roleId === selectedRoleId);
            if (role) setQuery(role.roleName);
        } else {
            setQuery('');
        }
    }

    // Compute active suggestions
    const suggestions = query && isOpen && searchFn ? searchFn(query).slice(0, 12) : [];

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                // Reset to selected role if they click away
                if (selectedRoleId) {
                    const role = roles.find(r => r.roleId === selectedRoleId);
                    if (role) setQuery(role.roleName);
                } else {
                    setQuery('');
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, selectedRoleId, roles]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        setHighlightedIndex(-1); // Reset highlight when typing

        // If entirely cleared, clear the selection
        if (val.trim() === '') {
            onSelectRole(null);
        }
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                handleSelect(suggestions[highlightedIndex]);
            } else if (suggestions.length === 1) {
                // Auto select if only 1 option
                handleSelect(suggestions[0]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            if (selectedRoleId) {
                const role = roles.find(r => r.roleId === selectedRoleId);
                if (role) setQuery(role.roleName);
            } else {
                setQuery('');
            }
        }
    };

    const handleSelect = (role) => {
        setQuery(role.roleName);
        setIsOpen(false);
        setHighlightedIndex(-1);
        onSelectRole(role);
        // Remove focus so mobile keyboard closes natively
        inputRef.current?.blur();
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            {label && (
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-slate-50 dark:bg-[#1c2533] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#13ec6d]/50 focus:border-[#13ec6d] transition-all font-medium"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="role-listbox"
                    aria-activedescendant={highlightedIndex >= 0 ? `role-option-${highlightedIndex}` : undefined}
                />
            </div>

            {isOpen && query.length > 0 && (
                <ul
                    id="role-listbox"
                    className="absolute z-50 w-full mt-2 lg:mt-1 bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-[#1e293b] rounded-xl shadow-2xl max-h-72 overflow-y-auto"
                    role="listbox"
                >
                    {suggestions.length > 0 ? (
                        suggestions.map((role, idx) => {
                            const isHighlighted = idx === highlightedIndex;
                            const isSelected = selectedRoleId === role.roleId;

                            return (
                                <li
                                    key={role.roleId}
                                    id={`role-option-${idx}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(role)}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    className={`cursor-pointer px-4 py-3 border-b border-slate-100 dark:border-[#1e293b] last:border-0 transition-colors ${isHighlighted ? 'bg-slate-100 dark:bg-slate-800' :
                                            isSelected ? 'bg-[#13ec6d]/10 dark:bg-[#13ec6d]/5' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className={`text-sm font-bold ${isSelected ? 'text-[#13ec6d]' : 'text-slate-900 dark:text-white'}`}>
                                                {role.roleName}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Briefcase size={12} /> {role.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })
                    ) : (
                        <li className="px-4 py-6 text-center text-sm text-slate-500 whitespace-nowrap">
                            No roles match <strong className="text-slate-700 dark:text-slate-300">"{query}"</strong>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
