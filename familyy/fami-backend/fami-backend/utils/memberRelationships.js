/**
 * Single source of truth for Member.relationship enum.
 * Import in models/Member.js — do not duplicate lists elsewhere.
 */
const RELATIONSHIP_VALUES = [
  'Great Great Grandfather',
  'Great Great Grandmother',
  'Great Grandfather',
  'Great Grandmother',
  'Grandfather',
  'Grandmother',
  'Great Uncle',
  'Great Aunt',
  'Father',
  'Mother',
  'Uncle',
  'Aunt',
  'Stepfather',
  'Stepmother',
  'Father-in-law',
  'Mother-in-law',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Cousin',
  'Half Brother',
  'Half Sister',
  'Stepbrother',
  'Stepsister',
  'Nephew',
  'Niece',
  'Myself',
  'Spouse',
  'Brother-in-law',
  'Sister-in-law',
  'Son-in-law',
  'Daughter-in-law',
  'Stepson',
  'Stepdaughter',
  'Grandson',
  'Granddaughter',
  'Great Grandson',
  'Great Granddaughter',
  'Adoptive Father',
  'Adoptive Mother',
  'Adopted Son',
  'Adopted Daughter',
  'Guardian',
  'Other',
];

const ALLOWED_SET = new Set(RELATIONSHIP_VALUES);

/** Lowercase canonical value -> canonical string */
const LOWER_TO_CANONICAL = new Map(
  RELATIONSHIP_VALUES.map((v) => [v.toLowerCase(), v])
);

/**
 * Normalize Excel / user input so Mongoose enum validation passes.
 * Handles trim, NBSP, smart quotes, case differences, and common hyphen variants.
 */
function normalizeRelationship(raw) {
  if (raw === undefined || raw === null) return 'Other';

  let s = String(raw)
    .replace(/^\uFEFF/, '')
    .replace(/[\u00A0\u2000-\u200B\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return 'Other';

  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

  // Hyphen variants (Excel sometimes uses en-dash for "in-law")
  s = s.replace(/\u2013|\u2014/g, '-');

  if (ALLOWED_SET.has(s)) return s;

  const byLower = LOWER_TO_CANONICAL.get(s.toLowerCase());
  if (byLower) return byLower;

  // Normalized compare: ignore multiple spaces
  const collapsed = s.replace(/\s+/g, ' ').trim();
  if (ALLOWED_SET.has(collapsed)) return collapsed;
  const byCollapsedLower = LOWER_TO_CANONICAL.get(collapsed.toLowerCase());
  if (byCollapsedLower) return byCollapsedLower;

  return 'Other';
}

const GENDER_VALUES = ['Male', 'Female', 'Other'];

/**
 * Normalize gender from Excel (e.g. "male", "MALE") to Mongoose enum.
 */
function normalizeGender(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw)
    .replace(/[\u00A0\uFEFF]/g, '')
    .trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower === 'male' || lower === 'm') return 'Male';
  if (lower === 'female' || lower === 'f') return 'Female';
  if (lower === 'other' || lower === 'o') return 'Other';
  if (GENDER_VALUES.includes(s)) return s;
  return undefined;
}

module.exports = {
  RELATIONSHIP_VALUES,
  normalizeRelationship,
  normalizeGender,
};
