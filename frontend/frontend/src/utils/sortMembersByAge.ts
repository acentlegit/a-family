/**
 * Elder-first member ordering: by date of birth when present, else by relationship tier
 * (great great grandparents → … → great grandchildren), then stored generation, then name.
 */

export type SortableMember = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  generation?: number;
  relationship?: string;
};

export const getBirthTimestamp = (member: SortableMember): number | null => {
  const dob = member?.dateOfBirth;
  if (!dob) return null;
  const parsed = new Date(dob).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getDisplayName = (member: SortableMember): string =>
  `${member?.firstName || ''} ${member?.lastName || ''}`.trim();

/** Lower = older generation in the tree (aligned with Members.tsx relationship tiers). */
export const getRelationshipGenerationRank = (relationship: string | undefined): number => {
  const rel = (relationship || '').toLowerCase().trim();
  if (rel === 'great great grandfather' || rel === 'great great grandmother') {
    return 0;
  }
  if (rel === 'great grandfather' || rel === 'great grandmother') {
    return 1;
  }
  if (
    rel === 'grandfather' ||
    rel === 'grandmother' ||
    rel === 'great uncle' ||
    rel === 'great aunt'
  ) {
    return 2;
  }
  if (
    rel === 'father' ||
    rel === 'mother' ||
    rel === 'uncle' ||
    rel === 'aunt' ||
    rel === 'stepfather' ||
    rel === 'stepmother' ||
    rel === 'father-in-law' ||
    rel === 'mother-in-law' ||
    rel === 'adoptive father' ||
    rel === 'adoptive mother' ||
    rel === 'myself'
  ) {
    return 3;
  }
  if (
    rel === 'son' ||
    rel === 'daughter' ||
    rel === 'brother' ||
    rel === 'sister' ||
    rel === 'cousin' ||
    rel === 'half brother' ||
    rel === 'half sister' ||
    rel === 'stepbrother' ||
    rel === 'stepsister' ||
    rel === 'nephew' ||
    rel === 'niece' ||
    rel === 'spouse' ||
    rel === 'brother-in-law' ||
    rel === 'sister-in-law' ||
    rel === 'son-in-law' ||
    rel === 'daughter-in-law' ||
    rel === 'stepson' ||
    rel === 'stepdaughter' ||
    rel === 'adopted son' ||
    rel === 'adopted daughter' ||
    rel === 'guardian'
  ) {
    return 4;
  }
  if (rel === 'grandson' || rel === 'granddaughter') {
    return 5;
  }
  if (rel === 'great grandson' || rel === 'great granddaughter') {
    return 6;
  }
  if (rel === 'other') {
    return 1;
  }
  return 1;
};

export function sortMembersByAgeDesc<T extends SortableMember>(memberList: T[]): T[] {
  return [...memberList].sort((a, b) => {
    const aBirth = getBirthTimestamp(a);
    const bBirth = getBirthTimestamp(b);

    if (aBirth !== null && bBirth !== null) return aBirth - bBirth;
    if (aBirth !== null) return -1;
    if (bBirth !== null) return 1;

    const aRel = getRelationshipGenerationRank(a.relationship);
    const bRel = getRelationshipGenerationRank(b.relationship);
    if (aRel !== bRel) return aRel - bRel;

    const aGen = typeof a?.generation === 'number' ? a.generation : Number.MAX_SAFE_INTEGER;
    const bGen = typeof b?.generation === 'number' ? b.generation : Number.MAX_SAFE_INTEGER;
    if (aGen !== bGen) return aGen - bGen;

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
}
