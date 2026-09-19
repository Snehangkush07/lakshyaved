import { getAllSkills } from "../logic/dataStore";
import { normalizeSkillToken } from "./skillNormalizer";

export function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9+# \n]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractSkillsFromText(text, rolesDataset) {
    if (!text) return [];

    const allSkills = getAllSkills();
    const allKnownSkills = new Set();

    // add from centralized db
    allSkills.forEach(skill => {
        if (skill.skillName) {
            allKnownSkills.add(skill.skillName);
        }
        if (skill.aliases) {
            skill.aliases.forEach(a => allKnownSkills.add(a));
        }
    });

    // fallback from dataset to not break older rolesDataset
    if (rolesDataset) {
        rolesDataset.forEach(role => {
            if (role.requiredSkills) {
                role.requiredSkills.forEach(s => allKnownSkills.add(s));
            }
        });
    }

    const normalized = normalizeText(text);
    const foundCanonicalSkills = new Set();

    for (const originalSkill of allKnownSkills) {
        const normSkill = normalizeText(originalSkill);
        if (!normSkill) continue;

        let isMatch = false;
        const paddedText = ` ${normalized} `;
        const paddedSkill = ` ${normSkill} `;

        if (paddedText.includes(paddedSkill)) {
            isMatch = true;
        } else {
            if (normalized.includes(normSkill)) {
                const idx = normalized.indexOf(normSkill);
                const before = idx > 0 ? normalized[idx - 1] : ' ';
                const after = idx + normSkill.length < normalized.length ? normalized[idx + normSkill.length] : ' ';
                if (before === ' ' && after === ' ') {
                    isMatch = true;
                }
            }
        }

        if (isMatch) {
            const canonical = normalizeSkillToken(originalSkill);
            foundCanonicalSkills.add(canonical);
        }
    }

    return Array.from(foundCanonicalSkills);
}

export function detectResumeSections(rawText) {
    if (!rawText) return { education: false, projects: false, experience: false, skills: false, links: false, certifications: false, summary: false };

    const text = rawText.toLowerCase();

    // Heuristics based on keywords
    return {
        education: /(education|academic|degree|university|college|bachelor|master|phd)/.test(text),
        projects: /(projects|project|capstone|portfolio)/.test(text),
        experience: /(experience|internship|employment|work history)/.test(text),
        skills: /(skills|technical skills|tools|technologies)/.test(text),
        links: /(linkedin\.com|github\.com|https?:\/\/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/.test(text),
        certifications: /(certification|certificate|certified)/.test(text),
        summary: /(summary|objective|profile|about me)/.test(text)
    };
}

export function computeResumeScore(sectionsObj) {
    let score = 0;
    if (sectionsObj.education) score += 15;
    if (sectionsObj.projects) score += 20;
    if (sectionsObj.experience) score += 20;
    if (sectionsObj.skills) score += 15;
    if (sectionsObj.links) score += 10;
    if (sectionsObj.certifications) score += 10;
    if (sectionsObj.summary) score += 10;

    return Math.min(100, Math.max(0, score));
}

export function generateResumeSuggestions(sectionsObj) {
    const suggestions = [];

    if (!sectionsObj.summary) {
        suggestions.push("Add a brief Professional Summary or Objective at the top to highlight your goals.");
    }
    if (!sectionsObj.links) {
        suggestions.push("Add your GitHub, LinkedIn, or Portfolio links and ensure they are clickable.");
    }
    if (!sectionsObj.experience) {
        suggestions.push("Add an Experience section. If you lack formal work experience, include internships or relevant volunteer work.");
    }
    if (!sectionsObj.projects) {
        suggestions.push("Add a Projects section with 2–3 strong technical projects. Briefly describe the problem, tech stack, and impact.");
    }
    if (!sectionsObj.skills) {
        suggestions.push("Add a dedicated Skills section, categorizing them by Languages, Frameworks, and Tools for better readability.");
    }
    if (!sectionsObj.education) {
        suggestions.push("Make sure your Education section clearly lists your degree, university, and relevant graduation dates.");
    }
    if (!sectionsObj.certifications) {
        suggestions.push("Consider adding relevant Certifications or online course completions to boost your profile.");
    }

    if (suggestions.length === 0) {
        suggestions.push("Great job! Your resume format looks very solid and contains all key sections.");
    }

    return suggestions;
}

// --------------------------------------------------
// Enhanced Resume Analysis (Phase 3)
// --------------------------------------------------

const ACTION_VERBS = [
    'built', 'designed', 'developed', 'implemented', 'created', 'architected',
    'led', 'managed', 'coordinated', 'mentored', 'supervised',
    'optimized', 'improved', 'increased', 'reduced', 'streamlined',
    'deployed', 'launched', 'delivered', 'shipped', 'released',
    'analyzed', 'researched', 'evaluated', 'assessed', 'tested',
    'collaborated', 'partnered', 'integrated', 'automated', 'migrated',
    'configured', 'maintained', 'resolved', 'debugged', 'refactored'
];

export function countBulletPoints(text) {
    if (!text) return 0;
    // Count lines that start with bullet-like patterns
    const lines = text.split('\n');
    let count = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^[-•●◦▪*]/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
            count++;
        }
    }
    return count;
}

