import Dexie from 'dexie';

const db = new Dexie('lakshyaved_db');

db.version(1).stores({
    profile: 'id', // id (string), skills (string[]), interests (string[]), targetRole (string), updatedAt (number)
    resume: 'id', // id (string), rawText (string), updatedAt (number)
    careerResults: 'id', // id (string), projection (array), updatedAt (number)
    skillGapResults: 'id' // id (string), targetRole (string), matchedSkills (string[]), missingSkills (string[]), roadmap (array), updatedAt (number)
});

db.version(2).stores({
    appState: 'id', // id (string), demoMode (boolean), updatedAt (number)
});

db.version(3).stores({
    roadmapPlans: 'id, targetRole, durationWeeks, createdAt, updatedAt', // id (string: role-duration)
    roadmapProgress: 'id, planId, updatedAt' // id (string: planId)
});

db.version(4).stores({
    profile: 'id', // extended: name (string), currentRole (string), education (string), skillsWithLevels (array of {name, level})
    appState: 'id' // extended: onboarded (boolean)
});

db.version(5).stores({
    resume: 'id',
}).upgrade(async (tx) => {
    await tx.table('resume').toCollection().modify((row) => {
        // Old shape: row.rawText might be an object { fileName, fileType, rawText, parsedData }
        if (row && row.rawText && typeof row.rawText === 'object') {
            const old = row.rawText;
            row.fileName = old.fileName || row.fileName || 'resume.pdf';
            row.fileType = old.fileType || row.fileType || 'pdf';
            row.parsedData = old.parsedData || row.parsedData || null;
            row.rawText = typeof old.rawText === 'string' ? old.rawText : '';
        } else {
            // Old shape was a plain string; add missing fields with defaults
            if (!row.fileName) row.fileName = 'resume.pdf';
            if (!row.fileType) row.fileType = 'pdf';
            if (typeof row.parsedData === 'undefined') row.parsedData = null;
        }
    });
});

export default db;
