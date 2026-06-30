/**
 * Recommendation Engine v2
 * Priority-queue scoring with adaptive, context-aware recommendations.
 * Each recommendation has a computed relevanceScore; only top-N are returned.
 */

const PROFICIENCY_SCORE = { beginner: 0.33, intermediate: 0.66, advanced: 1.0 };

export function generateRecommendations({
    targetRole, rolesDataset, profileSkills = [], profileInterests = [],
    resumeSections = null, matchRate = 0, missingSkills = [],
    readinessScore = 0, skillsWithLevels = []
}) {
    if (!targetRole || !rolesDataset) return [];

    const role = rolesDataset.find(r => r.roleId === targetRole);
    if (!role) return [];

    const queue = [];
    const swl = skillsWithLevels.length > 0
        ? skillsWithLevels
        : profileSkills.map(s => ({ name: s, level: 'intermediate' }));

    const userSkillsLower = new Set(profileSkills.map(s => s.toLowerCase()));

    // Rule 1: Missing Skills (critical gap)
    if (missingSkills.length > 0) {
        const topMissing = missingSkills.slice(0, 3);
        const weights = role.skillWeights || {};
        // Sort by weight to recommend highest-weight skill first
        const sorted = [...missingSkills].sort((a, b) => (weights[b] || 0.8) - (weights[a] || 0.8));
        const topWeighted = sorted[0];
        const improvementEstimate = Math.min(35, Math.round((topMissing.length / (role.requiredSkills?.length || 1)) * 70));
        const relevance = 50 + missingSkills.length * 5;

        queue.push({
            id: 'missing-skills', category: 'skill',
            impact: missingSkills.length >= 3 ? 'high' : 'medium',
            relevance,
            title: `Bridge ${missingSkills.length} Skill Gap${missingSkills.length > 1 ? 's' : ''}`,
            text: `Missing: ${topMissing.join(', ')}${missingSkills.length > 3 ? ` +${missingSkills.length - 3} more` : ''}. Learning these could increase your weighted match from ${matchRate}% to ~${Math.min(100, matchRate + improvementEstimate)}%.`,
            actionable: `Start with ${topWeighted} — it has the highest weight (${Math.round((weights[topWeighted] || 0.8) * 100)}%) for ${role.roleName}.`
        });
    }

    // Rule 2: Skill Depth (proficiency upgrade)
    const beginnerSkills = swl.filter(s => s.level === 'beginner');
    if (beginnerSkills.length >= 2 && swl.length >= 5) {
        const relevance = 40 + beginnerSkills.length * 8;
        queue.push({
            id: 'deepen-skills', category: 'skill',
            impact: 'medium', relevance,
            title: 'Deepen Skill Proficiency',
            text: `${beginnerSkills.length} of your skills are at beginner level (${beginnerSkills.map(s => s.name).slice(0, 3).join(', ')}). Advancing these to intermediate would boost your weighted match by ~${Math.round(beginnerSkills.length * 5)}%.`,
            actionable: `Focus on building projects with ${beginnerSkills[0].name} to move from beginner to intermediate.`
        });
    }

    // Rule 3: Skill Breadth (too few)
    if (profileSkills.length < 5) {
        queue.push({
            id: 'skill-breadth', category: 'skill',
            impact: 'medium', relevance: 35 + (5 - profileSkills.length) * 10,
            title: 'Expand Your Skill Set',
            text: `You have ${profileSkills.length} skill${profileSkills.length !== 1 ? 's' : ''} listed. Most ${role.roleName} candidates have 6-10 skills.`,
            actionable: `Add complementary skills like ${(role.niceToHaveSkills || []).slice(0, 2).join(' and ') || 'version control or cloud basics'}.`
        });
    }

    // Rule 4: Resume Section Gaps
    if (resumeSections) {
        const missingSections = [];
        if (!resumeSections.projects) missingSections.push('Projects');
        if (!resumeSections.experience) missingSections.push('Experience');
        if (!resumeSections.summary) missingSections.push('Professional Summary');
        if (!resumeSections.links) missingSections.push('Links (GitHub/LinkedIn)');

        if (missingSections.length > 0) {
            queue.push({
                id: 'resume-sections', category: 'resume',
                impact: missingSections.length >= 3 ? 'high' : 'medium',
                relevance: 30 + missingSections.length * 12,
                title: 'Strengthen Your Resume',
                text: `Resume missing: ${missingSections.join(', ')}. Each section adds ~5% to your resume quality score.`,
                actionable: missingSections.includes('Projects')
                    ? 'Add 2-3 technical projects with tech stack, your role, and measurable impact.'
                    : `Add a ${missingSections[0]} section to your resume.`
            });
        }
    } else {
        queue.push({
            id: 'no-resume', category: 'resume',
            impact: 'high', relevance: 70,
            title: 'Upload Your Resume',
            text: 'No resume detected. Your readiness score is heavily penalized without resume analysis (up to 30 points lost).',
            actionable: 'Go to Skill Gap Analyzer → Upload Resume to unlock full analysis.'
        });
    }

    // Rule 5: Interest Alignment
    if (role.tags && role.category && profileInterests.length > 0) {
        const userInterestsLower = profileInterests.map(i => i.toLowerCase());
        const roleTags = [role.category.toLowerCase(), ...(role.tags || []).map(t => t.toLowerCase())];
        const aligned = roleTags.filter(t => userInterestsLower.includes(t));

        if (aligned.length === 0) {
            queue.push({
                id: 'interest-alignment', category: 'career',
                impact: 'low', relevance: 20,
                title: 'Interest-Role Mismatch',
                text: `Your interests don't align with ${role.roleName} (${role.category}). This may affect long-term satisfaction.`,
                actionable: `Explore roles in ${profileInterests[0]} or expand your interests to include ${role.category}.`
            });
        }
    }

    // Rule 6: Readiness-based
    if (readinessScore < 40) {
        queue.push({
            id: 'readiness-critical', category: 'career',
            impact: 'high', relevance: 80,
            title: 'Readiness Below Threshold',
            text: `Score: ${readinessScore}/100. You need at least 50 to be competitive. The fastest boost: close skill gaps + upload a complete resume.`,
            actionable: 'Use the Roadmap Planner to create a structured learning plan.'
        });
    } else if (readinessScore >= 70) {
        queue.push({
            id: 'readiness-strong', category: 'career',
            impact: 'low', relevance: 15,
            title: 'Strong Profile — Differentiate',
            text: `Score: ${readinessScore}/100 — well above average. Focus on portfolio and real-world experience to stand out from equally-qualified candidates.`,
            actionable: 'Build a capstone project or contribute to open-source in your target domain.'
        });
    }

    // Rule 7: Skill Synergy Detection
    const niceToHave = (role.niceToHaveSkills || []).map(s => s.toLowerCase());
    const matchedNice = niceToHave.filter(s => userSkillsLower.has(s));
    if (matchedNice.length >= 2 && missingSkills.length <= 2) {
        queue.push({
            id: 'skill-synergy', category: 'skill',
            impact: 'low', relevance: 25,
            title: 'Strong Skill Synergy',
            text: `You already know ${matchedNice.length} nice-to-have skills for ${role.roleName}. This puts you ahead of most candidates.`,
            actionable: 'Highlight these bonus skills prominently in your resume and interviews.'
        });
    }

    // Rule 8: Transition Opportunity
    const userMatchRates = rolesDataset
        .filter(r => r.roleId !== targetRole && r.requiredSkills?.length > 0)
        .map(r => {
            const matched = r.requiredSkills.filter(s => userSkillsLower.has(s.toLowerCase()));
            return { role: r, matchRate: Math.round((matched.length / r.requiredSkills.length) * 100) };
        })
        .filter(r => r.matchRate > matchRate + 10)
        .sort((a, b) => b.matchRate - a.matchRate);

    if (userMatchRates.length > 0 && matchRate < 60) {
        const best = userMatchRates[0];
        queue.push({
            id: 'transition-opportunity', category: 'career',
            impact: 'medium', relevance: 35,
            title: `Better Fit: ${best.role.roleName}`,
            text: `Your skills are ${best.matchRate}% matched with ${best.role.roleName} vs ${matchRate}% for ${role.roleName}. Consider exploring this alternative.`,
            actionable: `Use Compare Roles to analyze ${best.role.roleName} vs ${role.roleName} side by side.`
        });
    }

    // Sort by relevance, return top 5
    return queue
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5)
        .sort((a, b) => {
            const priority = { high: 0, medium: 1, low: 2 };
            return (priority[a.impact] || 2) - (priority[b.impact] || 2);
        });
}