export function detectActionVerbs(text) {
    if (!text) return { count: 0, found: [], score: 0 };
    const lower = text.toLowerCase();
    const found = ACTION_VERBS.filter(verb => {
        const regex = new RegExp(`\\b${verb}\\b`, 'i');
        return regex.test(lower);
    });
    // Score: 0-100 based on how many action verbs are present
    const score = Math.min(100, Math.round((found.length / 10) * 100));
    return { count: found.length, found, score };
}

export function estimateExperience(text) {
    if (!text) return { years: 0, dateRanges: [] };
    // Look for date patterns like "2020 - 2023", "Jan 2021 - Present", "2019-2022"
    const datePattern = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})\s*[-–—to]+\s*(?:(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})|present|current|now)/gi;
    const matches = [...text.matchAll(datePattern)];
    
    let totalYears = 0;
    const dateRanges = [];
    const currentYear = new Date().getFullYear();

    for (const match of matches) {
        const startYear = parseInt(match[2]);
        const endYear = match[4] ? parseInt(match[4]) : currentYear;
        if (startYear >= 1990 && startYear <= currentYear && endYear >= startYear) {
            const years = endYear - startYear;
            totalYears += years;
            dateRanges.push({ start: startYear, end: endYear, years });
        }
    }

    return { years: totalYears, dateRanges };
}

export function calculateKeywordDensity(text, targetSkills = []) {
    if (!text || targetSkills.length === 0) return { density: 0, found: [], missing: [] };
    const lower = text.toLowerCase();
    const found = [];
    const missing = [];

    for (const skill of targetSkills) {
        if (lower.includes(skill.toLowerCase())) {
            found.push(skill);
        } else {
            missing.push(skill);
        }
    }

    const density = Math.round((found.length / targetSkills.length) * 100);
    return { density, found, missing };
}

export function getEnhancedResumeAnalysis(rawText, targetSkills = []) {
    const sections = detectResumeSections(rawText);
    const baseScore = computeResumeScore(sections);
    const bullets = countBulletPoints(rawText);
    const actionVerbs = detectActionVerbs(rawText);
    const experience = estimateExperience(rawText);
    const keywordDensity = calculateKeywordDensity(rawText, targetSkills);
    const suggestions = generateResumeSuggestions(sections);

    // Enhanced score: base (60%) + action verbs (15%) + bullets (10%) + keywords (15%)
    const bulletScore = Math.min(100, bullets * 10); // 10 bullets = 100
    const enhancedScore = Math.round(
        baseScore * 0.6 +
        actionVerbs.score * 0.15 +
        bulletScore * 0.10 +
        keywordDensity.density * 0.15
    );

    return {
        sections,
        baseScore,
        enhancedScore,
        bullets,
        actionVerbs,
        experience,
        keywordDensity,
        suggestions,
        wordCount: rawText ? rawText.split(/\s+/).length : 0
    };
}

// Convenience & backward compatibility exports
export const extractSkillsFromResume = (text) => extractSkillsFromText(text);
export const enhanceResumeAnalysis = (text, targetSkills) => getEnhancedResumeAnalysis(text, targetSkills);
export function parseResumeText(text) {
    return {
        rawText: text,
        skills: extractSkillsFromText(text),
        sections: detectResumeSections(text)
    };
}
export function scoreResumeCompleteness(text) {
    const sections = detectResumeSections(text);
    return {
        score: computeResumeScore(sections),
        sections,
        suggestions: generateResumeSuggestions(sections)
    };
}

