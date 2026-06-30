/**
 * Career Engine v2
 * Multi-variable career projection with education, demand, and resume factors.
 * Produces salary ranges (optimistic/realistic/pessimistic) and role-specific title ladders.
 */

const PROFICIENCY_SCORE = { beginner: 0.33, intermediate: 0.66, advanced: 1.0 };

function getWeightedSkillMatch(role, userSkillsWithLevels = []) {
    const weights = role.skillWeights || {};
    const required = role.requiredSkills || [];
    if (required.length === 0) return { ratio: 0, weightedScore: 0, maxScore: 0 };

    const userMap = {};
    for (const s of userSkillsWithLevels) {
        userMap[s.name.toLowerCase()] = PROFICIENCY_SCORE[s.level] || 0.66;
    }

    let totalWeight = 0;
    let earnedScore = 0;

    for (const skill of required) {
        const w = weights[skill] || 0.8;
        totalWeight += w;
        const userLevel = userMap[skill.toLowerCase()];
        if (userLevel !== undefined) {
            earnedScore += userLevel * w;
        }
    }

    return {
        ratio: totalWeight > 0 ? earnedScore / totalWeight : 0,
        weightedScore: Math.round(earnedScore * 100) / 100,
        maxScore: Math.round(totalWeight * 100) / 100
    };
}

function getEducationMultiplier(role, education) {
    if (!role.educationBonus || !education) return 1.0;
    return role.educationBonus[education] || 0.9;
}

function getDemandFactor(role) {
    const factors = { high: 1.1, medium: 1.0, low: 0.85, emerging: 1.15 };
    return factors[role.demandLevel] || 1.0;
}

export function simulateCareer({ skills = [], targetRole, rolesDataset = [], education = '', hasResume = false, skillsWithLevels = [] }) {
    const role = rolesDataset.find(r => r.roleId === targetRole);
    if (!role) throw new Error(`Role not found for ID: ${targetRole}`);

    // Build skills with levels (migrate flat skills if needed)
    const swl = skillsWithLevels.length > 0
        ? skillsWithLevels
        : skills.map(s => ({ name: s, level: 'intermediate' }));

    const { ratio: weightedMatchRatio } = getWeightedSkillMatch(role, swl);
    const eduMultiplier = getEducationMultiplier(role, education);
    const demandFactor = getDemandFactor(role);
    const resumeBoost = hasResume ? 0.02 : 0;

    // Clamp and compute
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    const skillFactor = clamp(0.6 + weightedMatchRatio * 0.7, 0.6, 1.3);
    const effectiveGrowth = clamp(role.growthRate * skillFactor * demandFactor + resumeBoost, 0.08, 0.28);

    const startingSalary = (role.baseSalaryINR || 600000) * eduMultiplier * clamp(0.8 + weightedMatchRatio * 0.4, 0.8, 1.2);

    // Title ladder
    const titles = role.titleProgression || ['Junior', 'Mid', 'Senior', 'Lead', 'Principal'];

    // 5-year projection with ranges
    const projection = [];
    let realisticSalary = startingSalary;
    let optimisticSalary = startingSalary;
    let pessimisticSalary = startingSalary;

    for (let year = 1; year <= 5; year++) {
        projection.push({
            year,
            title: titles[year - 1] || titles[titles.length - 1],
            salaryINR: Math.round(realisticSalary),
            salaryOptimistic: Math.round(optimisticSalary),
            salaryPessimistic: Math.round(pessimisticSalary),
            skillMatch: Math.round(weightedMatchRatio * 100),
            milestone: getMilestone(role, year)
        });

        realisticSalary *= (1 + effectiveGrowth);
        optimisticSalary *= (1 + effectiveGrowth + 0.04);
        pessimisticSalary *= (1 + Math.max(0.06, effectiveGrowth - 0.04));
    }

    // Binary match for backward compat
    const normalizedUserSkills = skills.map(s => s.toLowerCase());
    const matchedSkills = role.requiredSkills.filter(s => normalizedUserSkills.includes(s.toLowerCase()));
    const missingSkills = role.requiredSkills.filter(s => !normalizedUserSkills.includes(s.toLowerCase()));
    const binaryMatchPercent = role.requiredSkills.length > 0 ? Math.round((matchedSkills.length / role.requiredSkills.length) * 100) : 0;

    return {
        projection,
        explain: {
            requiredSkills: role.requiredSkills,
            matchedSkills,
            missingSkills,
            skillMatchPercent: binaryMatchPercent,
            weightedMatchPercent: Math.round(weightedMatchRatio * 100),
            effectiveGrowthPercent: Math.round(effectiveGrowth * 100),
            educationMultiplier: eduMultiplier,
            demandFactor: getDemandFactor(role),
            demandLevel: role.demandLevel || 'medium'
        }
    };
}

function getMilestone(role, year) {
    const category = (role.category || '').toLowerCase();
    const milestones = {
        engineering: ['Build your first production feature', 'Own a module end-to-end', 'Design a subsystem', 'Mentor junior engineers', 'Architect a platform'],
        'data & ai': ['Clean and analyze your first dataset', 'Build a prediction model', 'Deploy a model to production', 'Lead a data initiative', 'Define the data strategy'],
        design: ['Complete your first design system', 'Lead a product redesign', 'Run user research studies', 'Define design standards', 'Lead the design organization'],
        management: ['Lead your first project', 'Deliver a cross-team initiative', 'Build and grow a team', 'Drive organizational change', 'Set company-wide strategy'],
        default: ['Learn the fundamentals', 'Take on increasing responsibility', 'Become a domain expert', 'Lead initiatives', 'Shape the direction']
    };
    const list = milestones[category] || milestones.default;
    return list[year - 1] || list[list.length - 1];
}
