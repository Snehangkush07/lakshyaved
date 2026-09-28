import { extractSkillsFromText } from '../parsing/resumeParser';

export function analyzeSkillGap({ resumeText, targetRoleId, rolesDataset, confirmedSkills }) {
    if (!resumeText && !confirmedSkills) throw new Error("Resume text or confirmed skills are required");
    if (!targetRoleId) throw new Error("Target role is required");
    if (!rolesDataset) throw new Error("Roles dataset is missing");

    const role = rolesDataset.find(r => r.roleId === targetRoleId);
    if (!role) throw new Error("Role not found");

    const requiredSkills = role.requiredSkills || [];
    const extractedSkills = confirmedSkills || extractSkillsFromText(resumeText, rolesDataset);

    // Make case-insensitive match maps
    const extractedMap = new Set(extractedSkills.map(s => s.toLowerCase()));

    const matchedSkills = [];
    const missingSkills = [];

    requiredSkills.forEach(reqSkill => {
        if (extractedMap.has(reqSkill.toLowerCase())) {
            matchedSkills.push(reqSkill);
        } else {
            missingSkills.push(reqSkill);
        }
    });

    const matchRate = requiredSkills.length === 0 ? 0 :
        Math.round((matchedSkills.length / requiredSkills.length) * 100);

    // Priority based roadmaps for missing skills
    const roadmap = missingSkills.map((skill, index) => {
        const lowerSkill = skill.toLowerCase();
        let steps = [];
        
        if (lowerSkill.includes('react') || lowerSkill.includes('vue') || lowerSkill.includes('angular') || lowerSkill.includes('ui') || lowerSkill.includes('frontend')) {
            steps = [
                `Learn ${skill} fundamentals`,
                `Build a UI component using ${skill}`,
                `Integrate ${skill} into a larger application`
            ];
        } else if (lowerSkill.includes('sql') || lowerSkill.includes('database') || lowerSkill.includes('mongo')) {
            steps = [
                `Study ${skill} queries and schema design`,
                `Set up a local ${skill} environment`,
                `Build an API connected to ${skill}`
            ];
        } else if (lowerSkill.includes('python') || lowerSkill.includes('data') || lowerSkill.includes('machine learning')) {
            steps = [
                `Complete a ${skill} syntax crash course`,
                `Analyze a public dataset using ${skill}`,
                `Publish a ${skill} notebook on Kaggle/GitHub`
            ];
        } else {
            steps = [
                `Complete an introductory course on ${skill}`,
                `Build a small proof-of-concept project with ${skill}`,
                `Add ${skill} project to your portfolio`
            ];
        }

        return {
            title: skill,
            priority: index < 2 ? 'high' : 'medium',
            steps
        };
    });

    return {
        targetRole: role.roleName,
        targetRoleId: role.roleId,
        matchRate,
        matchedCount: matchedSkills.length,
        missingCount: missingSkills.length,
        matchedSkills,
        missingSkills,
        roadmap,
        extractedSkills
    };
}
