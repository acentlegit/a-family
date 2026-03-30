export type RelativeOption = { value: string; label: string };

const sid = (id: unknown): string => (id == null || id === '' ? '' : String(id));

/**
 * Build select options: spouse pairs as "A & B", plus anyone not in a listed pair alone.
 */
export function buildRelativeSelectGroupsFromMembers(members: any[]): {
  couples: RelativeOption[];
  individuals: RelativeOption[];
} {
  const couples: RelativeOption[] = [];
  const inCouple = new Set<string>();
  const seen = new Set<string>();
  const byId = new Map<string, any>();
  for (const m of members) {
    const id = sid(m._id);
    if (id) byId.set(id, m);
  }

  for (const m of members) {
    const id = sid(m._id);
    if (!id) continue;
    const spouseId = sid(m.spouse?._id ?? m.spouse);
    if (!spouseId || !byId.has(spouseId)) continue;
    const [a, b] = [id, spouseId].sort();
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pa = byId.get(a);
    const pb = byId.get(b);
    if (!pa || !pb) continue;
    const label = `${pa.firstName || ''} ${pa.lastName || ''} & ${pb.firstName || ''} ${pb.lastName || ''}`.trim();
    couples.push({ value: `couple:${a}:${b}`, label });
    inCouple.add(a);
    inCouple.add(b);
  }

  couples.sort((x, y) => x.label.localeCompare(y.label, undefined, { sensitivity: 'base' }));

  const individuals: RelativeOption[] = [];
  for (const m of members) {
    const id = sid(m._id);
    if (!id || inCouple.has(id)) continue;
    const rel = m.relationship ? ` (${m.relationship})` : '';
    individuals.push({
      value: id,
      label: `${m.firstName || ''} ${m.lastName || ''}${rel}`.trim()
    });
  }
  individuals.sort((x, y) => x.label.localeCompare(y.label, undefined, { sensitivity: 'base' }));

  return { couples, individuals };
}

/** FamilyTree `people` map (Person.id keys, spouse is spouse id string). */
export function buildRelativeSelectGroupsFromPeople(
  people: Record<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      relationship?: string;
      spouse?: string;
    }
  >
): { couples: RelativeOption[]; individuals: RelativeOption[] } {
  const list = Object.values(people);
  const members = list.map((p) => ({
    _id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    relationship: p.relationship,
    spouse: p.spouse
  }));
  return buildRelativeSelectGroupsFromMembers(members);
}

/** Parse `couple:idA:idB` into father/mother by gender when possible. */
export function parseCoupleSelection(
  value: string,
  getPerson: (id: string) => { gender?: string } | undefined
): { fatherId: string; motherId: string } | null {
  if (!value.startsWith('couple:')) return null;
  const parts = value.split(':');
  if (parts.length < 3) return null;
  const ida = parts[1];
  const idb = parts[2];
  const pa = getPerson(ida);
  const pb = getPerson(idb);
  if (!pa || !pb) return null;
  const ma = (pa.gender || '').toLowerCase() === 'male';
  const mb = (pb.gender || '').toLowerCase() === 'male';
  const fa = (pa.gender || '').toLowerCase() === 'female';
  const fb = (pb.gender || '').toLowerCase() === 'female';
  if (ma && fb) return { fatherId: ida, motherId: idb };
  if (mb && fa) return { fatherId: idb, motherId: ida };
  return { fatherId: ida, motherId: idb };
}
