import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsPath = path.resolve(__dirname, '../src/core/data/skills.v1.json');
const interestsPath = path.resolve(__dirname, '../src/core/data/interests.v1.json');
const rolesPath = path.resolve(__dirname, '../src/core/data/roles.v1.json');

const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
const interests = JSON.parse(fs.readFileSync(interestsPath, 'utf8'));
const roles = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));

const errors = [];
const warnings = [];

// ==========================================
// Checks on skills.v1.json
// ==========================================

// 1. Every skill has a non-empty skillId, skillName, and category.
skills.forEach((skill, index) => {
  const prefix = skill.skillId ? `[skills.v1.json:${skill.skillId}]` : `[skills.v1.json:index ${index}]`;
  if (typeof skill.skillId !== 'string' || !skill.skillId.trim()) {
    errors.push(`${prefix} Missing or empty 'skillId'`);
  }
  if (typeof skill.skillName !== 'string' || !skill.skillName.trim()) {
    errors.push(`${prefix} Missing or empty 'skillName'`);
  }
  if (typeof skill.category !== 'string' || !skill.category.trim()) {
    errors.push(`${prefix} Missing or empty 'category'`);
  }
});

// 2. No two skills share the same skillId.
const seenSkillIds = new Set();
skills.forEach(skill => {
  if (skill.skillId) {
    if (seenSkillIds.has(skill.skillId)) {
      errors.push(`[skills.v1.json:${skill.skillId}] Duplicate skillId '${skill.skillId}'`);
    }
    seenSkillIds.add(skill.skillId);
  }
});

// 3. No two skills share the same skillName (case-insensitive).
const seenSkillNames = new Map();
skills.forEach(skill => {
  if (skill.skillName && typeof skill.skillName === 'string') {
    const lower = skill.skillName.trim().toLowerCase();
    if (seenSkillNames.has(lower)) {
      errors.push(`[skills.v1.json:${skill.skillId}] Duplicate skillName '${skill.skillName}' (collides with skillId '${seenSkillNames.get(lower)}')`);
    } else {
      seenSkillNames.set(lower, skill.skillId);
    }
  }
});

// 4. No alias appears in more than one skill's alias list, and no alias equals another skill's skillName (case-insensitive).
// Report the colliding alias and the two skillIds involved.
const seenAliases = new Map();
skills.forEach(skill => {
  if (Array.isArray(skill.aliases)) {
    skill.aliases.forEach(alias => {
      if (typeof alias === 'string' && alias.trim()) {
        const lower = alias.trim().toLowerCase();
        // Check if alias equals another skill's skillName (case-insensitive)
        if (seenSkillNames.has(lower) && seenSkillNames.get(lower) !== skill.skillId) {
          errors.push(`[skills.v1.json:${skill.skillId}] Alias '${alias}' of skill '${skill.skillId}' collides with skillName of skill '${seenSkillNames.get(lower)}'`);
        }
        // Check if alias appears in more than one skill's alias list
        if (seenAliases.has(lower) && seenAliases.get(lower) !== skill.skillId) {
          errors.push(`[skills.v1.json:${skill.skillId}] Colliding alias '${alias}' between skill '${seenAliases.get(lower)}' and skill '${skill.skillId}'`);
        } else {
          seenAliases.set(lower, skill.skillId);
        }
      }
    });
  }
});

// ==========================================
// Checks on interests.v1.json
// ==========================================

// 5. Every interest has a non-empty interestId and interestName.
interests.forEach((interest, index) => {
  const prefix = interest.interestId ? `[interests.v1.json:${interest.interestId}]` : `[interests.v1.json:index ${index}]`;
  if (typeof interest.interestId !== 'string' || !interest.interestId.trim()) {
    errors.push(`${prefix} Missing or empty 'interestId'`);
  }
  if (typeof interest.interestName !== 'string' || !interest.interestName.trim()) {
    errors.push(`${prefix} Missing or empty 'interestName'`);
  }
});

// 6. No two interests share the same interestId.
const seenInterestIds = new Set();
interests.forEach(interest => {
  if (interest.interestId) {
    if (seenInterestIds.has(interest.interestId)) {
      errors.push(`[interests.v1.json:${interest.interestId}] Duplicate interestId '${interest.interestId}'`);
    }
    seenInterestIds.add(interest.interestId);
  }
});

// 7. No two interests share the same interestName (case-insensitive).
const seenInterestNames = new Map();
interests.forEach(interest => {
  if (interest.interestName && typeof interest.interestName === 'string') {
    const lower = interest.interestName.trim().toLowerCase();
    if (seenInterestNames.has(lower)) {
      errors.push(`[interests.v1.json:${interest.interestId}] Duplicate interestName '${interest.interestName}' (collides with interestId '${seenInterestNames.get(lower)}')`);
    } else {
      seenInterestNames.set(lower, interest.interestId);
    }
  }
});

// ==========================================
// Checks on roles.v1.json
// ==========================================

