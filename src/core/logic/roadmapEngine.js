import learningResources from '../data/learningResources.v1.json' with { type: 'json' };
import skillsDataset from '../data/skills.v1.json' with { type: 'json' };
import { getAllRoles } from './dataStore.js';

const resourcesById = Object.fromEntries(learningResources.map(r => [r.skillId, r]));
const skillNameToId = Object.fromEntries(
    skillsDataset.map(s => [s.skillName.toLowerCase(), s.skillId])
);

function partitionTopics(topics, k) {
    if (k <= 1) return [topics];
    if (k >= topics.length) {
        const groups = topics.map(t => [t]);
        while (groups.length < k) {
            groups.push([]);
        }
        return groups;
    }

    const totalHours = topics.reduce((sum, t) => sum + (Number(t.hours) || 4), 0);
    const targetHoursPerGroup = totalHours / k;

    const groups = [];
    let currentGroup = [];
    let currentHours = 0;
    let topicsLeft = topics.length;

    for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const groupsLeft = k - groups.length;

        if (topicsLeft === groupsLeft && currentGroup.length > 0) {
            groups.push(currentGroup);
            currentGroup = [topic];
            currentHours = Number(topic.hours) || 4;
            topicsLeft--;
            continue;
        }

        currentGroup.push(topic);
        currentHours += (Number(topic.hours) || 4);
        topicsLeft--;

        if (currentHours >= targetHoursPerGroup && groupsLeft > 1 && topicsLeft >= (groupsLeft - 1)) {
            groups.push(currentGroup);
            currentGroup = [];
            currentHours = 0;
        }
    }

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    while (groups.length < k) {
        groups.push([]);
    }

    return groups;
}

