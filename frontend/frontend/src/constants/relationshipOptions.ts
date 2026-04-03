/**
 * Canonical relationship labels — keep in sync with `fami-backend/models/Member.js` enum.
 */
export const RELATIONSHIP_OPTIONS: string[] = [
  // Direct ancestors (older generations)
  'Great Great Grandfather',
  'Great Great Grandmother',
  'Great Grandfather',
  'Great Grandmother',
  'Grandfather',
  'Grandmother',
  // Extended (older branches)
  'Great Uncle',
  'Great Aunt',
  // Parents / aunts / uncles
  'Father',
  'Mother',
  'Uncle',
  'Aunt',
  'Stepfather',
  'Stepmother',
  // In-law (parents’ generation)
  'Father-in-law',
  'Mother-in-law',
  // Same generation / children
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
  // In-law (peer / children’s generation)
  'Brother-in-law',
  'Sister-in-law',
  'Son-in-law',
  'Daughter-in-law',
  'Stepson',
  'Stepdaughter',
  // Grandchildren
  'Grandson',
  'Granddaughter',
  'Great Grandson',
  'Great Granddaughter',
  // Adoptive / legal
  'Adoptive Father',
  'Adoptive Mother',
  'Adopted Son',
  'Adopted Daughter',
  'Guardian',
  'Other',
];
