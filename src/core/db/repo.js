import db from './db.js';

const DEFAULT_ID = 'default';

export async function saveProfile({ skills, interests, targetRole }) {
    const existing = await db.profile.get(DEFAULT_ID);
    return db.profile.put({
        ...(existing || {}),
        id: DEFAULT_ID,
        skills,
        interests,
        targetRole,
        updatedAt: Date.now()
    });
}

export async function getProfile() {
    return db.profile.get(DEFAULT_ID);
}

export async function saveResume(rawText) {
    return db.resume.put({
        id: DEFAULT_ID,
        rawText,
        updatedAt: Date.now()
    });
}

export async function getResume() {
    return db.resume.get(DEFAULT_ID);
}

export async function saveCareerResults(projection) {
    return db.careerResults.put({
        id: DEFAULT_ID,
        projection,
        updatedAt: Date.now()
    });
}

export async function getCareerResults() {
    return db.careerResults.get(DEFAULT_ID);
}

export async function saveSkillGapResults({ targetRole, matchedSkills, missingSkills, roadmap }) {
    return db.skillGapResults.put({
        id: DEFAULT_ID,
        targetRole,
        matchedSkills,
        missingSkills,
        roadmap,
        updatedAt: Date.now()
    });
}

export async function getSkillGapResults() {
    return db.skillGapResults.get(DEFAULT_ID);
}

export async function resetAllData() {
    await Promise.all([
        db.profile.clear(),
        db.resume.clear(),
        db.careerResults.clear(),
        db.skillGapResults.clear()
    ]);
}

export async function saveAppState({ demoMode }) {
    return db.appState.put({
        id: DEFAULT_ID,
        demoMode,
        updatedAt: Date.now()
    });
}

export async function getAppState() {
    return db.appState.get(DEFAULT_ID);
}

// --------------------------------------------------
// Roadmap Builder
// --------------------------------------------------

export async function saveRoadmapPlan(plan) {
    if (!plan || !plan.id) throw new Error("Plan requires an ID");
    plan.updatedAt = Date.now();
    await db.roadmapPlans.put(plan);
    return plan.id;
}

export async function getRoadmapPlanByRole(targetRole, durationWeeks) {
    const id = `${targetRole}-${durationWeeks}`;
    return db.roadmapPlans.get(id);
}

export async function saveRoadmapProgress(planId, state) {
    if (!planId) throw new Error("Plan ID is required to save progress");
    return db.roadmapProgress.put({
        id: planId,
        planId,
        ...state,
        updatedAt: Date.now()
    });
}

export async function getRoadmapProgress(planId) {
    return db.roadmapProgress.get(planId);
}

export async function deleteRoadmapPlan(planId) {
    await db.roadmapPlans.delete(planId);
    await db.roadmapProgress.delete(planId);
}

// --------------------------------------------------
// Onboarding
// --------------------------------------------------

export async function saveOnboardingProfile({ name, currentRole, education, skills, interests, skillsWithLevels }) {
    await db.profile.put({
        id: DEFAULT_ID,
        name,
        currentRole,
        education,
        skills,
        interests,
        skillsWithLevels: skillsWithLevels || skills.map(s => ({ name: s, level: 'intermediate' })),
        updatedAt: Date.now()
    });
    await db.appState.put({
        id: DEFAULT_ID,
        onboarded: true,
        updatedAt: Date.now()
    });
}

export async function isOnboarded() {
    const state = await db.appState.get(DEFAULT_ID);
    return !!(state && state.onboarded);
}

export async function getUserName() {
    const profile = await db.profile.get(DEFAULT_ID);
    return profile?.name || 'User';
}

// --------------------------------------------------
// Data Export / Import
// --------------------------------------------------

export async function exportAllData() {
    const [profile, resume, careerResults, skillGapResults, appState, roadmapPlans, roadmapProgress] = await Promise.all([
        db.profile.toArray(),
        db.resume.toArray(),
        db.careerResults.toArray(),
        db.skillGapResults.toArray(),
        db.appState.toArray(),
        db.roadmapPlans.toArray(),
        db.roadmapProgress.toArray()
    ]);
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { profile, resume, careerResults, skillGapResults, appState, roadmapPlans, roadmapProgress }
    };
}

export async function importAllData(json) {
    if (!json || !json.data) throw new Error('Invalid backup file format.');
    const { profile, resume, careerResults, skillGapResults, appState, roadmapPlans, roadmapProgress } = json.data;

    await Promise.all([
        db.profile.clear(),
        db.resume.clear(),
        db.careerResults.clear(),
        db.skillGapResults.clear(),
        db.appState.clear(),
        db.roadmapPlans.clear(),
        db.roadmapProgress.clear()
    ]);

    const puts = [];
    if (profile?.length) puts.push(db.profile.bulkPut(profile));
    if (resume?.length) puts.push(db.resume.bulkPut(resume));
    if (careerResults?.length) puts.push(db.careerResults.bulkPut(careerResults));
    if (skillGapResults?.length) puts.push(db.skillGapResults.bulkPut(skillGapResults));
    if (appState?.length) puts.push(db.appState.bulkPut(appState));
    if (roadmapPlans?.length) puts.push(db.roadmapPlans.bulkPut(roadmapPlans));
    if (roadmapProgress?.length) puts.push(db.roadmapProgress.bulkPut(roadmapProgress));

    await Promise.all(puts);
}

export async function clearAllData() {
    await Promise.all([
        db.profile.clear(),
        db.resume.clear(),
        db.careerResults.clear(),
        db.skillGapResults.clear(),
        db.appState.clear(),
        db.roadmapPlans.clear(),
        db.roadmapProgress.clear()
    ]);
}
