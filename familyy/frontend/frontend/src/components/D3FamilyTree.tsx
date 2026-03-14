import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import '../pages/FamilyTree.css';

/* ---------------- TYPES ---------------- */

export interface FamilyNode {
  name: string;
  spouse?: string;
  spouseNode?: FamilyNode; // Separate node for spouse
  children?: FamilyNode[];
  isSpouse?: boolean; // Flag to indicate this is a spouse node
  relationship?: string; // Relationship label like "Father", "Mother", "Grandfather", etc.
}

// Couple node structure for genealogy chart
interface CoupleNode {
  person1: { id: string; name: string; relationship?: string };
  person2: { id: string; name: string; relationship?: string } | null;
  children: string[];
  generation: number;
  x?: number;
  y?: number;
}

interface Person {
  id: string;
  name: string;
  spouse?: string;
  generation: number;
  children: string[];
  relationship?: string; // Relationship label like "Father", "Mother", "Grandfather", etc.
  gender?: 'male' | 'female'; // Gender to help identify couples (opposite genders = likely couple)
}

// Interface for people data from FamilyTree page (different structure)
interface FamilyTreePerson {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  avatar: string;
  photo: string | null;
  generation: number;
  relationship?: string;
  _id?: string;
}

interface Relationship {
  id: string;
  person1Id: string;
  person2Id: string;
  type: 'spouse' | 'parent-child';
}

interface D3FamilyTreeProps {
  data: FamilyNode;
  allPeople?: Record<string, FamilyTreePerson>; // All people data from FamilyTree page (including siblings, aunts, uncles, cousins)
  relationships?: Relationship[]; // All relationships to build children arrays
  width?: number;
  height?: number;
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
  resetTrigger?: number; // Trigger reset when this changes
}

/* ---------------- COMPONENT ---------------- */