export function generateRoadmap({ targetRole, missingSkills = [], durationWeeks = 4 }) {
    if (!targetRole) throw new Error("targetRole is required");

    const validDurations = [4, 8, 12];
    const duration = validDurations.includes(Number(durationWeeks)) ? Number(durationWeeks) : 4;

    const skillsToCover = missingSkills.length > 0
        ? [...missingSkills]
        : ["Domain Fundamentals", "Core Patterns", "Advanced Tools", "Best Practices"];

    // Step 1: Build skill topic lists
    const skillsData = skillsToCover.map(skill => {
        const lower = skill.toLowerCase();
        const skillId = skillNameToId[lower] || lower;
        const resourceEntry = resourcesById[skillId] || resourcesById[lower];

        let topics = [];
        if (resourceEntry && resourceEntry.topics && resourceEntry.topics.length > 0) {
            topics = resourceEntry.topics.map(t => ({
                title: t.title,
                hours: Number(t.hours) || 4,
                resources: t.resources || []
            }));
        } else {
            topics = [{
                title: `Complete fundamentals + notes for ${skill}`,
                hours: 4,
                resources: []
            }];
        }

        const topicHours = topics.reduce((sum, t) => sum + t.hours, 0);
        return {
            skillName: skill,
            topics,
            topicHours,
            skillHours: topicHours + 4 + 1
        };
    });

    // Step 2: Compute total hours and pace check
    let practiceHours = 4;
    const capstoneHours = duration === 4 ? 20 : 24; 
    let totalHours = skillsData.reduce((sum, s) => sum + s.skillHours, 0) + capstoneHours;
    let hoursPerWeek = totalHours / duration;

    while (hoursPerWeek > 25) {
        let trimmed = false;
        for (const s of skillsData) {
            if (s.topics.length > 2) {
                const removed = s.topics.pop();
                s.topicHours -= removed.hours;
                s.skillHours -= removed.hours;
                totalHours -= removed.hours;
                trimmed = true;
            }
        }
        hoursPerWeek = totalHours / duration;
        if (!trimmed) break;
    }

    while (hoursPerWeek < 8) {
        practiceHours += 1;
        for (const s of skillsData) {
            s.skillHours += 1;
            totalHours += 1;
        }
        hoursPerWeek = totalHours / duration;
    }

    // Step 3: Distribute weeks to skills
    const skillWeeksCount = Math.max(1, duration - 2);
    let allocatedWeeks = skillsData.length;
    skillsData.forEach(s => s.weeksForSkill = 1);

    while (allocatedWeeks < skillWeeksCount) {
        let best = skillsData[0];
        for (const s of skillsData) {
            if ((s.topics.length / s.weeksForSkill) > (best.topics.length / best.weeksForSkill)) {
                best = s;
            }
        }
        best.weeksForSkill += 1;
        allocatedWeeks += 1;
    }

    const skillBlocks = [];
    for (const skillItem of skillsData) {
        const { skillName, topics, weeksForSkill } = skillItem;
        const slug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const topicGroups = partitionTopics(topics, weeksForSkill);

        for (let w = 0; w < weeksForSkill; w++) {
            const topicGroup = topicGroups[w] || [];
            const blockTasks = [];

            if (topicGroup.length > 0) {
                topicGroup.forEach((topic, idx) => {
                    blockTasks.push({
                        id: `${slug}-w{WEEK}-learn-${idx}`,
                        type: 'learn',
                        title: topic.title,
                        estHours: topic.hours,
                        resources: topic.resources,
                        skillName
                    });
                });
            } else {
                blockTasks.push({
                    id: `${slug}-w{WEEK}-learn-0`,
                    type: 'learn',
                    title: `Core concepts and deep dive in ${skillName}`,
                    estHours: 4,
                    resources: [],
                    skillName
                });
            }

            blockTasks.push({
                id: `${slug}-w{WEEK}-practice`,
                type: 'practice',
                title: `Practice exercises for ${skillName}`,
                estHours: practiceHours,
                resources: [],
                skillName
            });

            if (w === weeksForSkill - 1) {
                blockTasks.push({
                    id: `${slug}-w{WEEK}-revise`,
                    type: 'revise',
                    title: `Review + summarize ${skillName}`,
                    estHours: 1,
                    resources: [],
                    skillName
                });
            }

            skillBlocks.push({
                skillName,
                tasks: blockTasks
            });
        }
    }

    const weeks = Array.from({ length: skillWeeksCount }, (_, i) => ({
        week: i + 1,
        focusSkills: [],
        tasks: [],
        estHours: 0,
        weekEstHours: 0
    }));

    skillBlocks.forEach((block, idx) => {
        const weekIdx = Math.floor(idx * skillWeeksCount / skillBlocks.length);
        const targetWeek = weeks[weekIdx];
        
        if (!targetWeek.focusSkills.includes(block.skillName)) {
            targetWeek.focusSkills.push(block.skillName);
        }

        block.tasks.forEach(task => {
            const finalizedTask = { ...task, id: task.id.replace('{WEEK}', targetWeek.week) };
            targetWeek.tasks.push(finalizedTask);
            targetWeek.estHours += finalizedTask.estHours;
            targetWeek.weekEstHours += finalizedTask.estHours;
        });
    });

    // Step 4: Capstone tasks
    const rolesDataset = getAllRoles();
    const roleObj = rolesDataset.find(r => r.roleId === targetRole);
    let capstoneSkills = [...skillsToCover];
    if (roleObj && roleObj.skillWeights) {
        capstoneSkills.sort((a, b) => {
            const wa = roleObj.skillWeights[a] || 0;
            const wb = roleObj.skillWeights[b] || 0;
            return wb - wa;
        });
    }
    const top3Skills = capstoneSkills.slice(0, 3);
    const top3SkillsText = top3Skills.join(', ');

    weeks.push({
        week: duration - 1,
        focusSkills: ['Capstone'],
        tasks: [{
            id: `capstone-plan`,
            type: 'build',
            title: `Plan your capstone project using ${top3SkillsText}`,
            estHours: 6,
            resources: [],
            skillName: 'Capstone'
        }],
        estHours: 6,
        weekEstHours: 6
    });

    weeks.push({
        week: duration,
        focusSkills: ['Capstone'],
        tasks: [{
            id: `capstone-ship`,
            type: 'build',
            title: `Ship your capstone project using ${top3SkillsText}`,
            estHours: duration === 4 ? 14 : 18,
            resources: [],
            skillName: 'Capstone'
        }],
        estHours: duration === 4 ? 14 : 18,
        weekEstHours: duration === 4 ? 14 : 18
    });

    // Step 5: Compose the plan object
    const allTasks = weeks.flatMap(w => w.tasks);
    const calculatedTotalHours = weeks.reduce((sum, w) => sum + w.estHours, 0);

    return {
        id: `${targetRole}-${duration}`,
        targetRole,
        durationWeeks: duration,
        weeks,
        summary: {
            totalTasks: allTasks.length,
            totalEstHours: calculatedTotalHours,
            hoursPerWeek: Math.round(calculatedTotalHours / duration),
            skillsCovered: skillsData.map(s => s.skillName),
            capstoneSkills: top3Skills,
            generatedAt: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}