// 8. Every role has a non-empty roleId, roleName, category.
roles.forEach((role, index) => {
  const prefix = role.roleId ? `[roles.v1.json:${role.roleId}]` : `[roles.v1.json:index ${index}]`;
  if (typeof role.roleId !== 'string' || !role.roleId.trim()) {
    errors.push(`${prefix} Missing or empty 'roleId'`);
  }
  if (typeof role.roleName !== 'string' || !role.roleName.trim()) {
    errors.push(`${prefix} Missing or empty 'roleName'`);
  }
  if (typeof role.category !== 'string' || !role.category.trim()) {
    errors.push(`${prefix} Missing or empty 'category'`);
  }
});

// 9. No two roles share the same roleId.
const roleIds = new Set();
roles.forEach(role => {
  if (role.roleId) {
    if (roleIds.has(role.roleId)) {
      errors.push(`[roles.v1.json:${role.roleId}] Duplicate roleId '${role.roleId}'`);
    }
    roleIds.add(role.roleId);
  }
});

// 10. Every entry in requiredSkills and niceToHaveSkills (case-insensitive) exists as either a skillName or an alias in skills.v1.json.
// Report every unmapped string with the roleId and the string.
// Collected into a WARNINGS list, printed in a clearly separated section at the end, and still exit 1.
const validSkillStrings = new Set();
skills.forEach(s => {
  if (s.skillName) validSkillStrings.add(s.skillName.trim().toLowerCase());
  if (Array.isArray(s.aliases)) {
    s.aliases.forEach(a => {
      if (typeof a === 'string') validSkillStrings.add(a.trim().toLowerCase());
    });
  }
});

roles.forEach(role => {
  const checkSkillList = (list, fieldName) => {
    if (Array.isArray(list)) {
      list.forEach(skillStr => {
        if (typeof skillStr === 'string') {
          if (!validSkillStrings.has(skillStr.trim().toLowerCase())) {
            warnings.push(`[roles.v1.json:${role.roleId}] Unmapped skill in ${fieldName}: '${skillStr}'`);
          }
        }
      });
    }
  };
  checkSkillList(role.requiredSkills, 'requiredSkills');
  checkSkillList(role.niceToHaveSkills, 'niceToHaveSkills');
});

// 11. Every entry in transitionTo and transitionFrom references a roleId that exists in roles.v1.json.
// Report every unknown roleId with the source roleId and the missing target.
// Same WARNINGS behavior — collect, print, exit 1.
roles.forEach(role => {
  const checkTransitions = (list, fieldName) => {
    if (Array.isArray(list)) {
      list.forEach(targetRoleId => {
        if (!roleIds.has(targetRoleId)) {
          warnings.push(`[roles.v1.json:${role.roleId}] Unknown target roleId in ${fieldName}: '${targetRoleId}'`);
        }
      });
    }
  };
  checkTransitions(role.transitionTo, 'transitionTo');
  checkTransitions(role.transitionFrom, 'transitionFrom');
});

// 12. Every role has exactly 5 entries in titleProgression.
roles.forEach(role => {
  if (!Array.isArray(role.titleProgression) || role.titleProgression.length !== 5) {
    const len = Array.isArray(role.titleProgression) ? role.titleProgression.length : 'not an array';
    errors.push(`[roles.v1.json:${role.roleId}] 'titleProgression' must have exactly 5 entries (has ${len})`);
  }
});

// 13. Every numeric field (baseSalaryINR, seniorSalaryINR, growthRate) is a finite number greater than zero.
roles.forEach(role => {
  ['baseSalaryINR', 'seniorSalaryINR', 'growthRate'].forEach(field => {
    const val = role[field];
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
      errors.push(`[roles.v1.json:${role.roleId}] '${field}' must be a finite number greater than zero (got ${val})`);
    }
  });
});

// 14. Every entry in skillWeights (if present) is a number between 0 and 1 inclusive.
roles.forEach(role => {
  if (role.skillWeights && typeof role.skillWeights === 'object' && !Array.isArray(role.skillWeights)) {
    Object.entries(role.skillWeights).forEach(([skill, weight]) => {
      if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1) {
        errors.push(`[roles.v1.json:${role.roleId}] skillWeights['${skill}'] must be a number between 0 and 1 inclusive (got ${weight})`);
      }
    });
  }
});

// ==========================================
// Output & Exit Code
// ==========================================

// We exit 1 if there are any errors or warnings:
// because the plan is to fix these over time, and we want the exit code to reflect the current data quality.
const totalFailures = errors.length + warnings.length;

if (totalFailures === 0) {
  console.log('✓ All dataset checks passed.');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.error('=== ERRORS ===');
    errors.forEach(err => console.error(err));
  }

  if (warnings.length > 0) {
    if (errors.length > 0) {
      console.warn('');
    }
    console.warn('=== WARNINGS ===');
    warnings.forEach(warn => console.warn(warn));
  }

  console.error(`\n✖ ${totalFailures} checks failed.`);
  process.exit(1);
}