export default function D3FamilyTree({
  data,
  allPeople,
  relationships = [],
  width = 1200,
  height = 900,
  zoomLevel = 1,
  resetTrigger = 0
}: D3FamilyTreeProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [people, setPeople] = useState<Record<string, Person>>({});
  const [rootId, setRootId] = useState<string | null>(null);
  
  // Merge allPeople into people state if provided (includes ALL family members)
  // Also build children arrays from relationships
  useEffect(() => {
    console.log(`📊 D3FamilyTree useEffect: allPeople=${Object.keys(allPeople || {}).length}, relationships=${relationships?.length || 0}`);
    if (relationships && relationships.length > 0) {
      console.log(`📋 Relationships received:`, relationships.map(r => ({
        type: r.type,
        person1Id: r.person1Id,
        person2Id: r.person2Id
      })));
    }
    if (allPeople && Object.keys(allPeople).length > 0) {
      // Convert allPeople format to Person format
      // Use a Map to ensure each person ID appears only once
      const convertedPeople: Record<string, Person> = {};
      const seenIds = new Set<string>();
      const nameToIdMap = new Map<string, string>(); // Map name to first ID seen
      
      Object.values(allPeople).forEach(person => {
        const name = `${person.firstName} ${person.lastName}`.trim();
        
        // Skip if we've already processed this exact ID
        if (seenIds.has(person.id)) {
          console.warn(`⚠️ Skipping duplicate person ID: ${person.id} (${name})`);
          return;
        }
        
        // Check if we've seen this name before (might be duplicate with different ID)
        // This is important because convertFamilyData might create p1, p2, etc. for the same people
        if (nameToIdMap.has(name)) {
          const existingId = nameToIdMap.get(name)!;
          const existingPerson = convertedPeople[existingId];
          
          // If same name, same generation, and same relationship, it's likely a duplicate
          // Prefer the ID from allPeople (real ID) over generated IDs (p1, p2, etc.)
          if (existingPerson && 
              existingPerson.generation === (person.generation || 0) &&
              existingPerson.relationship === person.relationship) {
            // If existing ID is a generated ID (starts with 'p' and is short) and new ID is real, replace it
            const existingIsGenerated = existingId.startsWith('p') && existingId.length <= 3;
            const newIsReal = !person.id.startsWith('p') || person.id.length > 3;
            
            if (existingIsGenerated && newIsReal) {
              // Replace the generated ID with the real ID
              console.log(`🔄 Replacing generated ID ${existingId} with real ID ${person.id} for ${name}`);
              delete convertedPeople[existingId];
              seenIds.delete(existingId);
            } else {
              console.warn(`⚠️ Skipping duplicate person: ${name} (ID: ${person.id}, existing ID: ${existingId})`);
              return;
            }
          }
        }
        
        seenIds.add(person.id);
        nameToIdMap.set(name, person.id);
        
        convertedPeople[person.id] = {
          id: person.id,
          name: name,
          spouse: undefined, // Will be set during conversion
          generation: person.generation || 0,
          children: [],
          relationship: person.relationship,
          gender: person.gender // Include gender for couple identification
        };
      });
      
      // Build children arrays from relationships
      if (relationships && relationships.length > 0) {
        relationships.forEach(rel => {
          if (rel.type === 'parent-child') {
            const parentId = rel.person1Id;
            const childId = rel.person2Id;
            if (convertedPeople[parentId] && convertedPeople[childId] && parentId !== childId) {
              if (!convertedPeople[parentId].children.includes(childId)) {
                convertedPeople[parentId].children.push(childId);
              }
            }
          } else if (rel.type === 'spouse') {
            // Set spouse relationship using IDs, not names
            const person1 = convertedPeople[rel.person1Id];
            const person2 = convertedPeople[rel.person2Id];
            if (person1 && person2 && rel.person1Id !== rel.person2Id) {
              person1.spouse = person2.id; // Store spouse ID instead of name
              person2.spouse = person1.id; // Store spouse ID instead of name
            }
          }
        });
      }
      
      // Replace people state completely (don't merge to avoid duplicates)
      setPeople(convertedPeople);
      console.log(`✅ Loaded ${Object.keys(convertedPeople).length} unique people from allPeople`);
    } else if (data && data.name) {
      // Only use tree data if allPeople is not provided
      convertFamilyData(data);
    }
  }, [allPeople, relationships, data]);

  /* ---------------- CONVERT DATA ---------------- */

  const convertFamilyData = (node: FamilyNode) => {
    const map: Record<string, Person> = {};
    const nameToIdMap: { [key: string]: string } = {}; // Map person name to ID
    const spouseIdMap: { [key: string]: string } = {}; // Map person ID to spouse ID
    let counter = 1;

    const traverse = (n: FamilyNode, generation = 0): string => {
      const id = `p${counter++}`;

      map[id] = {
        id,
        name: n.name,
        spouse: n.spouse,
        generation,
        children: [],
        relationship: n.relationship
      };
      
      nameToIdMap[n.name] = id;

      // If this node has a spouse name, create or find spouse node
      if (n.spouse) {
        let spouseId: string;
        
        // Check if spouse node already exists (created by another traversal)
        if (nameToIdMap[n.spouse]) {
          spouseId = nameToIdMap[n.spouse];
        } else {
          // Create new spouse node
          spouseId = `p${counter++}`;
          map[spouseId] = {
            id: spouseId,
            name: n.spouse,
            spouse: n.name,
            generation,
            children: [],
            relationship: undefined // Spouse relationship will be set when we process the spouse node
          };
          nameToIdMap[n.spouse] = spouseId;
        }
        
        // Link spouses
        spouseIdMap[id] = spouseId;
        spouseIdMap[spouseId] = id;
      }

      // Process children
      if (n.children) {
        n.children.forEach((child) => {
          const childId = traverse(child, generation + 1);
          map[id].children.push(childId);
          
          // If this person has a spouse, also add child to spouse
          if (spouseIdMap[id]) {
            const spouseId = spouseIdMap[id];
            if (!map[spouseId].children.includes(childId)) {
              map[spouseId].children.push(childId);
            }
          }
        });
      }

      return id;
    };

    const root = traverse(node);

    setPeople(map);
    setRootId(root);
  };

  /* ---------------- BUILD HIERARCHY ---------------- */

  const buildHierarchy = (id: string, visited: Set<string> = new Set(), isSpouse = false): any => {
    if (visited.has(id)) return null;
    visited.add(id);
    
    const person = people[id];
    if (!person) return null;

    // Find spouse ID - spouse can be stored as ID or name
    let spouseId: string | null = null;
    if (person.spouse) {
      // Check if spouse is stored as ID (from relationships) or name (from tree data)
      if (people[person.spouse]) {
        // Spouse is stored as ID
        spouseId = person.spouse;
      } else {
        // Spouse is stored as name, find by name and generation
        const spouse = Object.values(people).find(p => 
          p.name === person.spouse && p.generation === person.generation
        );
        if (spouse) {
          spouseId = spouse.id;
        }
      }
    }

    // Build children (avoid duplicates and spouse)
    const childIds = new Set(person.children);
    const children: any[] = [];
    
    childIds.forEach(childId => {
      // Don't add spouse as child
      if (childId === spouseId) return;
      
      const childNode = buildHierarchy(childId, new Set(visited), false);
      if (childNode) {
        children.push(childNode);
      }
    });

    const node = {
      ...person,
      spouseId,
      children: children.length > 0 ? children : undefined
    };
    
    // If this node has a spouse that hasn't been visited, we need to include it
    // But we'll handle spouse positioning in the layout, not in the hierarchy
    return node;
  };

  /* ---------------- BUILD COUPLE NODES ---------------- */
  
  const buildCoupleNodes = (): CoupleNode[] => {
    // Use ALL people data if available (includes siblings, aunts, uncles, cousins)
    // Otherwise fall back to people from tree data
    const allPeopleData = Object.keys(people).length > 0 ? people : {};
    
    // First, ensure we only have unique people by ID
    const uniquePeople: Record<string, Person> = {};
    Object.values(allPeopleData).forEach(person => {
      if (!uniquePeople[person.id]) {
        uniquePeople[person.id] = person;
      } else {
        console.warn(`⚠️ Duplicate person ID in buildCoupleNodes: ${person.id} (${person.name})`);
      }
    });
    
    const coupleNodes: CoupleNode[] = [];
    const processedPeople = new Set<string>();
    const spouseMap: { [key: string]: string } = {};
    
    // Normalize generations: ensure people with no parents (grandparents) are at generation 0
    // Create a map to store normalized generations
    const normalizedGenerations: { [key: string]: number } = {};
    
    // Find people with no parents (they are children of no one)
    const peopleWithParents = new Set<string>();
    Object.values(uniquePeople).forEach(person => {
      if (person.children) {
        person.children.forEach(childId => {
          // Only add if child exists in our unique people
          if (uniquePeople[childId]) {
            peopleWithParents.add(childId);
          }
        });
      }
    });
    
    // People without parents are at the top (generation 0)
    const topGenerationPeople = Object.values(uniquePeople).filter(p => !peopleWithParents.has(p.id));
    const minGen = topGenerationPeople.length > 0 
      ? Math.min(...topGenerationPeople.map(p => p.generation))
      : (Object.values(uniquePeople).length > 0 ? Math.min(...Object.values(uniquePeople).map(p => p.generation)) : 0);
    
    // Normalize all generations so the lowest is 0
    Object.values(uniquePeople).forEach(person => {
      normalizedGenerations[person.id] = person.generation - minGen;
    });
    
    // Build spouse map from explicit spouse relationships
    // First, check person.spouse property
    Object.values(uniquePeople).forEach(person => {
      if (person.spouse) {
        // Check if spouse is stored as ID (from relationships) or name (from tree data)
        let spouse: Person | undefined;
        if (person.spouse.includes('_') || person.spouse.length > 20 || uniquePeople[person.spouse]) {
          // Likely an ID, find by ID
          spouse = uniquePeople[person.spouse];
        } else {
          // Likely a name, find by name and generation
          spouse = Object.values(uniquePeople).find(p => 
            p.name === person.spouse && p.generation === person.generation
          );
        }
        if (spouse && spouse.id !== person.id) {
          // Check if they're siblings (share same parents) - if so, don't pair them
          const personParents = Object.values(uniquePeople).filter(parent => 
            parent.children?.includes(person.id)
          );
          const spouseParents = Object.values(uniquePeople).filter(parent => 
            parent.children?.includes(spouse.id)
          );
          
          // If they share any parent, they're siblings - don't create spouse relationship
          const areSiblings = personParents.some(pp => 
            spouseParents.some(sp => pp.id === sp.id)
          );
          
          if (areSiblings) {
            console.log(`ℹ️ Note: ${person.name} and ${spouse.name} share parents, but have an explicit spouse property. Processing as spouses.`);
            // We do not return here, we allow the spouse relationship to proceed.
          }
          
          // Only add if not already in map (to avoid overwriting with wrong relationship)
          if (!spouseMap[person.id] && !spouseMap[spouse.id]) {
            spouseMap[person.id] = spouse.id;
            spouseMap[spouse.id] = person.id;
            console.log(`✅ Found explicit spouse relationship: ${person.name} <-> ${spouse.name}`);
          } else if (spouseMap[person.id] === spouse.id && spouseMap[spouse.id] === person.id) {
            // Already paired with each other, skipping silently
          } else {
            console.log(`ℹ️ ${person.name} or ${spouse.name} already paired with someone else. Skipping duplicate.`);
          }
        } else if (person.spouse) {
          console.warn(`⚠️ Spouse not found for ${person.name}: spouse="${person.spouse}"`);
        }
      }
    });
    
    // FALLBACK: Also check relationships array directly for any spouse relationships we might have missed
    // This ensures we catch all spouse relationships even if person.spouse wasn't set correctly
    if (relationships && relationships.length > 0) {
      console.log(`🔍 Checking ${relationships.length} relationships for spouse relationships...`);
      relationships.forEach(rel => {
        if (rel.type === 'spouse') {
          const person1Id = rel.person1Id;
          const person2Id = rel.person2Id;
          const person1 = uniquePeople[person1Id];
          const person2 = uniquePeople[person2Id];
          
          console.log(`🔍 Found spouse relationship: ${person1Id} <-> ${person2Id}`, {
            person1: person1?.name,
            person2: person2?.name,
            person1Exists: !!person1,
            person2Exists: !!person2
          });
          
          // Only process if both people exist and aren't already in spouseMap
          if (person1 && person2 && person1Id !== person2Id) {
            // Check if they're siblings (share same parents) - if so, don't pair them
            const person1Parents = Object.values(uniquePeople).filter(parent => 
              parent.children?.includes(person1Id)
            );
            const person2Parents = Object.values(uniquePeople).filter(parent => 
              parent.children?.includes(person2Id)
            );
            
            // If they share any parent, they're siblings - don't create spouse relationship
            const areSiblings = person1Parents.some(p1p => 
              person2Parents.some(p2p => p1p.id === p2p.id)
            );
            
            // If they are flagged as siblings but there is an explicit spouse relation,
            // the explicit spouse relation should take precedence to fix mapping issues.
            if (areSiblings) {
              console.log(`ℹ️ Note: ${person1.name} and ${person2.name} share parents, but have an explicit spouse relationship. Processing as spouses.`);
              // We do not return here, we allow the spouse relationship to proceed.
            }
            
            // Only add if not already in map (to avoid overwriting with wrong relationship)
            if (!spouseMap[person1Id] && !spouseMap[person2Id]) {
              spouseMap[person1Id] = person2Id;
              spouseMap[person2Id] = person1Id;
              console.log(`✅ Found spouse relationship from relationships array: ${person1.name} <-> ${person2.name}`);
            } else if (spouseMap[person1Id] === person2Id && spouseMap[person2Id] === person1Id) {
              // Already paired with each other, skipping silently
            } else {
              console.log(`ℹ️ Spouse relationship already exists but with a DIFFERENT person: ${person1.name} <-> ${person2.name}`);
            }
          } else {
            console.warn(`⚠️ Cannot create spouse relationship: person1=${person1?.name || 'missing'}, person2=${person2?.name || 'missing'}`);
          }
        }
      });
    } else {
      console.log(`ℹ️ No relationships array provided or empty`);
    }
    
    // ADDITIONAL FALLBACK: Pair people with matching relationship types at the same generation
    // This handles cases where Great Grandfather and Great Grandmother should be paired
    // but don't have explicit spouse relationships
    const relationshipPairs: { [key: string]: string[] } = {
      'Great Grandfather': ['Great Grandmother'],
      'Great Grandmother': ['Great Grandfather'],
      'Grandfather': ['Grandmother'],
      'Grandmother': ['Grandfather'],
      'Father': ['Mother'],
      'Mother': ['Father']
    };
    
    Object.values(uniquePeople).forEach(person => {
      // Skip if already in spouseMap
      if (spouseMap[person.id]) return;
      
      // Check if this person's relationship type has a matching pair
      const matchingTypes = relationshipPairs[person.relationship || ''];
      if (matchingTypes && matchingTypes.length > 0) {
        // Find potential spouse with matching relationship type at same generation
        const potentialSpouse = Object.values(uniquePeople).find(p => 
          p.id !== person.id &&
          !spouseMap[p.id] &&
          matchingTypes.includes(p.relationship || '') &&
          p.generation === person.generation &&
          // Make sure they're not siblings (don't share parents)
          !Object.values(uniquePeople).some(parent => 
            parent.children?.includes(person.id) && parent.children?.includes(p.id)
          )
        );
        
        if (potentialSpouse) {
          // Check if they share any children (which would indicate they're already a couple)
          const personChildren = person.children || [];
          const spouseChildren = potentialSpouse.children || [];
          const sharedChildren = personChildren.filter(cid => spouseChildren.includes(cid));
          
          // If they share children OR have matching relationship types at same generation, pair them
          if (sharedChildren.length > 0 || matchingTypes.includes(potentialSpouse.relationship || '')) {
            spouseMap[person.id] = potentialSpouse.id;
            spouseMap[potentialSpouse.id] = person.id;
            console.log(`✅ Paired by relationship type: ${person.name} (${person.relationship}) <-> ${potentialSpouse.name} (${potentialSpouse.relationship})`);
          }
        }
      }
    });
    
    // DISABLED: Shared children logic - this was causing incorrect pairings (e.g., siblings being paired)
    // Only use explicit spouse relationships from person.spouse property and relationships array
    // If people share children but don't have explicit spouse relationship, they should remain separate
    // This prevents siblings from being incorrectly paired together
    console.log(`✅ Spouse map built from explicit relationships: ${Object.keys(spouseMap).length / 2} couples`);
    console.log(`📋 Spouse relationships found:`, Object.entries(spouseMap).map(([id1, id2]) => {
      const p1 = uniquePeople[id1];
      const p2 = uniquePeople[id2];
      return `${p1?.name || id1} <-> ${p2?.name || id2}`;
    }));
    
    // Build couple nodes from ALL people (not just tree hierarchy)
    // Use a map to track couple keys to avoid duplicates
    const coupleKeyMap = new Map<string, CoupleNode>();
    const personIdToCoupleKey = new Map<string, string>(); // Track which couple each person belongs to
    const allProcessedPersonIds = new Set<string>(); // Track ALL person IDs we've seen
    
    // First, process all couples
    Object.values(uniquePeople).forEach(person => {
      // Skip if this person is already part of a couple node
      if (allProcessedPersonIds.has(person.id)) {
        // This is expected - person is already in a couple, skip silently
        return;
      }
      
      const spouseId = spouseMap[person.id];
      const spouse = spouseId ? uniquePeople[spouseId] : null;
      
      if (spouse && !allProcessedPersonIds.has(spouse.id)) {
        // Create a unique key for the couple (always use sorted IDs to avoid duplicates)
        const [id1, id2] = [person.id, spouse.id].sort();
        const coupleKey = `${id1}_${id2}`;
        
        // Check if we already created this couple
        if (coupleKeyMap.has(coupleKey)) {
          console.warn(`⚠️ Couple ${person.name} | ${spouse.name} already exists, skipping`);
          allProcessedPersonIds.add(person.id);
          allProcessedPersonIds.add(spouse.id);
          personIdToCoupleKey.set(person.id, coupleKey);
          personIdToCoupleKey.set(spouse.id, coupleKey);
          return;
        }
        
        // Create couple node
        const coupleChildren = new Set<string>();
        
        // Get children from both parents (only include children that exist in uniquePeople)
        if (person.children) {
          person.children.forEach(childId => {
            if (uniquePeople[childId] && childId !== person.id && childId !== spouse.id) {
              coupleChildren.add(childId);
            }
          });
        }
        if (spouse.children) {
          spouse.children.forEach(childId => {
            if (uniquePeople[childId] && childId !== person.id && childId !== spouse.id) {
              coupleChildren.add(childId);
            }
          });
        }
        
        const coupleNode: CoupleNode = {
          person1: { id: person.id, name: person.name, relationship: person.relationship },
          person2: { id: spouse.id, name: spouse.name, relationship: spouse.relationship },
          children: Array.from(coupleChildren),
          generation: normalizedGenerations[person.id] !== undefined ? normalizedGenerations[person.id] : person.generation
        };
        
        coupleKeyMap.set(coupleKey, coupleNode);
        coupleNodes.push(coupleNode);
        
        allProcessedPersonIds.add(person.id);
        allProcessedPersonIds.add(spouse.id);
        personIdToCoupleKey.set(person.id, coupleKey);
        personIdToCoupleKey.set(spouse.id, coupleKey);
      }
    });
    
    // Then, process remaining people (those not yet in couple nodes)
    // This includes single people and people who are children but should still be displayed
    Object.values(uniquePeople).forEach(person => {
      // Skip if already processed (already in a couple node)
      if (allProcessedPersonIds.has(person.id)) return;
      
      const spouseId = spouseMap[person.id];
      
      // If person has a spouse, try to create a couple node
      if (spouseId && !allProcessedPersonIds.has(spouseId)) {
        const spouse = uniquePeople[spouseId];
        if (spouse) {
          // Create a unique key for the couple
          const [id1, id2] = [person.id, spouse.id].sort();
          const coupleKey = `${id1}_${id2}`;
          
          // Check if we already created this couple
          if (coupleKeyMap.has(coupleKey)) {
            return;
          }
          
          // Create couple node
          const coupleChildren = new Set<string>();
          
          // Get children from both parents
          if (person.children) {
            person.children.forEach(childId => {
              if (uniquePeople[childId] && childId !== person.id && childId !== spouse.id) {
                coupleChildren.add(childId);
              }
            });
          }
          if (spouse.children) {
            spouse.children.forEach(childId => {
              if (uniquePeople[childId] && childId !== person.id && childId !== spouse.id) {
                coupleChildren.add(childId);
              }
            });
          }
          
          const coupleNode: CoupleNode = {
            person1: { id: person.id, name: person.name, relationship: person.relationship },
            person2: { id: spouse.id, name: spouse.name, relationship: spouse.relationship },
            children: Array.from(coupleChildren),
            generation: normalizedGenerations[person.id] !== undefined ? normalizedGenerations[person.id] : person.generation
          };
          
          coupleKeyMap.set(coupleKey, coupleNode);
          coupleNodes.push(coupleNode);
          
          allProcessedPersonIds.add(person.id);
          allProcessedPersonIds.add(spouse.id);
          personIdToCoupleKey.set(person.id, coupleKey);
          personIdToCoupleKey.set(spouse.id, coupleKey);
          
          console.log(`✅ Created couple node for ${person.name} | ${spouse.name} (even though they may be children)`);
          return;
        }
      }
      
      // Single person (no spouse or spouse already processed) - create single node
      // IMPORTANT: Include them even if they're children of another couple
      // This ensures aunts, uncles, daughters, sons, etc. are all displayed
      if (!personIdToCoupleKey.has(person.id)) {
        // Filter children to remove duplicates and ensure they exist
        const validChildren = (person.children || []).filter(childId => 
          uniquePeople[childId] && 
          childId !== person.id
        );
        
        coupleNodes.push({
          person1: { id: person.id, name: person.name, relationship: person.relationship },
          person2: null,
          children: validChildren,
          generation: normalizedGenerations[person.id] !== undefined ? normalizedGenerations[person.id] : person.generation
        });
        
        allProcessedPersonIds.add(person.id);
        console.log(`✅ Created single node for ${person.name} (even though they may be a child of another couple)`);
      }
    });
    
    // Final deduplication: remove any couple nodes that share person IDs
    const finalCoupleNodes: CoupleNode[] = [];
    const usedPersonIds = new Set<string>();
    
    // First pass: add all couple nodes and track used person IDs
    coupleNodes.forEach(couple => {
      const person1Id = couple.person1.id;
      const person2Id = couple.person2?.id;
      
      // Check if either person is already used
      if (usedPersonIds.has(person1Id) || (person2Id && usedPersonIds.has(person2Id))) {
        console.warn(`⚠️ Skipping duplicate couple node: ${couple.person1.name}${couple.person2 ? ' | ' + couple.person2.name : ''}`);
        return;
      }
      
      // Add this couple node
      finalCoupleNodes.push(couple);
      usedPersonIds.add(person1Id);
      if (person2Id) {
        usedPersonIds.add(person2Id);
      }
    });
    
    // Second pass: Keep children even if they are parents in another couple
    // This is important for drawing generational links - we need to show the connection
    // between parents and their children, even if those children are also parents
    // DO NOT remove children that are parents - we need them for the tree structure
    finalCoupleNodes.forEach(couple => {
      // Keep all children - don't filter them out even if they're parents
      // The link drawing logic will handle connecting parent couples to child couples
      if (couple.children.length > 0) {
      console.log(`✅ Keeping ${couple.children.length} children for ${couple.person1.name}${couple.person2 ? ' | ' + couple.person2.name : ''}:`, 
        couple.children.map(id => uniquePeople[id]?.name || id));
      }
    });
    
    // Log all person IDs to check for duplicates
    const allPersonIdsInNodes = new Set<string>();
    finalCoupleNodes.forEach(couple => {
      allPersonIdsInNodes.add(couple.person1.id);
      if (couple.person2) {
        allPersonIdsInNodes.add(couple.person2.id);
      }
    });
    
    console.log(`✅ Built ${finalCoupleNodes.length} unique couple nodes from ${Object.keys(uniquePeople).length} people`);
    console.log(`✅ Total unique person IDs in nodes: ${allPersonIdsInNodes.size}`);
    console.log(`✅ Person IDs in nodes:`, Array.from(allPersonIdsInNodes));
    
    // Final check: if we have duplicate person IDs, log them
    const personIdCounts = new Map<string, number>();
    finalCoupleNodes.forEach(couple => {
      personIdCounts.set(couple.person1.id, (personIdCounts.get(couple.person1.id) || 0) + 1);
      if (couple.person2) {
        personIdCounts.set(couple.person2.id, (personIdCounts.get(couple.person2.id) || 0) + 1);
      }
    });
    
    personIdCounts.forEach((count, personId) => {
      if (count > 1) {
        const person = uniquePeople[personId];
        console.error(`❌ DUPLICATE FOUND: Person ${person?.name} (${personId}) appears ${count} times!`);
      }
    });
    
    return finalCoupleNodes;
  };

  /* ---------------- DRAW TREE ---------------- */

  const drawTree = () => {
    // When using allPeople, we don't need rootId - we build from all people
    // rootId is only needed for tree data structure
    if (!treeRef.current || Object.keys(people).length === 0) return;

    // Clear previous content
    d3.select(treeRef.current).selectAll("*").remove();

    const svg = d3
      .select(treeRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Add arrow marker definition for the links (before creating the group)
    const defs = svg.append("defs");
    const arrowMarker = defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 10) // Set to 10 so arrow tip is exactly on the line end
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto");
    
    arrowMarker.append("polygon")
      .attr("points", "0,0 10,5 0,10")
      .attr("fill", "#94a3b8"); // Match the line color

    const g = svg.append("g").attr("transform", "translate(0,50)");
    
    // Create links group FIRST (so it appears behind nodes)
    const linksGroup = g.append("g").attr("class", "links-group");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);
    zoomBehaviorRef.current = zoom;
    svgRef.current = svg.node() as SVGSVGElement;
    
    // Apply initial zoom level
    if (zoomLevel !== 1) {
      const transform = d3.zoomIdentity.scale(zoomLevel);
      svg.transition().call(zoom.transform as any, transform);
    }
    
    // Build couple nodes
    let coupleNodes = buildCoupleNodes();
    
    // Additional deduplication: ensure no person appears in multiple couple nodes
    const personToCoupleMap = new Map<string, CoupleNode>();
    const deduplicatedCoupleNodes: CoupleNode[] = [];
    
    coupleNodes.forEach(couple => {
      const person1Id = couple.person1.id;
      const person2Id = couple.person2?.id;
      
      // Check if person1 is already in another couple
      if (personToCoupleMap.has(person1Id)) {
        console.warn(`⚠️ Person ${couple.person1.name} (${person1Id}) already in another couple, skipping duplicate`);
        return;
      }
      
      // Check if person2 is already in another couple
      if (person2Id && personToCoupleMap.has(person2Id)) {
        console.warn(`⚠️ Person ${couple.person2?.name} (${person2Id}) already in another couple, skipping duplicate`);
        return;
      }
      
      // Add this couple
      deduplicatedCoupleNodes.push(couple);
      personToCoupleMap.set(person1Id, couple);
      if (person2Id) {
        personToCoupleMap.set(person2Id, couple);
      }
    });
    
    coupleNodes = deduplicatedCoupleNodes;
    console.log(`✅ After final deduplication: ${coupleNodes.length} unique couple nodes`);
    
    // Group couple nodes by generation
    const byGeneration = new Map<number, CoupleNode[]>();
    coupleNodes.forEach(couple => {
      if (!byGeneration.has(couple.generation)) {
        byGeneration.set(couple.generation, []);
      }
      byGeneration.get(couple.generation)!.push(couple);
    });
    
    const generations = Array.from(byGeneration.keys()).sort((a, b) => a - b);
    const minGen = Math.min(...generations);
    const maxGen = Math.max(...generations);
    
    const startY = 80;
    const verticalSpacing = 220;
    const horizontalSpacing = 200;
    const couplePairSpacing = 100; // Extra spacing between different couple pairs
    const coupleNodeWidth = 200;
    const coupleNodeHeight = 60;
    
    // Helper function to get last name from person name
    const getLastName = (name: string): string => {
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : '';
    };
    
    // Helper function to check if two couples are from the same family
    // They are in the same family if:
    // 1. They have the same last name, OR
    // 2. They share children (are related)
    const areSameFamily = (couple1: CoupleNode, couple2: CoupleNode): boolean => {
      // Check by last name
      const lastName1 = getLastName(couple1.person1.name);
      const lastName2 = getLastName(couple2.person1.name);
      if (lastName1 !== '' && lastName1 === lastName2) {
        return true;
      }
      
      // Check if they share children (related families)
      const couple1Children = new Set(couple1.children);
      const couple2Children = new Set(couple2.children);
      const sharedChildren = [...couple1Children].filter(c => couple2Children.has(c));
      if (sharedChildren.length > 0) {
        return true;
      }
      
      return false;
    };
    
    // Position couple nodes by generation, centering children under parents
    const couplePositions = new Map<string, { x: number; y: number }>();
    
    // First pass: position top generation (oldest)
    if (generations.length > 0) {
      const topGen = generations[0];
      const topCouples = byGeneration.get(topGen) || [];
      const y = startY;
      
      // Group couples by family (same last name)
      const coupleGroups: CoupleNode[][] = [];
      const processed = new Set<number>();
      
      topCouples.forEach((couple, index) => {
        if (processed.has(index)) return;
        
        const group: CoupleNode[] = [couple];
        processed.add(index);
        
        // Find other couples in the same family
        topCouples.forEach((otherCouple, otherIndex) => {
          if (otherIndex !== index && !processed.has(otherIndex) && areSameFamily(couple, otherCouple)) {
            group.push(otherCouple);
            processed.add(otherIndex);
          }
        });
        
        coupleGroups.push(group);
      });
      
      // Calculate total width needed
      let totalWidth = 0;
      coupleGroups.forEach((group, groupIndex) => {
        totalWidth += group.length * horizontalSpacing;
        if (groupIndex < coupleGroups.length - 1) {
          totalWidth += couplePairSpacing; // Add spacing between groups
        }
      });
      
      let startX = (width - totalWidth) / 2;
      
      // Position each group
      coupleGroups.forEach((group, groupIndex) => {
        group.forEach(couple => {
        couple.x = startX + coupleNodeWidth / 2;
        couple.y = y;
        couplePositions.set(couple.person1.id, { x: couple.x, y: couple.y });
        if (couple.person2) {
          couplePositions.set(couple.person2.id, { x: couple.x, y: couple.y });
        }
        startX += horizontalSpacing;
        });
        
        // Add spacing between groups (except after the last group)
        if (groupIndex < coupleGroups.length - 1) {
          startX += couplePairSpacing;
        }
      });
    }
    
    // Subsequent generations: genealogy chart style - all siblings on same level, centered under parents
    for (let i = 1; i < generations.length; i++) {
      const generation = generations[i];
      const genCouples = byGeneration.get(generation) || [];
      const genIndex = generation - minGen;
      const y = startY + genIndex * verticalSpacing;
      const parentGen = generation - 1;
      const parentCouples = byGeneration.get(parentGen) || [];
      
      // Group children by their parent couples
      const childrenByParent: { [key: string]: CoupleNode[] } = {};
      const ungroupedChildren: CoupleNode[] = [];
      
      // Track which children have been assigned to avoid duplicates
      const assignedChildren = new Set<string>();
      
      genCouples.forEach(childCouple => {
        // Find which parent couple(s) this child belongs to
        const childId = childCouple.person1.id;
        const childId2 = childCouple.person2?.id;
        
        // Skip if this child couple has already been assigned
        if (assignedChildren.has(childId) || (childId2 && assignedChildren.has(childId2))) {
          return;
        }
        
        // Find the FIRST parent couple that has this child (to avoid duplicates)
        const parentCouple = parentCouples.find(pc => 
          pc.children.includes(childId) || 
          (childId2 && pc.children.includes(childId2))
        );
        
        if (parentCouple) {
          const parentKey = parentCouple.person2 
            ? `${parentCouple.person1.id}_${parentCouple.person2.id}`
            : parentCouple.person1.id;
          
          if (!childrenByParent[parentKey]) {
            childrenByParent[parentKey] = [];
          }
          childrenByParent[parentKey].push(childCouple);
          
          // Mark this child as assigned
          assignedChildren.add(childId);
          if (childId2) {
            assignedChildren.add(childId2);
          }
        } else {
          ungroupedChildren.push(childCouple);
          // Mark as assigned even if ungrouped to avoid duplicates
          assignedChildren.add(childId);
          if (childId2) {
            assignedChildren.add(childId2);
          }
        }
      });
      
      // Build sibling groups: all children of the same parent couple
      const siblingGroups: { parentKey: string; children: CoupleNode[]; parentX: number }[] = [];
      
      parentCouples.forEach(parentCouple => {
        const parentKey = parentCouple.person2 
          ? `${parentCouple.person1.id}_${parentCouple.person2.id}`
          : parentCouple.person1.id;
        
        const children = childrenByParent[parentKey] || [];
        if (children.length > 0) {
          siblingGroups.push({
            parentKey,
            children,
            parentX: parentCouple.x || width / 2
          });
        }
      });
      
      // Sort sibling groups by parent X position (left to right)
      siblingGroups.sort((a, b) => a.parentX - b.parentX);
      
      // Calculate positions for all sibling groups
      // Each group is centered under its parent, with spacing between groups
      let allChildrenPositions: number[] = [];
      const groupPositions: { group: typeof siblingGroups[0]; startX: number }[] = [];
      
      siblingGroups.forEach((group, groupIdx) => {
        const groupWidth = group.children.length * horizontalSpacing;
        // Center the group under its parent
        let groupStartX = group.parentX - groupWidth / 2 + coupleNodeWidth / 2;
        
        // Ensure minimum spacing between groups
        if (groupIdx > 0) {
          const prevGroup = groupPositions[groupIdx - 1];
          const prevGroupEndX = prevGroup.startX + (prevGroup.group.children.length * horizontalSpacing);
          const minSpacing = horizontalSpacing;
          if (groupStartX < prevGroupEndX + minSpacing) {
            groupStartX = prevGroupEndX + minSpacing;
          }
        }
        
        groupPositions.push({ group, startX: groupStartX });
        
        // Calculate positions for children in this group
        group.children.forEach((childCouple, childIdx) => {
          const childX = groupStartX + (childIdx * horizontalSpacing);
          allChildrenPositions.push(childX);
        });
      });
      
      // Handle ungrouped children - position them after all sibling groups
      if (ungroupedChildren.length > 0) {
        const lastGroupEndX = groupPositions.length > 0
          ? groupPositions[groupPositions.length - 1].startX + 
            (groupPositions[groupPositions.length - 1].group.children.length * horizontalSpacing)
          : width / 2;
        
        const ungroupedStartX = lastGroupEndX + horizontalSpacing;
        ungroupedChildren.forEach((couple, idx) => {
          allChildrenPositions.push(ungroupedStartX + (idx * horizontalSpacing));
        });
      }
      
      // Center all children positions if they don't fill the width
      if (allChildrenPositions.length > 0) {
        const minX = Math.min(...allChildrenPositions);
        const maxX = Math.max(...allChildrenPositions);
        const totalWidth = maxX - minX;
        const centerOffset = (width - totalWidth) / 2 - minX;
        
        // Apply positions to sibling groups
        let childIdx = 0;
        groupPositions.forEach(({ group, startX }) => {
          group.children.forEach((childCouple) => {
            childCouple.x = allChildrenPositions[childIdx] + centerOffset;
            childCouple.y = y;
            couplePositions.set(childCouple.person1.id, { x: childCouple.x, y: childCouple.y });
            if (childCouple.person2) {
              couplePositions.set(childCouple.person2.id, { x: childCouple.x, y: childCouple.y });
            }
            childIdx++;
          });
        });
        
        // Apply positions to ungrouped children
        ungroupedChildren.forEach((couple) => {
          couple.x = allChildrenPositions[childIdx] + centerOffset;
          couple.y = y;
          couplePositions.set(couple.person1.id, { x: couple.x, y: couple.y });
          if (couple.person2) {
            couplePositions.set(couple.person2.id, { x: couple.x, y: couple.y });
          }
          childIdx++;
        });
      }
    }
    
    // Build parent-child links (from couple center to children)
    // This must be done AFTER all positions are set
    const parentChildLinks: { source: CoupleNode; target: CoupleNode }[] = [];
    // Track links using couple IDs to ensure ONE link per parent-child couple relationship
    const linkKeys = new Set<string>(); // Format: "parentCoupleId_childCoupleId"
    
    console.log(`🔍 Building links from ${coupleNodes.length} couple nodes...`);
    console.log(`🔍 Also checking ${relationships.length} relationships for parent-child links...`);
    
    // Method 1: Build links from children arrays in couple nodes
    coupleNodes.forEach(parentCouple => {
      const parentName = parentCouple.person2 
        ? `${parentCouple.person1.name} | ${parentCouple.person2.name}`
        : parentCouple.person1.name;
      
      if (parentCouple.children && parentCouple.children.length > 0) {
        console.log(`  📋 ${parentName} has ${parentCouple.children.length} children:`, parentCouple.children);
        
        parentCouple.children.forEach(childId => {
          const childCouple = coupleNodes.find(c => 
            c.person1.id === childId || (c.person2 && c.person2.id === childId)
          );
          
          if (childCouple) {
            const childName = childCouple.person2 
              ? `${childCouple.person1.name} | ${childCouple.person2.name}`
              : childCouple.person1.name;
            
            if (childCouple.generation > parentCouple.generation) {
              // Only add link if both nodes have positions
              if (parentCouple.x !== undefined && parentCouple.y !== undefined &&
                  childCouple.x !== undefined && childCouple.y !== undefined) {
                // Use couple IDs to create unique link key (one link per parent-child couple pair)
                const linkKey = `${parentCouple.person1.id}_${childCouple.person1.id}`;
                if (!linkKeys.has(linkKey)) {
                parentChildLinks.push({ source: parentCouple, target: childCouple });
                  linkKeys.add(linkKey);
                  console.log(`    ✅ Added link from children array: ${parentName} -> ${childName}`);
                } else {
                  console.log(`    ℹ️ Link already exists (skipping): ${parentName} -> ${childName}`);
                }
              } else {
                console.warn(`    ⚠️ Missing positions: ${parentName} (x:${parentCouple.x}, y:${parentCouple.y}) -> ${childName} (x:${childCouple.x}, y:${childCouple.y})`);
              }
            } else {
              console.log(`    ℹ️ Generation check skipped (expected): ${parentName} (gen ${parentCouple.generation}) -> ${childName} (gen ${childCouple.generation})`);
            }
          } else {
            console.warn(`    ❌ Child ID ${childId} not found in couple nodes. Available IDs:`, 
              coupleNodes.map(c => `${c.person1.id}${c.person2 ? ',' + c.person2.id : ''}`).join(', '));
          }
        });
      } else {
        console.log(`  📋 ${parentName} has no children in array`);
      }
    });
    
    // Method 2: Build links directly from relationships array (FALLBACK)
    // This ensures links are created even if children arrays are empty
    if (relationships && relationships.length > 0) {
      console.log(`🔍 Checking ${relationships.length} relationships for parent-child links...`);
      relationships.forEach(rel => {
        if (rel.type === 'parent-child') {
          // Try both directions - person1Id might be parent or child
          let parentId = rel.person1Id;
          let childId = rel.person2Id;
          
          // Find parent couple (could be person1 or person2 in the couple)
          let parentCouple = coupleNodes.find(c => 
            c.person1.id === parentId || (c.person2 && c.person2.id === parentId)
          );
          
          // Find child couple (could be person1 or person2 in the couple)
          let childCouple = coupleNodes.find(c => 
            c.person1.id === childId || (c.person2 && c.person2.id === childId)
          );
          
          // If not found, try reverse direction
          if (!parentCouple || !childCouple) {
            parentId = rel.person2Id;
            childId = rel.person1Id;
            parentCouple = coupleNodes.find(c => 
              c.person1.id === parentId || (c.person2 && c.person2.id === parentId)
            );
            childCouple = coupleNodes.find(c => 
              c.person1.id === childId || (c.person2 && c.person2.id === childId)
            );
          }
          
          console.log(`  🔍 Checking relationship: parentId=${parentId}, childId=${childId}`);
          
          if (!parentCouple) {
            console.warn(`    ⚠️ Parent ID ${parentId} not found in couple nodes. Available person IDs:`, 
              coupleNodes.map(c => `${c.person1.id}${c.person2 ? ',' + c.person2.id : ''}`).join(', '));
          }
          if (!childCouple) {
            console.warn(`    ⚠️ Child ID ${childId} not found in couple nodes. Available person IDs:`, 
              coupleNodes.map(c => `${c.person1.id}${c.person2 ? ',' + c.person2.id : ''}`).join(', '));
          }
          
          if (parentCouple && childCouple && parentCouple !== childCouple) {
            const parentName = parentCouple.person2 
              ? `${parentCouple.person1.name} | ${parentCouple.person2.name}`
              : parentCouple.person1.name;
            const childName = childCouple.person2 
              ? `${childCouple.person1.name} | ${childCouple.person2.name}`
              : childCouple.person1.name;
            
            console.log(`    ✅ Found both couples: ${parentName} (gen ${parentCouple.generation}) -> ${childName} (gen ${childCouple.generation})`);
            
            // Check generation (child should have higher generation number)
            if (childCouple.generation > parentCouple.generation) {
              // Only add if both have positions
              if (parentCouple.x !== undefined && parentCouple.y !== undefined &&
                  childCouple.x !== undefined && childCouple.y !== undefined) {
                const linkKey = `${parentCouple.person1.id}_${childCouple.person1.id}`;
                if (!linkKeys.has(linkKey)) {
                  parentChildLinks.push({ source: parentCouple, target: childCouple });
                  linkKeys.add(linkKey);
                  console.log(`    ✅ Added link from relationships array: ${parentName} -> ${childName}`);
                } else {
                  console.log(`    ℹ️ Link already exists: ${parentName} -> ${childName}`);
                }
              } else {
                console.warn(`    ⚠️ Missing positions: ${parentName} (x:${parentCouple.x}, y:${parentCouple.y}) -> ${childName} (x:${childCouple.x}, y:${childCouple.y})`);
              }
            } else {
              console.log(`    ℹ️ Generation check skipped (expected): ${parentName} (gen ${parentCouple.generation}) -> ${childName} (gen ${childCouple.generation})`);
            }
          } else if (parentCouple && childCouple && parentCouple === childCouple) {
            // Self-referential loop skipped silently
          }
        }
      });
    } else {
      console.warn(`⚠️ No relationships array provided or empty`);
    }
    
    // Method 3: Build links from people data directly (FINAL FALLBACK)
    // Check if people have children arrays that we can use
    console.log(`🔍 Method 3: Checking people data for parent-child relationships...`);
    Object.values(people).forEach(person => {
      if (person.children && person.children.length > 0) {
        person.children.forEach(childId => {
          // Find parent couple
          const parentCouple = coupleNodes.find(c => 
            c.person1.id === person.id || (c.person2 && c.person2.id === person.id)
          );
          
          // Find child couple
          const childCouple = coupleNodes.find(c => 
            c.person1.id === childId || (c.person2 && c.person2.id === childId)
          );
          
          if (parentCouple && childCouple && parentCouple !== childCouple) {
            if (childCouple.generation > parentCouple.generation) {
              if (parentCouple.x !== undefined && parentCouple.y !== undefined &&
                  childCouple.x !== undefined && childCouple.y !== undefined) {
                const linkKey = `${parentCouple.person1.id}_${childCouple.person1.id}`;
                if (!linkKeys.has(linkKey)) {
                  parentChildLinks.push({ source: parentCouple, target: childCouple });
                  linkKeys.add(linkKey);
                  const parentName = parentCouple.person2 
                    ? `${parentCouple.person1.name} | ${parentCouple.person2.name}`
                    : parentCouple.person1.name;
                  const childName = childCouple.person2 
                    ? `${childCouple.person1.name} | ${childCouple.person2.name}`
                    : childCouple.person1.name;
                  console.log(`    ✅ Added link from people data: ${parentName} -> ${childName}`);
                }
              }
            }
          }
        });
      }
    });
    
    // Method 4: Infer parent-child relationships from generation and last name matching
    // This is a fallback when relationships array doesn't have parent-child relationships
    // ALWAYS run Method 4 to ensure we catch all relationships
    console.log(`🔍 Method 4: Inferring parent-child relationships from generation and last names...`);
    {
      
      // Helper to extract last name
      const getLastName = (name: string): string => {
        const parts = name.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : '';
      };
      
      // Group couples by generation (including single nodes)
      const couplesByGen = new Map<number, CoupleNode[]>();
      coupleNodes.forEach(couple => {
        if (!couplesByGen.has(couple.generation)) {
          couplesByGen.set(couple.generation, []);
        }
        couplesByGen.get(couple.generation)!.push(couple);
      });
      
      // Find parent-child relationships based on generation and last name
      // Compare ALL lower generations with ALL higher generations (not just consecutive)
      const generations = Array.from(couplesByGen.keys()).sort((a, b) => a - b);
      
      console.log(`🔍 Generations found: ${generations.join(', ')}`);
      
      for (let i = 0; i < generations.length; i++) {
        const parentGen = generations[i];
        const parentCouples = couplesByGen.get(parentGen) || [];
        
        // Compare with ONLY the next generation (hierarchical)
        if (i + 1 < generations.length) {
          const childGen = generations[i + 1];
          const childCouples = couplesByGen.get(childGen) || [];
          
          console.log(`🔍 Comparing generation ${parentGen} (${parentCouples.length} couples) with generation ${childGen} (${childCouples.length} couples)`);
          
          parentCouples.forEach(parentCouple => {
            const parentLastName1 = getLastName(parentCouple.person1.name);
            const parentLastName2 = parentCouple.person2 ? getLastName(parentCouple.person2.name) : '';
            
            childCouples.forEach(childCouple => {
              // Skip if child already has an explicit parent link
              let childHasParent = false;
              for (const link of parentChildLinks) {
                if (link.target.person1.id === childCouple.person1.id) {
                  childHasParent = true;
                  break;
                }
              }
              if (childHasParent) {
                return; // already has a parent
              }
              
              const childLastName1 = getLastName(childCouple.person1.name);
              const childLastName2 = childCouple.person2 ? getLastName(childCouple.person2.name) : '';
              
              // Check if last names match (child should have same last name as one of the parents)
              // For a couple, if either person in the child couple matches either person in the parent couple, create link
              // This handles cases like:
              // - Rama B | Sita B -> Riya B | Raju A (Riya B matches "B" from Rama B or Sita B)
              // - Krishna A | Lakshmi A -> Riya B | Raju A (Raju A matches "A" from Krishna A or Lakshmi A)
              // - Riya B | Raju A -> Arjun A (Arjun A matches "A" from Raju A)
              // - Riya B | Raju A -> Priya A (Priya A matches "A" from Raju A)
              const matchesParent1 = parentLastName1 && (childLastName1 === parentLastName1 || childLastName2 === parentLastName1);
              const matchesParent2 = parentLastName2 && (childLastName1 === parentLastName2 || childLastName2 === parentLastName2);
              
              // Also check if child couple has mixed last names - link to both parent couples if applicable
              const childMatchesParent = matchesParent1 || matchesParent2;
              
              if (childMatchesParent) {
                console.log(`    🔍 Match found: ${parentCouple.person1.name} ${parentLastName1} | ${parentCouple.person2?.name || ''} ${parentLastName2} -> ${childCouple.person1.name} ${childLastName1} | ${childCouple.person2?.name || ''} ${childLastName2}`);
                console.log(`       matchesParent1: ${matchesParent1}, matchesParent2: ${matchesParent2}`);
                if (parentCouple.x !== undefined && parentCouple.y !== undefined &&
                    childCouple.x !== undefined && childCouple.y !== undefined) {
                  const linkKey = `${parentCouple.person1.id}_${childCouple.person1.id}`;
                  if (!linkKeys.has(linkKey)) {
                    parentChildLinks.push({ source: parentCouple, target: childCouple });
                    linkKeys.add(linkKey);
                    const parentName = parentCouple.person2 
                      ? `${parentCouple.person1.name} | ${parentCouple.person2.name}`
                      : parentCouple.person1.name;
                    const childName = childCouple.person2 
                      ? `${childCouple.person1.name} | ${childCouple.person2.name}`
                      : childCouple.person1.name;
                    console.log(`    ✅ Inferred link from generation/name: ${parentName} (gen ${parentGen}) -> ${childName} (gen ${childGen})`);
                  }
                } else {
                  console.warn(`    ⚠️ Missing positions: parent (x:${parentCouple.x}, y:${parentCouple.y}) -> child (x:${childCouple.x}, y:${childCouple.y})`);
                }
              }
            });
          });
        }
      }
    }
    
    // Transitive reduction: filter out shortcut links that skip generations
    // e.g. Ram -> Reena is removed if Ram -> Shiva -> Reena exists
    const hasLongerPath = (startId: string, endId: string): boolean => {
      const visited = new Set<string>();
      
      const queue = parentChildLinks
        .filter(l => l.source.person1.id === startId && l.target.person1.id !== endId)
        .map(l => l.target.person1.id);
        
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === endId) return true;
        
        if (!visited.has(current)) {
          visited.add(current);
          const nextNodes = parentChildLinks
            .filter(l => l.source.person1.id === current)
            .map(l => l.target.person1.id);
          queue.push(...nextNodes);
        }
      }
      return false;
    };

    const directLinksOnly = parentChildLinks.filter(link => {
       const isShortcut = hasLongerPath(link.source.person1.id, link.target.person1.id);
       if (isShortcut) {
          console.log(`✂️ Transitive reduction removed shortcut link: ${link.source.person1.name} -> ${link.target.person1.name}`);
       }
       return !isShortcut;
    });

    // CRITICAL: Final deduplication - ensure ONLY ONE link per parent-child couple relationship
    // The issue is that we might be creating links from individual people in couples
    // We need to ensure ONE line per couple-to-couple relationship
    const uniqueLinksMap = new Map<string, { source: CoupleNode; target: CoupleNode }>();
    
    console.log(`🔍 Starting final deduplication of ${directLinksOnly.length} links...`);
    
    directLinksOnly.forEach((link, index) => {
      // Create a unique key based on the couple nodes (not individual people)
      // Use the first person's ID from each couple to identify the couple uniquely
      const parentCoupleId = link.source.person1.id;
      const childCoupleId = link.target.person1.id;
      
      // Create key: parentCouple -> childCouple (directional)
      // This ensures EXACTLY ONE link per parent-child couple relationship
      const linkKey = `${parentCoupleId}_${childCoupleId}`;
      
      // STRICT: Only keep the first link for each unique parent-child couple pair
      // This prevents multiple lines from the same parent couple to the same child couple
      if (!uniqueLinksMap.has(linkKey)) {
        uniqueLinksMap.set(linkKey, link);
        const parentName = link.source.person2 
          ? `${link.source.person1.name} | ${link.source.person2.name}`
          : link.source.person1.name;
        const childName = link.target.person2 
          ? `${link.target.person1.name} | ${link.target.person2.name}`
          : link.target.person1.name;
        console.log(`   ✅ Link ${index + 1}: ${parentName} -> ${childName}`);
      } else {
        const parentName = link.source.person2 
          ? `${link.source.person1.name} | ${link.source.person2.name}`
          : link.source.person1.name;
        const childName = link.target.person2 
          ? `${link.target.person1.name} | ${link.target.person2.name}`
          : link.target.person1.name;
        console.log(`   ❌ DUPLICATE REMOVED: ${parentName} -> ${childName}`);
      }
    });
    
    // Convert back to array with only unique links
    const finalParentChildLinks = Array.from(uniqueLinksMap.values());
    
    // FINAL VERIFICATION: Double-check for any remaining duplicates
    const verificationSet = new Set<string>();
    const trulyUniqueLinks: { source: CoupleNode; target: CoupleNode }[] = [];
    finalParentChildLinks.forEach(link => {
      const key = `${link.source.person1.id}_${link.target.person1.id}`;
      if (!verificationSet.has(key)) {
        verificationSet.add(key);
        trulyUniqueLinks.push(link);
      }
    });
    
    console.log(`🔗 Final count: Built ${trulyUniqueLinks.length} unique parent-child links (from ${parentChildLinks.length} total, removed ${parentChildLinks.length - trulyUniqueLinks.length} duplicates)`);
    
    // Use the verified unique links
    const finalParentChildLinksVerified = trulyUniqueLinks;
    
    // Log link details for debugging
    if (finalParentChildLinksVerified.length === 0) {
      console.log(`ℹ️ No parent-child links created. This could mean:`);
      console.log(`   1. Children arrays are empty`);
      console.log(`   2. Child couple nodes aren't being found`);
      console.log(`   3. Positions aren't set`);
      console.log(`   4. Last names don't match between generations`);
      console.log(`   Total couple nodes: ${coupleNodes.length}`);
      coupleNodes.forEach(c => {
        console.log(`     - ${c.person1.name}${c.person2 ? ' | ' + c.person2.name : ''} (gen ${c.generation}, children: ${c.children?.length || 0}, x:${c.x}, y:${c.y})`);
      });
    } else {
      finalParentChildLinksVerified.forEach(link => {
        const sourceName = link.source.person2 
          ? `${link.source.person1.name} | ${link.source.person2.name}`
          : link.source.person1.name;
        const targetName = link.target.person2 
          ? `${link.target.person1.name} | ${link.target.person2.name}`
          : link.target.person1.name;
        console.log(`🔗 Link: ${sourceName} (gen ${link.source.generation}) -> ${targetName} (gen ${link.target.generation})`, {
          sourcePos: { x: link.source.x, y: link.source.y },
          targetPos: { x: link.target.x, y: link.target.y }
        });
      });
    }

    /* -------- LINKS - DRAW FIRST (behind nodes) -------- */
    
    // CRITICAL: Clear ALL existing links first to prevent duplicates
    linksGroup.selectAll("path.link-parent-child").remove();
    
    // Use finalParentChildLinksVerified for rendering (fully deduplicated)
    const linksToRender = finalParentChildLinksVerified;
    
    console.log(`🎨 About to draw ${linksToRender.length} unique links in linksGroup`);
    
    // Draw parent-child links FIRST (so they appear behind nodes)
    // This ensures proper visual hierarchy
    const links = linksGroup.selectAll("path.link-parent-child")
      .data(linksToRender, (d: any) => {
        // Create unique key for each link based on couple IDs (directional)
        const parentCoupleId = d.source.person1.id;
        const childCoupleId = d.target.person1.id;
        return `${parentCoupleId}_${childCoupleId}`;
      });
    
    console.log(`📊 D3 selection: ${links.size()} existing links, ${links.enter().size()} new links, ${links.exit().size()} to remove`);
    
    // Remove old links (should be none since we cleared above, but keep for safety)
    links.exit().remove();
    
    // Add new links
    const linksEnter = links.enter()
      .append("path")
      .attr("class", "link link-parent-child")
      .attr("fill", "none")
      .attr("stroke", "#94a3b8") // Light gray like in the second image
      .attr("stroke-width", 2) // Slightly thinner for cleaner look
      .attr("stroke-opacity", 0.8) // Slightly transparent
      .attr("marker-end", "url(#arrowhead)"); // Add arrowhead
    
    console.log(`✅ Created ${linksEnter.size()} new link elements`);
    
    // Update all links (both new and existing)
    linksEnter.merge(links as any)
      .attr("fill", "none")
      .attr("stroke", "#94a3b8") // Light gray like in the second image
      .attr("stroke-width", 2) // Slightly thinner for cleaner look
      .attr("stroke-opacity", 0.8) // Slightly transparent
      .attr("marker-end", "url(#arrowhead)") // Add arrowhead
      .attr("d", (d: any) => {
        const sourceX = d.source.x || 0;
        const sourceY = d.source.y || 0;
        const targetX = d.target.x || 0;
        const targetY = d.target.y || 0;
        
        // Draw line from center bottom of parent couple to center top of child couple
        // This ensures ONE clean line per connection
        const sourceBottomY = sourceY + coupleNodeHeight / 2; // Bottom center of parent couple
        const targetTopY = targetY - coupleNodeHeight / 2 - 5; // Top center of child couple (offset slightly for arrowhead)
        
        // Only draw if positions are valid (not all zeros)
        if (sourceX === 0 && sourceY === 0 && targetX === 0 && targetY === 0) {
          const sourceName = d.source.person2 
            ? `${d.source.person1.name} | ${d.source.person2.name}`
            : d.source.person1.name;
          const targetName = d.target.person2 
            ? `${d.target.person1.name} | ${d.target.person2.name}`
            : d.target.person1.name;
          console.warn(`⚠️ Invalid positions for link: ${sourceName} -> ${targetName}`);
          return '';
        }
        
        // If source and target are aligned (within 5px), use straight vertical line
        // Otherwise, use a smooth S-curve (cubic bezier) for better visual hierarchy like the image
        if (Math.abs(sourceX - targetX) < 5) {
          // Straight vertical line (like in the second image for aligned generations)
          const path = `M ${sourceX} ${sourceBottomY} L ${targetX} ${targetTopY}`;
          return path;
        } else {
          // Smooth curved path with control point for branching (S-curve)
          // Use a cubic bezier curve that creates a smooth branch exactly like the original tree
          const midY = (sourceBottomY + targetTopY) / 2;
          const path = `M ${sourceX} ${sourceBottomY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetTopY}`;
          return path;
        }
      });
    
    const finalLinkCount = linksGroup.selectAll("path.link-parent-child").size();
    console.log(`✅ Finished drawing links. Total links in DOM: ${finalLinkCount}`);
    
    // VERIFICATION: Ensure we only have one link per connection
    if (finalLinkCount !== linksToRender.length) {
      console.warn(`⚠️ WARNING: Link count mismatch! Expected ${linksToRender.length} links, but found ${finalLinkCount} in DOM`);
      // Log all links in DOM to debug
      linksGroup.selectAll("path.link-parent-child").each(function(d: any, i: number) {
        const linkData = d as any;
        if (linkData && linkData.source && linkData.target) {
          const parentName = linkData.source.person2 
            ? `${linkData.source.person1.name} | ${linkData.source.person2.name}`
            : linkData.source.person1.name;
          const childName = linkData.target.person2 
            ? `${linkData.target.person1.name} | ${linkData.target.person2.name}`
            : linkData.target.person1.name;
          console.log(`   DOM Link ${i + 1}: ${parentName} -> ${childName}`);
        }
      });
    }

    /* -------- COUPLE NODES -------- */
    
    // Use a key function to ensure each couple node is uniquely identified
    const coupleNodeKey = (d: any) => {
      if (d.person2) {
        const [id1, id2] = [d.person1.id, d.person2.id].sort();
        return `couple_${id1}_${id2}`;
      }
      return `single_${d.person1.id}`;
    };
    
    // Final check: ensure no duplicate person IDs in coupleNodes before rendering
    const renderedPersonIds = new Set<string>();
    const uniqueCoupleNodesForRendering: CoupleNode[] = [];
    
    coupleNodes.forEach(couple => {
      const person1Id = couple.person1.id;
      const person2Id = couple.person2?.id;
      
      // Check if either person is already rendered
      if (renderedPersonIds.has(person1Id) || (person2Id && renderedPersonIds.has(person2Id))) {
        console.error(`❌ DUPLICATE DETECTED BEFORE RENDERING: ${couple.person1.name}${couple.person2 ? ' | ' + couple.person2.name : ''} - SKIPPING`);
        return;
      }
      
      uniqueCoupleNodesForRendering.push(couple);
      renderedPersonIds.add(person1Id);
      if (person2Id) {
        renderedPersonIds.add(person2Id);
      }
    });
    
    console.log(`🎨 Rendering ${uniqueCoupleNodesForRendering.length} unique couple nodes (filtered from ${coupleNodes.length})`);
    
    const coupleNodeGroups = g
      .selectAll(".couple-node")
      .data(uniqueCoupleNodesForRendering, coupleNodeKey)
      .enter()
      .append("g")
      .attr("class", "couple-node")
      .attr("data-person1-id", (d: any) => d.person1.id)
      .attr("data-person2-id", (d: any) => d.person2?.id || '')
      .attr("transform", (d: any) => {
        // For couples: center on x, for singles: adjust for half-width
        const nodeWidth = d.person2 ? coupleNodeWidth : coupleNodeWidth / 2;
        return `translate(${d.x - nodeWidth / 2},${d.y - coupleNodeHeight / 2})`;
      });

    // Create couple node container (single combined node)
    // For couples: full width, for singles: half width
    coupleNodeGroups
      .append("rect")
      .attr("width", (d: any) => d.person2 ? coupleNodeWidth : coupleNodeWidth / 2)
      .attr("height", coupleNodeHeight)
      .attr("rx", 10)
      .attr("fill", "#1e293b")
      .attr("stroke", "#334155")
      .attr("stroke-width", 2);
    
    // Draw vertical line between spouses (if couple)
    coupleNodeGroups
      .filter((d: any) => d.person2 !== null)
      .append("line")
      .attr("x1", coupleNodeWidth / 2)
      .attr("y1", 0)
      .attr("x2", coupleNodeWidth / 2)
      .attr("y2", coupleNodeHeight)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1);
    
    // Add person 1 name with relationship (left side for couples, centered for singles)
    coupleNodeGroups
      .append("text")
      .attr("x", (d: any) => d.person2 ? coupleNodeWidth / 4 : coupleNodeWidth / 4)
      .attr("y", coupleNodeHeight / 2 - 8)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text((d: any) => d.person1.name);
    
    // Add person 1 relationship label
    coupleNodeGroups
      .filter((d: any) => d.person1.relationship)
      .append("text")
      .attr("x", (d: any) => d.person2 ? coupleNodeWidth / 4 : coupleNodeWidth / 4)
      .attr("y", coupleNodeHeight / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#cbd5e1")
      .style("font-size", "10px")
      .style("font-weight", "400")
      .text((d: any) => d.person1.relationship || '');
    
    // Add person 2 name with relationship (right side, if exists)
    coupleNodeGroups
      .filter((d: any) => d.person2 !== null)
      .append("text")
      .attr("x", (coupleNodeWidth * 3) / 4)
      .attr("y", coupleNodeHeight / 2 - 8)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text((d: any) => d.person2 ? d.person2.name : '');
    
    // Add person 2 relationship label
    coupleNodeGroups
      .filter((d: any) => d.person2 !== null && d.person2.relationship)
      .append("text")
      .attr("x", (coupleNodeWidth * 3) / 4)
      .attr("y", coupleNodeHeight / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#cbd5e1")
      .style("font-size", "10px")
      .style("font-weight", "400")
      .text((d: any) => d.person2 ? (d.person2.relationship || '') : '');
  };

  /* ---------------- EFFECTS ---------------- */

  // Only use tree data if allPeople is NOT provided
  // This prevents duplicate entries (allPeople has real IDs, convertFamilyData creates p1, p2, etc.)
  useEffect(() => {
    if (data && data.name && (!allPeople || Object.keys(allPeople).length === 0)) {
      convertFamilyData(data);
    }
  }, [data, allPeople]);

  useEffect(() => {
    // Draw tree when we have people data
    // rootId is optional - if we have allPeople, we build from all people, not from root
    if (Object.keys(people).length > 0) {
      drawTree();
    }
  }, [people, rootId]);

  // Handle zoom level changes
  useEffect(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svgSelection = d3.select(svgRef.current);
      if (zoomLevel !== 1) {
        const transform = d3.zoomIdentity.scale(zoomLevel);
        svgSelection.transition().call(zoomBehaviorRef.current.transform as any, transform);
      } else {
        svgSelection.transition().call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity);
      }
    }
  }, [zoomLevel]);

  // Handle reset trigger - reset both zoom and pan
  useEffect(() => {
    if (resetTrigger > 0 && svgRef.current && zoomBehaviorRef.current) {
      const svgSelection = d3.select(svgRef.current);
      // Reset to identity transform (no zoom, no pan)
      svgSelection.transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity);
    }
  }, [resetTrigger]);

  return (
    <div
      ref={treeRef}
      className="tree-container"
      style={{
        width: "100%",
        height: "100%"
      }}
    />
  );
}
