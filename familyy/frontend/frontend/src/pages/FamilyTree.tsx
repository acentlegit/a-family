import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import api, { getApiUrl } from '../config/api';
import { FaDownload, FaUpload, FaTree } from 'react-icons/fa';
import { FiFile } from 'react-icons/fi';
import { colors } from '../styles/colors';
import D3FamilyTree, { FamilyNode } from '../components/D3FamilyTree';
import './FamilyTree.css';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  avatar: string;
  photo: string | null;
  generation: number;
  relationship?: string; // Relationship label like "Father", "Mother", "Grandfather", etc.
  _id?: string; // API ID
  children?: string[]; // Array of child person IDs
  spouse?: string; // Spouse person ID
}

interface Relationship {
  id: string;
  person1Id: string;
  person2Id: string;
  type: 'spouse' | 'parent-child';
}

interface FamilyTreeData {
  people: { [key: string]: Person };
  relationships: Relationship[];
  rootPersonId: string | null;
}

const FamilyTree: React.FC = () => {
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [familyTree, setFamilyTree] = useState<FamilyTreeData>({
    people: {},
    relationships: [],
    rootPersonId: null
  });
  const [selectedAvatar, setSelectedAvatar] = useState('👨');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [currentPhotoData, setCurrentPhotoData] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [modalPerson, setModalPerson] = useState<Person | null>(null);
  const [d3TreeData, setD3TreeData] = useState<FamilyNode | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  
  const relationshipOptions = [
    'Root Person (Start Here)',
    'Great Grandfather', 'Great Grandmother',
    'Grandfather', 'Grandmother', 
    'Father', 'Mother', 'Uncle', 'Aunt',
    'Son', 'Daughter', 'Brother', 'Sister', 'Cousin',
    'Grandson', 'Granddaughter',
    'Nephew', 'Niece', 'Spouse', 'Other'
  ];
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'male' as 'male' | 'female',
    dateOfBirth: '',
    relationshipType: 'Root Person (Start Here)',
    relativeId: ''
  });

  const treeViewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);

  // Force re-render when tree changes
  const [treeRenderKey, setTreeRenderKey] = useState(0);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      console.log('Selected family changed, fetching members...');
      fetchMembersAndBuildTree();
    } else {
      // Clear tree when no family selected
      setFamilyTree({ people: {}, relationships: [], rootPersonId: null });
    }
  }, [selectedFamilyId]);

  // Listen for member added events to refresh the tree
  useEffect(() => {
    const handleMemberAdded = () => {
      if (selectedFamilyId) {
        console.log('🔄 Member added, refreshing family tree...');
        fetchMembersAndBuildTree();
      }
    };
    
    window.addEventListener('memberAdded', handleMemberAdded);
    
    return () => {
      window.removeEventListener('memberAdded', handleMemberAdded);
    };
  }, [selectedFamilyId]);

  // Watch for tree changes and force re-render
  useEffect(() => {
    const peopleCount = Object.keys(familyTree.people).length;
    const relCount = familyTree.relationships.length;
    console.log('Tree state changed, forcing re-render. People:', peopleCount, 'Relationships:', relCount);
    setTreeRenderKey(prev => prev + 1);
  }, [Object.keys(familyTree.people).length, familyTree.relationships.length, familyTree.rootPersonId]);

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const fetchMembersAndBuildTree = async () => {
    if (!selectedFamilyId) {
      console.log('No selectedFamilyId, skipping fetch');
      return;
    }
    
    try {
      console.log('Fetching members for family:', selectedFamilyId);
      const response = await api.get(`/members/${selectedFamilyId}`, {
        params: { _: Date.now() } // Add cache busting
      });
      console.log('Fetched members response:', response.data);
      console.log('Response structure:', {
        success: response.data.success,
        hasData: !!response.data.data,
        dataType: Array.isArray(response.data.data) ? 'array' : typeof response.data.data,
        dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'N/A'
      });
      
      // Log first member's full structure to see what fields are available
      if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('📋 First member structure:', response.data.data[0]);
        console.log('📋 First member keys:', Object.keys(response.data.data[0]));
      }
      
      // Handle different response structures
      let members = [];
      if (response.data.success && response.data.data) {
        members = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else if (Array.isArray(response.data)) {
        members = response.data;
      } else if (Array.isArray(response.data.data)) {
        members = response.data.data;
      }
      
      console.log('Processed members array:', members);
      console.log('Number of members:', members.length);
      
      if (members.length > 0) {
        // Log photo URLs for debugging
        members.forEach((member: any) => {
          console.log(`Member: ${member.firstName} ${member.lastName}, ID: ${member._id}, Generation: ${member.generation}`);
          console.log(`  Father: ${member.father?._id || member.father || 'none'}`);
          console.log(`  Mother: ${member.mother?._id || member.mother || 'none'}`);
          console.log(`  Spouse: ${member.spouse?._id || member.spouse || 'none'}`);
          if (member.photo) {
            console.log(`  Photo: ${member.photo}`);
          }
        });
        buildTreeFromMembers(members);
      } else {
        console.log('No members found, clearing tree');
        setFamilyTree({ people: {}, relationships: [], rootPersonId: null });
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setFamilyTree({ people: {}, relationships: [], rootPersonId: null });
    }
  };

  const buildTreeFromMembers = (members: any[]) => {
    console.log('buildTreeFromMembers called with', members.length, 'members');
    const people: { [key: string]: Person } = {};
    const relationships: Relationship[] = [];
    let rootPersonId: string | null = null;

    if (!members || members.length === 0) {
      console.log('No members to build tree from');
      setFamilyTree({ people: {}, relationships: [], rootPersonId: null });
      return;
    }

    // Infer relationships from member data if not explicitly set
    // This handles cases where relationships aren't populated from API
    const inferRelationships = (members: any[]): any[] => {
      const relationshipMap: { [key: string]: any } = {};
      const membersCopy = members.map(m => ({ ...m })); // Create a copy to avoid mutating original
      
      // First pass: categorize members by their relationship field and set generations
      membersCopy.forEach(member => {
        const relationship = (member.relationship || '').toLowerCase().trim();
        const gender = (member.gender || '').toLowerCase();
        
        console.log(`🔍 Processing member ${member.firstName}: relationship="${relationship}", gender="${gender}"`);
        
        // Set generation based on relationship type
        // Generation 1: Great Grandfather/Great Grandmother (top)
        // Generation 2: Grandfather/Grandmother
        // Generation 3: Father/Mother/Uncle/Aunt
        // Generation 4: Son/Daughter/Cousin
        // Generation 5: Grandson/Granddaughter
        if (relationship === 'great grandfather' || relationship === 'great grandmother') {
          member.generation = 1; // Top generation (great grandparents)
          if (relationship === 'great grandfather') {
            if (!relationshipMap['great_grandfathers']) relationshipMap['great_grandfathers'] = [];
            relationshipMap['great_grandfathers'].push(member);
          } else {
            if (!relationshipMap['great_grandmothers']) relationshipMap['great_grandmothers'] = [];
            relationshipMap['great_grandmothers'].push(member);
          }
        } else if (relationship === 'grandfather' || relationship === 'grandmother') {
          member.generation = 2; // Grandparents generation
          if (relationship === 'grandfather') {
            if (!relationshipMap['grandfathers']) relationshipMap['grandfathers'] = [];
            relationshipMap['grandfathers'].push(member);
          } else {
            if (!relationshipMap['grandmothers']) relationshipMap['grandmothers'] = [];
            relationshipMap['grandmothers'].push(member);
          }
        } else if (relationship === 'father' || relationship === 'mother') {
          member.generation = 3; // Parents generation
          if (relationship === 'father') {
            if (!relationshipMap['fathers']) relationshipMap['fathers'] = [];
            relationshipMap['fathers'].push(member);
          } else {
            if (!relationshipMap['mothers']) relationshipMap['mothers'] = [];
            relationshipMap['mothers'].push(member);
          }
        } else if (relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister') {
          member.generation = 4; // Children generation
          if (relationship === 'son') {
            if (!relationshipMap['sons']) relationshipMap['sons'] = [];
            relationshipMap['sons'].push(member);
          } else if (relationship === 'daughter') {
            if (!relationshipMap['daughters']) relationshipMap['daughters'] = [];
            relationshipMap['daughters'].push(member);
          } else if (relationship === 'brother' || relationship === 'sister') {
            if (!relationshipMap['siblings']) relationshipMap['siblings'] = [];
            relationshipMap['siblings'].push(member);
          }
        } else if (relationship === 'grandson' || relationship === 'granddaughter') {
          member.generation = 5; // Grandchildren generation
          if (relationship === 'grandson') {
            if (!relationshipMap['grandsons']) relationshipMap['grandsons'] = [];
            relationshipMap['grandsons'].push(member);
          } else {
            if (!relationshipMap['granddaughters']) relationshipMap['granddaughters'] = [];
            relationshipMap['granddaughters'].push(member);
          }
        } else if (relationship === 'uncle' || relationship === 'aunt') {
          member.generation = 3; // Same as parents (siblings of parents)
          if (!relationshipMap['uncles_aunts']) relationshipMap['uncles_aunts'] = [];
          relationshipMap['uncles_aunts'].push(member);
        } else if (relationship === 'cousin') {
          member.generation = 4; // Same as children (children of uncles/aunts)
          if (!relationshipMap['cousins']) relationshipMap['cousins'] = [];
          relationshipMap['cousins'].push(member);
        } else if (relationship === 'spouse' || relationship === 'wife' || relationship === 'husband') {
          // Spouse generation will be set based on their partner
          if (!relationshipMap['spouses']) relationshipMap['spouses'] = [];
          relationshipMap['spouses'].push(member);
        } else if (relationship === 'nephew' || relationship === 'niece') {
          member.generation = 4; // Same as children
          if (!relationshipMap['nephews_nieces']) relationshipMap['nephews_nieces'] = [];
          relationshipMap['nephews_nieces'].push(member);
        } else if (relationship === 'other' || !relationship) {
          // Members with "Other" or no relationship - keep existing generation or infer
          if (!relationshipMap['others']) relationshipMap['others'] = [];
          relationshipMap['others'].push(member);
        }
      });
      
      console.log('📊 Relationship categories:', {
        fathers: relationshipMap['fathers']?.length || 0,
        mothers: relationshipMap['mothers']?.length || 0,
        sons: relationshipMap['sons']?.length || 0,
        daughters: relationshipMap['daughters']?.length || 0,
        siblings: relationshipMap['siblings']?.length || 0,
        spouses: relationshipMap['spouses']?.length || 0,
        extended: relationshipMap['extended']?.length || 0,
        others: relationshipMap['others']?.length || 0
      });
      
      // Find couples at each generation level
      // 1. Great Grandparents (Great Grandfather + Great Grandmother) - generation 1
      // Match ALL great grandfathers with great grandmothers by last name
      if (relationshipMap['great_grandfathers'] && relationshipMap['great_grandmothers']) {
        const greatGrandfathers = relationshipMap['great_grandfathers'];
        const greatGrandmothers = relationshipMap['great_grandmothers'];
        
        // Match great grandfathers with great grandmothers by last name
        // This handles multiple great grandparent pairs (e.g., Krishna A/Lakshmi A and Rama B/Sita B)
        greatGrandfathers.forEach((greatGrandFather: any) => {
          if (!greatGrandFather.spouse) { // Only match if not already matched
            const greatGrandFatherLastName = (greatGrandFather.lastName || '').trim();
            
            // Find matching great grandmother with same last name
            const matchingGreatGrandMother = greatGrandmothers.find((ggm: any) => 
              !ggm.spouse && // Not already matched
              (ggm.lastName || '').trim() === greatGrandFatherLastName && // Same last name
              greatGrandFatherLastName !== '' // Last name must not be empty
            );
            
            if (matchingGreatGrandMother) {
              // Set spouse relationship
              greatGrandFather.spouse = matchingGreatGrandMother._id;
              matchingGreatGrandMother.spouse = greatGrandFather._id;
              console.log(`✅ Matched great grandparents by last name: ${greatGrandFather.firstName} ${greatGrandFather.lastName} <-> ${matchingGreatGrandMother.firstName} ${matchingGreatGrandMother.lastName}`);
            } else {
              // If no match by last name, try matching with any unmatched great grandmother
              // But only if there's exactly one unmatched great grandmother
              const unmatchedGreatGrandmothers = greatGrandmothers.filter((ggm: any) => !ggm.spouse);
              if (unmatchedGreatGrandmothers.length === 1 && greatGrandfathers.length === 1) {
                const greatGrandMother = unmatchedGreatGrandmothers[0];
                greatGrandFather.spouse = greatGrandMother._id;
                greatGrandMother.spouse = greatGrandFather._id;
                console.log(`✅ Matched great grandparents (only pair): ${greatGrandFather.firstName} <-> ${greatGrandMother.firstName}`);
              }
            }
          }
        });
      }
      
      // 2. Grandparents (Grandfather + Grandmother) - generation 2
      // Match ALL grandfathers with grandmothers by last name
      if (relationshipMap['grandfathers'] && relationshipMap['grandmothers']) {
        const grandfathers = relationshipMap['grandfathers'];
        const grandmothers = relationshipMap['grandmothers'];
        
        // Match grandfathers with grandmothers by last name
        grandfathers.forEach((grandFather: any) => {
          if (!grandFather.spouse) { // Only match if not already matched
            const grandFatherLastName = (grandFather.lastName || '').trim();
            
            // Find matching grandmother with same last name
            const matchingGrandMother = grandmothers.find((gm: any) => 
              !gm.spouse && // Not already matched
              (gm.lastName || '').trim() === grandFatherLastName && // Same last name
              grandFatherLastName !== '' // Last name must not be empty
            );
            
            if (matchingGrandMother) {
              // Set spouse relationship
              grandFather.spouse = matchingGrandMother._id;
              matchingGrandMother.spouse = grandFather._id;
              console.log(`✅ Matched grandparents by last name: ${grandFather.firstName} ${grandFather.lastName} <-> ${matchingGrandMother.firstName} ${matchingGrandMother.lastName}`);
            } else {
              // If no match by last name, try matching with any unmatched grandmother
              // But only if there's exactly one unmatched grandmother
              const unmatchedGrandmothers = grandmothers.filter((gm: any) => !gm.spouse);
              if (unmatchedGrandmothers.length === 1 && grandfathers.length === 1) {
                const grandMother = unmatchedGrandmothers[0];
                grandFather.spouse = grandMother._id;
                grandMother.spouse = grandFather._id;
                console.log(`✅ Matched grandparents (only pair): ${grandFather.firstName} <-> ${grandMother.firstName}`);
              }
            }
          }
        });
      }
      
      // 3. Parents (Father + Mother) - generation 3
      let primaryFather = null;
      let primaryMother = null;
      if (relationshipMap['fathers'] && relationshipMap['mothers']) {
        const fathers = relationshipMap['fathers'];
        const mothers = relationshipMap['mothers'];
        
        // Match father and mother (they should be spouses)
        if (fathers.length > 0 && mothers.length > 0) {
          primaryFather = fathers[0];
          primaryMother = mothers[0];
          // Set spouse relationship
          primaryFather.spouse = primaryMother._id;
          primaryMother.spouse = primaryFather._id;
          console.log(`✅ Matched parents: ${primaryFather.firstName} <-> ${primaryMother.firstName}`);
          
          // Set grandparents as parents of parents
          // Find matched grandparents from relationshipMap
          const grandfathers = relationshipMap['grandfathers'] || [];
          const grandmothers = relationshipMap['grandmothers'] || [];
          const matchedGrandFather = grandfathers.find((gf: any) => gf.spouse);
          const matchedGrandMother = matchedGrandFather ? grandmothers.find((gm: any) => gm._id === matchedGrandFather.spouse) : null;
          
          if (matchedGrandFather && matchedGrandMother) {
            primaryFather.father = matchedGrandFather._id;
            primaryFather.mother = matchedGrandMother._id;
            primaryMother.father = matchedGrandFather._id;
            primaryMother.mother = matchedGrandMother._id;
            console.log(`✅ Set ${matchedGrandFather.firstName} and ${matchedGrandMother.firstName} as parents of ${primaryFather.firstName} and ${primaryMother.firstName}`);
          }
        }
      }
      
      // 3. Uncles/Aunts - match them as couples and set grandparents as parents
      const unclesAunts = relationshipMap['uncles_aunts'] || [];
      // Find matched grandparents from relationshipMap
      const grandfathers = relationshipMap['grandfathers'] || [];
      const grandmothers = relationshipMap['grandmothers'] || [];
      const matchedGrandFather = grandfathers.find((gf: any) => gf.spouse);
      const matchedGrandMother = matchedGrandFather ? grandmothers.find((gm: any) => gm._id === matchedGrandFather.spouse) : null;
      
      unclesAunts.forEach((member: any) => {
        // Set grandparents as parents of uncles/aunts
        if (matchedGrandFather && matchedGrandMother && !member.father && !member.mother) {
          member.father = matchedGrandFather._id;
          member.mother = matchedGrandMother._id;
          console.log(`✅ Set ${matchedGrandFather.firstName} and ${matchedGrandMother.firstName} as parents of ${member.firstName} (${member.relationship})`);
        }
      });
      
      // Match uncles with aunts (opposite gender, same generation)
      unclesAunts.forEach((member: any) => {
        if (!member.spouse) {
          const partner = unclesAunts.find((m: any) => 
            m._id !== member._id &&
            ((member.relationship?.toLowerCase() === 'uncle' && m.relationship?.toLowerCase() === 'aunt') ||
             (member.relationship?.toLowerCase() === 'aunt' && m.relationship?.toLowerCase() === 'uncle')) &&
            m.generation === member.generation &&
            !m.spouse
          );
          if (partner) {
            member.spouse = partner._id;
            partner.spouse = member._id;
            console.log(`✅ Matched uncle/aunt couple: ${member.firstName} <-> ${partner.firstName}`);
          }
        }
      });
      
      // 5. Set parent-child relationships
      if (primaryFather && primaryMother) {
        // Set parent-child relationships for direct children (sons and daughters)
        const children = [...(relationshipMap['sons'] || []), ...(relationshipMap['daughters'] || [])];
        children.forEach(child => {
          // Only set if child doesn't already have parents
          if (!child.father && !child.mother) {
            child.father = primaryFather._id;
            child.mother = primaryMother._id;
          }
        });
        
        console.log('✅ Set parent-child relationships:', {
          parents: `${primaryFather.firstName} - ${primaryMother.firstName}`,
          children: children.map(c => c.firstName)
        });
      }
      
      // Set cousins as children of uncles/aunts
      const cousins = relationshipMap['cousins'] || [];
      unclesAunts.forEach((uncleAunt: any) => {
        // Find spouse of uncle/aunt
        const spouseId = uncleAunt.spouse;
        if (spouseId) {
          const spouse = unclesAunts.find((m: any) => m._id === spouseId);
          if (spouse) {
            // Assign some cousins to this uncle/aunt couple
            const coupleCousins = cousins.filter((c: any) => !c.father && !c.mother).slice(0, 3);
            coupleCousins.forEach((cousin: any) => {
              cousin.father = uncleAunt._id;
              cousin.mother = spouseId;
            });
          }
        }
      });
      
      // 5. Set grandchildren as children of their parents (sons/daughters)
      const grandsons = relationshipMap['grandsons'] || [];
      const granddaughters = relationshipMap['granddaughters'] || [];
      const grandchildren = [...grandsons, ...granddaughters];
      
      // Get all children (sons and daughters) who could be parents of grandchildren
      const potentialParents = [...(relationshipMap['sons'] || []), ...(relationshipMap['daughters'] || [])];
      
      // For each grandchild, try to find a parent couple
      // Grandchildren are children of the children generation (generation 2)
      grandchildren.forEach((grandchild: any) => {
        if (!grandchild.father && !grandchild.mother) {
          // Try to find a parent couple from the children generation
          // Look for a son or daughter who could be the parent
          // For now, assign to first available parent couple if any
          if (primaryFather && primaryMother) {
            // Get children of primary couple
            const childrenOfPrimary = [...(relationshipMap['sons'] || []), ...(relationshipMap['daughters'] || [])];
            if (childrenOfPrimary.length > 0) {
              // Assign grandchild to first child (could be improved with better logic)
              const parentChild = childrenOfPrimary[0];
              // Check if parent child has a spouse
              const parentSpouseId = parentChild.spouse;
              if (parentSpouseId) {
                const parentSpouse = potentialParents.find((p: any) => p._id === parentSpouseId);
                if (parentSpouse) {
                  grandchild.father = parentChild._id;
                  grandchild.mother = parentSpouseId;
                  console.log(`✅ Set ${parentChild.firstName} and ${parentSpouse.firstName} as parents of ${grandchild.firstName} (grandchild)`);
                }
              } else {
                // Single parent
                grandchild.father = parentChild._id;
                console.log(`✅ Set ${parentChild.firstName} as parent of ${grandchild.firstName} (grandchild)`);
              }
            }
          }
        }
      });
      
      // Handle siblings - siblings are children of the same parents
      if (primaryFather && primaryMother) {
        const children = [...(relationshipMap['sons'] || []), ...(relationshipMap['daughters'] || [])];
        const siblings = relationshipMap['siblings'] || [];
        
        // Add siblings as children of the primary couple if they don't have parents
        siblings.forEach(sibling => {
          if (!sibling.father && !sibling.mother) {
            sibling.father = primaryFather._id;
            sibling.mother = primaryMother._id;
            console.log(`✅ Added sibling ${sibling.firstName} as child of ${primaryFather.firstName} and ${primaryMother.firstName}`);
          }
        });
        
        // Also check "others" - if they have same generation as children, they might be siblings
        const others = relationshipMap['others'] || [];
        const childrenGen = children.length > 0 ? children[0].generation : null;
        others.forEach(other => {
          // If same generation as children and no parents, treat as sibling/child
          if ((!other.father && !other.mother) && 
              (childrenGen === null || other.generation === childrenGen || other.generation === childrenGen + 1)) {
            other.father = primaryFather._id;
            other.mother = primaryMother._id;
            console.log(`✅ Added "other" member ${other.firstName} as child of primary couple`);
          }
        });
      }
      
      // Handle spouses - match spouses to their partners
      const spouses = relationshipMap['spouses'] || [];
      spouses.forEach(spouse => {
        // Try to find a matching partner (opposite gender, same generation)
        const spouseGender = (spouse.gender || '').toLowerCase();
        const spouseGen = spouse.generation || 0;
        
        const potentialPartners = membersCopy.filter(m => {
          const mGender = (m.gender || '').toLowerCase();
          const mGen = m.generation || 0;
          return m._id !== spouse._id && 
                 mGender !== spouseGender && 
                 mGen === spouseGen &&
                 !m.spouse; // Not already married
        });
        
        if (potentialPartners.length > 0) {
          // Match with first potential partner
          const partner = potentialPartners[0];
          spouse.spouse = partner._id;
          partner.spouse = spouse._id;
          console.log(`✅ Matched spouses: ${spouse.firstName} <-> ${partner.firstName}`);
        }
      });
      
      return membersCopy;
    };
    
    // Infer relationships if needed
    const membersWithInferredRelationships = inferRelationships(members);

    // Include ALL members in the tree - don't filter them out
    // This ensures all added members are visible, even if they don't have relationships yet
    const membersToProcess = membersWithInferredRelationships.filter((member) => {
      // Include all members - they can be connected later or displayed as separate trees
      console.log('✅ Including member:', member.firstName, member.lastName, {
        hasFather: !!(member.father?._id || member.father),
        hasMother: !!(member.mother?._id || member.mother),
        hasSpouse: !!(member.spouse?._id || member.spouse),
        hasDateOfBirth: !!member.dateOfBirth,
        generation: member.generation
      });
      return true; // Include all members
    });

    console.log(`Including all ${membersToProcess.length} members in the tree`);

    // Deduplicate members by ID to prevent duplicates
    const uniqueMembers = new Map();
    membersToProcess.forEach((member) => {
      const memberId = member._id?.toString() || member.id?.toString();
      if (memberId && !uniqueMembers.has(memberId)) {
        uniqueMembers.set(memberId, member);
      } else if (memberId) {
        console.warn('⚠️ Duplicate member detected:', member.firstName, member.lastName, 'ID:', memberId);
      }
    });
    
    console.log(`Deduplicated ${membersToProcess.length} members to ${uniqueMembers.size} unique members`);

    // Convert API members to Person objects
    Array.from(uniqueMembers.values()).forEach((member) => {
      console.log('Processing member:', member.firstName, member.lastName, 'ID:', member._id);
      const personId = member._id;
      const gender = member.gender?.toLowerCase() || 'male';
      const avatar = getAvatarForGender(gender);
      
      // Format dateOfBirth - handle both Date objects and strings
      let dateOfBirthStr = '';
      if (member.dateOfBirth) {
        if (member.dateOfBirth instanceof Date) {
          dateOfBirthStr = member.dateOfBirth.toISOString().split('T')[0];
        } else if (typeof member.dateOfBirth === 'string') {
          dateOfBirthStr = member.dateOfBirth.split('T')[0]; // Remove time if present
        }
      }
      
      // Format photo URL - convert relative URLs to absolute
      let photoUrl = null;
      if (member.photo && member.photo.trim() !== '') {
        const photo = member.photo.trim();
        console.log(`Processing photo for ${member.firstName}:`, photo);
        
        if (photo.startsWith('http://') || photo.startsWith('https://')) {
          // Already a full URL - but might be localhost or HTTP, need to replace with actual backend URL
          if (photo.includes('localhost') || photo.startsWith('http://')) {
            // Replace localhost or HTTP URLs with current API base URL
            const apiBaseUrl = getApiUrl().replace('/api', '');
            photoUrl = photo.replace(/http:\/\/[^/]+/, apiBaseUrl);
          } else {
            // Cloudinary or other HTTPS URL
            photoUrl = photo;
          }
        } else if (photo.startsWith('/uploads/')) {
          // Relative path starting with /uploads/
          const apiBaseUrl = getApiUrl().replace('/api', '');
          photoUrl = `${apiBaseUrl}${photo}`;
        } else if (photo.startsWith('uploads/')) {
          // Relative path starting with uploads/
          const apiBaseUrl = getApiUrl().replace('/api', '');
          photoUrl = `${apiBaseUrl}/${photo}`;
        } else {
          // Try to construct full URL (just filename)
          const apiBaseUrl = getApiUrl().replace('/api', '');
          photoUrl = `${apiBaseUrl}/uploads/${photo}`;
        }
        console.log(`Final photo URL for ${member.firstName}:`, photoUrl);
      } else {
        console.log(`No photo for ${member.firstName}`);
      }
      
      // Only add if not already in people object (prevent duplicates)
      if (!people[personId]) {
        people[personId] = {
          id: personId,
          firstName: member.firstName || '',
          lastName: member.lastName || '',
          gender: gender as 'male' | 'female',
          dateOfBirth: dateOfBirthStr,
          avatar,
          photo: photoUrl,
          generation: member.generation || 1,
          relationship: member.relationship || undefined,
          _id: member._id,
          children: [] // Initialize children array
        };
      } else {
        console.warn('⚠️ Skipping duplicate person:', member.firstName, member.lastName, 'ID:', personId);
        return; // Skip processing this duplicate member
      }

      // Set root person (prefer Father/Mother couple, then lowest generation)
      // Check if this member is a Father or Mother (they should be root)
      const relationship = (member.relationship || '').toLowerCase().trim();
      const isParent = relationship === 'father' || relationship === 'mother';
      
      if (!rootPersonId) {
        rootPersonId = personId;
      } else {
        const currentRoot = people[rootPersonId];
        const currentRootRel = (currentRoot?.generation !== undefined ? '' : ''); // We don't have relationship in Person, check member
        const currentRootGen = currentRoot?.generation || 999;
        const memberGen = member.generation || 1;
        
        // Prefer Father/Mother as root
        if (isParent && (!currentRoot || currentRootGen >= memberGen)) {
          rootPersonId = personId;
        } else if (!isParent && currentRootGen !== 0 && memberGen === 0) {
          // Prefer generation 0
          rootPersonId = personId;
        } else if (memberGen < currentRootGen && currentRootGen !== 0 && !isParent) {
          // Lower generation, but only if current root is not a parent
          rootPersonId = personId;
        }
      }
    });

    // Build relationships from member data (only for unique members with relationships)
    console.log('🔗 Starting to build relationships from', uniqueMembers.size, 'members');
    Array.from(uniqueMembers.values()).forEach((member) => {
      // Try multiple ways to get relationship IDs
      const fatherId = member.father?._id || member.father || member.fatherId || null;
      const motherId = member.mother?._id || member.mother || member.motherId || null;
      const spouseId = member.spouse?._id || member.spouse || member.spouseId || null;
      
      console.log(`🔗 Building relationships for ${member.firstName} (ID: ${member._id}):`, {
        father: member.father,
        mother: member.mother,
        spouse: member.spouse,
        fatherId,
        motherId,
        spouseId,
        fatherExists: fatherId ? !!people[fatherId] : false,
        motherExists: motherId ? !!people[motherId] : false,
        spouseExists: spouseId ? !!people[spouseId] : false,
        allPeopleIds: Object.keys(people)
      });
      
      // Handle father relationship - can be populated object or just ID
      if (fatherId) {
        if (people[fatherId]) {
          // IMPORTANT: Don't create parent-child if this is actually a spouse relationship
          if (spouseId !== fatherId) {
        relationships.push({
          id: `rel_${member._id}_father_${fatherId}`,
          person1Id: fatherId,
          person2Id: member._id,
          type: 'parent-child'
        });
            // Add child to father's children array
            if (!people[fatherId].children) {
              people[fatherId].children = [];
            }
            if (!people[fatherId].children.includes(member._id)) {
              people[fatherId].children.push(member._id);
            }
            console.log(`✅ Added father relationship: ${people[fatherId]?.firstName} -> ${member.firstName}`);
          } else {
            console.log(`⚠️ Skipping father relationship - ${fatherId} is spouse of ${member._id}`);
          }
        } else {
          console.log(`⚠️ Father ${fatherId} not found in people object. Available IDs:`, Object.keys(people));
        }
      } else {
        console.log(`ℹ️ No father for ${member.firstName}`);
      }
      
      // Handle mother relationship - can be populated object or just ID
      if (motherId) {
        if (people[motherId]) {
          // IMPORTANT: Don't create parent-child if this is actually a spouse relationship
          if (spouseId !== motherId) {
        relationships.push({
          id: `rel_${member._id}_mother_${motherId}`,
          person1Id: motherId,
          person2Id: member._id,
          type: 'parent-child'
        });
            // Add child to mother's children array
            if (!people[motherId].children) {
              people[motherId].children = [];
            }
            if (!people[motherId].children.includes(member._id)) {
              people[motherId].children.push(member._id);
            }
            console.log(`✅ Added mother relationship: ${people[motherId]?.firstName} -> ${member.firstName}`);
          } else {
            console.log(`⚠️ Skipping mother relationship - ${motherId} is spouse of ${member._id}`);
          }
        } else {
          console.log(`⚠️ Mother ${motherId} not found in people object. Available IDs:`, Object.keys(people));
        }
      } else {
        console.log(`ℹ️ No mother for ${member.firstName}`);
      }
      
      // If member has both father and mother, they should be spouses
      // This is CRITICAL - ensure father and mother are always spouses
      if (fatherId && motherId && people[fatherId] && people[motherId]) {
        const existingSpouseRel = relationships.find(r => 
          r.type === 'spouse' && 
          ((r.person1Id === fatherId && r.person2Id === motherId) ||
           (r.person1Id === motherId && r.person2Id === fatherId))
        );
        if (!existingSpouseRel) {
          relationships.push({
            id: `rel_${fatherId}_spouse_${motherId}_auto`,
            person1Id: fatherId,
            person2Id: motherId,
            type: 'spouse'
          });
          // Set spouse property on both Person objects
          people[fatherId].spouse = motherId;
          people[motherId].spouse = fatherId;
          console.log(`✅ Auto-added spouse relationship (from parents): ${people[fatherId].firstName} <-> ${people[motherId].firstName}`);
        } else {
          // Still set spouse property even if relationship already exists
          people[fatherId].spouse = motherId;
          people[motherId].spouse = fatherId;
          console.log(`✅ Spouse relationship already exists: ${people[fatherId].firstName} <-> ${people[motherId].firstName}`);
        }
      }
      
      // Handle spouse relationship - can be populated object or just ID
      if (spouseId) {
        if (people[spouseId]) {
        // Check if relationship already exists (avoid duplicates)
        const existingSpouseRel = relationships.find(r => 
          r.type === 'spouse' && 
          ((r.person1Id === member._id && r.person2Id === spouseId) ||
           (r.person1Id === spouseId && r.person2Id === member._id))
        );
        if (!existingSpouseRel) {
          relationships.push({
            id: `rel_${member._id}_spouse_${spouseId}`,
            person1Id: member._id,
            person2Id: spouseId,
            type: 'spouse'
          });
          // Set spouse property on both Person objects
          if (people[member._id]) {
            people[member._id].spouse = spouseId;
          }
          if (people[spouseId]) {
            people[spouseId].spouse = member._id;
          }
            console.log(`✅ Added spouse relationship: ${member.firstName} <-> ${people[spouseId]?.firstName}`);
          } else {
            // Still set spouse property even if relationship already exists
            if (people[member._id]) {
              people[member._id].spouse = spouseId;
            }
            if (people[spouseId]) {
              people[spouseId].spouse = member._id;
            }
            console.log(`✅ Spouse relationship already exists: ${member.firstName} <-> ${people[spouseId]?.firstName}`);
          }
        } else {
          console.log(`⚠️ Spouse ${spouseId} not found in people object. Available IDs:`, Object.keys(people));
        }
      } else {
        console.log(`ℹ️ No spouse for ${member.firstName}`);
      }
    });
    
    // FINAL FALLBACK: Pair people with matching relationship types and last names
    // This ensures great grandparents, grandparents, etc. are paired even if spouse wasn't set
    const relationshipPairs: { [key: string]: string[] } = {
      'Great Grandfather': ['Great Grandmother'],
      'Great Grandmother': ['Great Grandfather'],
      'Grandfather': ['Grandmother'],
      'Grandmother': ['Grandfather'],
      'Father': ['Mother'],
      'Mother': ['Father']
    };
    
    Object.values(people).forEach(person => {
      // Skip if already has spouse
      if (person.spouse) return;
      
      const personRel = person.relationship || '';
      const matchingTypes = relationshipPairs[personRel];
      
      if (matchingTypes && matchingTypes.length > 0) {
        // Find potential spouse with matching relationship type and same last name
        const potentialSpouse = Object.values(people).find(p => 
          p.id !== person.id &&
          !p.spouse &&
          matchingTypes.includes(p.relationship || '') &&
          p.generation === person.generation &&
          (p.lastName || '').trim() === (person.lastName || '').trim() &&
          (person.lastName || '').trim() !== '' // Last name must not be empty
        );
        
        if (potentialSpouse) {
          // Check if spouse relationship already exists
          const existingSpouseRel = relationships.find(r => 
            r.type === 'spouse' && 
            ((r.person1Id === person.id && r.person2Id === potentialSpouse.id) ||
             (r.person1Id === potentialSpouse.id && r.person2Id === person.id))
          );
          
          if (!existingSpouseRel) {
            relationships.push({
              id: `rel_${person.id}_spouse_${potentialSpouse.id}_fallback`,
              person1Id: person.id,
              person2Id: potentialSpouse.id,
              type: 'spouse'
            });
            person.spouse = potentialSpouse.id;
            potentialSpouse.spouse = person.id;
            console.log(`✅ Fallback: Paired ${person.firstName} ${person.lastName} (${personRel}) <-> ${potentialSpouse.firstName} ${potentialSpouse.lastName} (${potentialSpouse.relationship})`);
          }
        }
      }
    });
    
    console.log(`✅ Built ${relationships.length} relationships total`);
    if (relationships.length > 0) {
      console.log('📋 All relationships created:');
      relationships.forEach(rel => {
        const person1 = people[rel.person1Id];
        const person2 = people[rel.person2Id];
        console.log(`  - ${rel.type}: ${person1?.firstName || rel.person1Id} -> ${person2?.firstName || rel.person2Id}`);
      });
      
      // Update root to be the Father/Mother couple if they exist
      // Find people who have spouse relationships and children (they are the primary couple)
      const spouseRelationships = relationships.filter(r => r.type === 'spouse');
      const parentChildRelationships = relationships.filter(r => r.type === 'parent-child');
      
      // Find the couple that has the most children (likely the primary couple)
      const coupleChildrenCount: { [key: string]: number } = {};
      spouseRelationships.forEach(spouseRel => {
        const coupleKey = [spouseRel.person1Id, spouseRel.person2Id].sort().join('_');
        const childrenCount = parentChildRelationships.filter(pc => 
          pc.person1Id === spouseRel.person1Id || pc.person1Id === spouseRel.person2Id
        ).length;
        coupleChildrenCount[coupleKey] = childrenCount;
      });
      
      // Find the couple with most children
      let bestCoupleKey = '';
      let maxChildren = 0;
      Object.keys(coupleChildrenCount).forEach(key => {
        if (coupleChildrenCount[key] > maxChildren) {
          maxChildren = coupleChildrenCount[key];
          bestCoupleKey = key;
        }
      });
      
      if (bestCoupleKey) {
        const [p1, p2] = bestCoupleKey.split('_');
        if (people[p1] && people[p2]) {
          rootPersonId = p1; // Use first person of the couple as root
          console.log(`✅ Updated root to primary couple: ${people[p1].firstName} - ${people[p2].firstName} (${maxChildren} children)`);
        }
      }
    } else {
      console.log('⚠️ WARNING: No relationships were created!');
      console.log('  - Total people:', Object.keys(people).length);
      console.log('  - People names:', Object.values(people).map(p => `${p.firstName} ${p.lastName}`));
    }

    console.log('Built tree with:', {
      peopleCount: Object.keys(people).length,
      relationshipsCount: relationships.length,
      rootPersonId,
      people: Object.keys(people).map(id => ({
        id,
        name: `${people[id].firstName} ${people[id].lastName}`,
        generation: people[id].generation
      })),
      relationships: relationships.map(r => ({
        type: r.type,
        from: `${people[r.person1Id]?.firstName || r.person1Id}`,
        to: `${people[r.person2Id]?.firstName || r.person2Id}`
      }))
    });
    console.log('People IDs:', Object.keys(people));
    console.log('People names:', Object.values(people).map(p => `${p.firstName} ${p.lastName}`));
    console.log('Relationships:', relationships);
    
    // Force state update with completely new object references
    const newTree = { 
      people: { ...people }, 
      relationships: [...relationships], 
      rootPersonId 
    };
    console.log('Setting family tree state with', Object.keys(newTree.people).length, 'people');
    console.log('New tree people names:', Object.values(newTree.people).map(p => `${p.firstName} ${p.lastName}`));
    
    // Use functional update to ensure state is set correctly
    setFamilyTree(prevTree => {
      console.log('Previous tree had', Object.keys(prevTree.people).length, 'people');
      console.log('Setting new tree with', Object.keys(newTree.people).length, 'people');
      return newTree;
    });
  };

  // Convert familyTree data to D3 FamilyNode format
  // This builds a COMPLETE tree including ALL family members (siblings, aunts, uncles, cousins)
  const convertToD3Format = (): FamilyNode | null => {
    if (Object.keys(familyTree.people).length === 0) {
      return null;
    }

    const people = familyTree.people;
    const relationships = familyTree.relationships;
    const allPeopleIds = Object.keys(people);
    
    console.log('Converting to D3 format (COMPLETE TREE):', {
      totalPeople: allPeopleIds.length,
      relationships: relationships.length,
      peopleIds: allPeopleIds
    });

    // Build spouse map
    const spouseMap: { [key: string]: string } = {};
    relationships.forEach(rel => {
      if (rel.type === 'spouse') {
        spouseMap[rel.person1Id] = rel.person2Id;
        spouseMap[rel.person2Id] = rel.person1Id;
      }
    });

    // Build children map (child -> parents) to find couples
    const childToParentsMap: { [key: string]: string[] } = {};
    relationships.forEach(rel => {
      if (rel.type === 'parent-child') {
        const parentId = rel.person1Id;
        const childId = rel.person2Id;
        if (!childToParentsMap[childId]) {
          childToParentsMap[childId] = [];
        }
        childToParentsMap[childId].push(parentId);
      }
    });

    // Build couple map (couple key -> children)
    // IMPORTANT: First, identify ALL couples from spouse relationships (even without children)
    const coupleToChildrenMap: { [key: string]: string[] } = {};
    const coupleMap: { [key: string]: { parent1: string; parent2: string } } = {};
    
    // Step 1: Identify all couples from spouse relationships (even if they have no children)
    const processedCouples = new Set<string>();
    Object.keys(spouseMap).forEach(personId => {
      const spouseId = spouseMap[personId];
      if (spouseId && personId < spouseId) { // Only process once per couple (use sorted order)
        const coupleKey = `${personId}_${spouseId}`;
        if (!processedCouples.has(coupleKey)) {
          processedCouples.add(coupleKey);
          if (!coupleToChildrenMap[coupleKey]) {
            coupleToChildrenMap[coupleKey] = [];
            coupleMap[coupleKey] = { parent1: personId, parent2: spouseId };
          }
        }
      }
    });
    
    // Step 2: Add children to couples based on parent-child relationships
    Object.keys(childToParentsMap).forEach(childId => {
      const parents = childToParentsMap[childId];
      if (parents.length >= 2) {
        // This child has both parents - they are a couple
        const [parent1, parent2] = parents.sort();
        const coupleKey = `${parent1}_${parent2}`;
        
        if (!coupleToChildrenMap[coupleKey]) {
          coupleToChildrenMap[coupleKey] = [];
          coupleMap[coupleKey] = { parent1, parent2 };
        }
        if (!coupleToChildrenMap[coupleKey].includes(childId)) {
          coupleToChildrenMap[coupleKey].push(childId);
        }
      } else if (parents.length === 1) {
        // Single parent - check if they have a spouse
        const parentId = parents[0];
        const spouseId = spouseMap[parentId];
        if (spouseId) {
          // Create couple key with spouse
          const [p1, p2] = [parentId, spouseId].sort();
          const coupleKey = `${p1}_${p2}`;
          if (!coupleToChildrenMap[coupleKey]) {
            coupleToChildrenMap[coupleKey] = [];
            coupleMap[coupleKey] = { parent1: p1, parent2: p2 };
          }
          if (!coupleToChildrenMap[coupleKey].includes(childId)) {
            coupleToChildrenMap[coupleKey].push(childId);
          }
        } else {
          // Single parent without spouse
          const coupleKey = `single_${parentId}`;
          if (!coupleToChildrenMap[coupleKey]) {
            coupleToChildrenMap[coupleKey] = [];
            coupleMap[coupleKey] = { parent1: parentId, parent2: '' };
          }
          if (!coupleToChildrenMap[coupleKey].includes(childId)) {
            coupleToChildrenMap[coupleKey].push(childId);
          }
        }
      }
    });

    // Build children map for individual parents (for backward compatibility)
    const childrenMap: { [key: string]: string[] } = {};
    relationships.forEach(rel => {
      if (rel.type === 'parent-child') {
        const parentId = rel.person1Id;
        const childId = rel.person2Id;
        if (!childrenMap[parentId]) {
          childrenMap[parentId] = [];
        }
        childrenMap[parentId].push(childId);
      }
    });

    // Build parent map (child -> parents) to find who has no parents
    const parentMap: { [key: string]: string[] } = {};
    relationships.forEach(rel => {
      if (rel.type === 'parent-child') {
        const parentId = rel.person1Id;
        const childId = rel.person2Id;
        if (!parentMap[childId]) {
          parentMap[childId] = [];
        }
        parentMap[childId].push(parentId);
      }
    });

    // Find root couple or person (people with no parents)
    const rootPeopleIds = allPeopleIds.filter(id => !parentMap[id] || parentMap[id].length === 0);
    
    // Find root couple (couple with LOWEST generation - grandparents should be at top)
    let rootCoupleKey: string | null = null;
    let rootPersonId = familyTree.rootPersonId;
    
    // First, find people with the LOWEST generation (these are the grandparents/oldest generation)
    const allPeople = Object.values(people);
    const minGeneration = Math.min(...allPeople.map(p => p.generation || 0));
    const lowestGenPeople = allPeople.filter(p => (p.generation || 0) === minGeneration);
    
    // Prefer root people (no parents) if they exist and are in the lowest generation
    const rootPeopleInLowestGen = rootPeopleIds.filter(id => {
      const person = people[id];
      return person && (person.generation || 0) === minGeneration;
    });
    
    // Use root people in lowest generation, or all people in lowest generation
    const candidates = rootPeopleInLowestGen.length > 0 ? rootPeopleInLowestGen : lowestGenPeople.map(p => p.id);
    
    if (candidates.length > 0) {
      // Find if any candidates are part of a couple
      for (const candidateId of candidates) {
        const spouseId = spouseMap[candidateId];
        if (spouseId && candidates.includes(spouseId)) {
          // Found a root couple in lowest generation
          const [p1, p2] = [candidateId, spouseId].sort();
          rootCoupleKey = `${p1}_${p2}`;
          rootPersonId = candidateId; // Use first person as representative
          break;
        }
      }
      
      // If no couple found, use first candidate
      if (!rootCoupleKey && candidates.length > 0) {
        rootPersonId = candidates[0];
      }
    } else {
      // Fallback: use lowest generation from all people
      const sortedPeople = allPeople.sort((a, b) => (a.generation || 0) - (b.generation || 0));
      if (sortedPeople.length > 0) {
        rootPersonId = sortedPeople[0].id;
        const spouseId = spouseMap[rootPersonId];
        if (spouseId) {
          const [p1, p2] = [rootPersonId, spouseId].sort();
          rootCoupleKey = `${p1}_${p2}`;
        }
      }
    }

    if (!rootPersonId || !people[rootPersonId]) {
      return null;
    }

    // Track all visited people
    const visited = new Set<string>();

    // Recursive function to build tree node
    const buildNode = (personId: string, visitedSet: Set<string>): FamilyNode | null => {
      if (visitedSet.has(personId)) {
        return null; // Prevent cycles
      }
      visitedSet.add(personId);
      visited.add(personId);

      const person = people[personId];
      if (!person) {
        return null;
      }

      const fullName = `${person.firstName} ${person.lastName}`.trim();
      const spouseId = spouseMap[personId];
      let spouseName: string | undefined = undefined;

      if (spouseId && people[spouseId]) {
        const spouse = people[spouseId];
        spouseName = `${spouse.firstName} ${spouse.lastName}`.trim();
        visited.add(spouseId); // Mark spouse as visited
      }

      // Get children - check if this person is part of a couple
      let childIds: string[] = [];
      if (spouseId) {
        // Check couple map
        const [p1, p2] = [personId, spouseId].sort();
        const coupleKey = `${p1}_${p2}`;
        if (coupleToChildrenMap[coupleKey]) {
          childIds = coupleToChildrenMap[coupleKey];
        }
      }
      
      // Fallback to individual children map
      if (childIds.length === 0) {
        childIds = childrenMap[personId] || [];
      }

      // IMPORTANT: Filter out spouse from children - spouse should NEVER be a child
      childIds = childIds.filter(childId => {
        // If this "child" is actually the spouse, exclude it
        if (childId === spouseId) {
          console.log(`Excluding spouse ${spouseId} from children of ${personId}`);
          return false;
        }
        // If this "child" has a spouse relationship with the current person, exclude it
        if (spouseMap[childId] === personId || spouseMap[personId] === childId) {
          console.log(`Excluding spouse relationship ${childId} from children of ${personId}`);
          return false;
        }
        return true;
      });

      const children: FamilyNode[] = [];
      const processedChildren = new Set<string>();

      childIds.forEach(childId => {
        if (processedChildren.has(childId)) return;
        // Double check: don't add spouse as child
        if (childId === spouseId || spouseMap[childId] === personId) {
          return;
        }
        processedChildren.add(childId);
        
        const childNode = buildNode(childId, new Set(visitedSet));
        if (childNode) {
          children.push(childNode);
        }
      });

      // Get relationship from person data if available
      const relationship = person.relationship || '';
      
      return {
        name: fullName,
        spouse: spouseName,
        children: children.length > 0 ? children : undefined,
        relationship: relationship || undefined
      };
    };

    // Build main tree from root
    let rootNode: FamilyNode | null = null;
    
    // First, try to find if root person has a spouse
    const rootSpouseId = spouseMap[rootPersonId];
    
    console.log('🔍 Root person check:');
    console.log('  - rootPersonId:', rootPersonId);
    console.log('  - rootName:', people[rootPersonId]?.firstName);
    console.log('  - rootSpouseId:', rootSpouseId);
    console.log('  - rootSpouseName:', rootSpouseId ? people[rootSpouseId]?.firstName : 'none');
    console.log('  - spouseMap keys:', Object.keys(spouseMap));
    console.log('  - spouseMap entries:', Object.keys(spouseMap).map(id => ({
      person: people[id]?.firstName,
      spouse: people[spouseMap[id]]?.firstName
    })));
    
    // If root has a spouse and both are root people (no parents), show as couple
    if (rootSpouseId && people[rootSpouseId]) {
      const rootPerson = people[rootPersonId];
      const spousePerson = people[rootSpouseId];
      
      // Check if both are root people (no parents)
      const rootHasParents = parentMap[rootPersonId] && parentMap[rootPersonId].length > 0;
      const spouseHasParents = parentMap[rootSpouseId] && parentMap[rootSpouseId].length > 0;
      
      if (!rootHasParents && !spouseHasParents) {
        // Both are root - show as couple
        const name1 = `${rootPerson.firstName} ${rootPerson.lastName}`.trim();
        const name2 = `${spousePerson.firstName} ${spousePerson.lastName}`.trim();
        
        visited.add(rootPersonId);
        visited.add(rootSpouseId);
        
        // Get children of the couple
        const [p1, p2] = [rootPersonId, rootSpouseId].sort();
        const coupleKey = `${p1}_${p2}`;
        let childIds = coupleToChildrenMap[coupleKey] || [];
        
        // Fallback: get children from either parent
        if (childIds.length === 0) {
          const childrenFromRoot = childrenMap[rootPersonId] || [];
          const childrenFromSpouse = childrenMap[rootSpouseId] || [];
          // Combine and deduplicate
          childIds = [...new Set([...childrenFromRoot, ...childrenFromSpouse])];
        }
        
        // Filter out spouses from children - CRITICAL CHECK
        childIds = childIds.filter(id => {
          if (id === rootPersonId || id === rootSpouseId) {
            console.log(`🚫 Filtering out ${id} from children - it's a spouse`);
            return false;
          }
          // Double check: if this ID is in spouseMap with root or spouse, exclude it
          if (spouseMap[id] === rootPersonId || spouseMap[id] === rootSpouseId || 
              spouseMap[rootPersonId] === id || spouseMap[rootSpouseId] === id) {
            console.log(`🚫 Filtering out ${id} from children - spouse relationship detected`);
            return false;
          }
          return true;
        });
        
        console.log(`Building root couple tree: ${name1} - ${name2}, children:`, childIds.map(id => people[id]?.firstName));
        
        const children: FamilyNode[] = [];
        const processedChildren = new Set<string>();

        childIds.forEach(childId => {
          if (processedChildren.has(childId)) return;
          if (childId === rootPersonId || childId === rootSpouseId) return;
          // Final check: ensure not a spouse
          if (spouseMap[childId] === rootPersonId || spouseMap[childId] === rootSpouseId) {
            console.log(`🚫 Skipping ${childId} - it's a spouse, not a child`);
            return;
          }
          processedChildren.add(childId);
          
          const childNode = buildNode(childId, new Set());
          if (childNode) {
            children.push(childNode);
          }
        });

        rootNode = {
          name: name1,
          spouse: name2,
          children: children.length > 0 ? children : undefined
        };
      } else {
        // One has parents, build normally
        rootNode = buildNode(rootPersonId, new Set());
      }
    } else if (rootCoupleKey && coupleMap[rootCoupleKey]) {
      // Try couple map approach
      const couple = coupleMap[rootCoupleKey];
      const person1 = people[couple.parent1];
      const person2 = people[couple.parent2];
      
      if (person1 && person2) {
        const name1 = `${person1.firstName} ${person1.lastName}`.trim();
        const name2 = `${person2.firstName} ${person2.lastName}`.trim();
        
        visited.add(couple.parent1);
        visited.add(couple.parent2);
        
        const childIds = coupleToChildrenMap[rootCoupleKey] || [];
        // Filter out spouses
        const filteredChildIds = childIds.filter(id => id !== couple.parent1 && id !== couple.parent2);
        
        const children: FamilyNode[] = [];
        const processedChildren = new Set<string>();

        filteredChildIds.forEach(childId => {
          if (processedChildren.has(childId)) return;
          processedChildren.add(childId);
          
          const childNode = buildNode(childId, new Set());
          if (childNode) {
            children.push(childNode);
          }
        });

        rootNode = {
          name: name1,
          spouse: name2,
          children: children.length > 0 ? children : undefined
        };
      }
    } else {
      // Build from single root person
      rootNode = buildNode(rootPersonId, new Set());
    }
    
    // Find disconnected members (not visited yet)
    const disconnectedIds = allPeopleIds.filter(id => !visited.has(id));
    
    console.log('🌳 Tree conversion result:');
    console.log('  - rootPersonId:', rootPersonId);
    console.log('  - rootCoupleKey:', rootCoupleKey);
    console.log('  - rootName:', rootNode?.name);
    console.log('  - rootSpouse:', rootNode?.spouse);
    console.log('  - rootChildren count:', rootNode?.children?.length || 0);
    console.log('  - rootChildren names:', rootNode?.children?.map(c => c.name) || []);
    console.log('  - visitedCount:', visited.size);
    console.log('  - disconnectedCount:', disconnectedIds.length);
    console.log('  - disconnectedIds:', disconnectedIds);

    // Add disconnected members as children if they exist
    if (rootNode && disconnectedIds.length > 0) {
      const disconnectedChildren: FamilyNode[] = [];
      const processedDisconnected = new Set<string>();
      
      disconnectedIds.forEach(id => {
        if (processedDisconnected.has(id)) return;
        
        const person = people[id];
        if (!person) return;

        const fullName = `${person.firstName} ${person.lastName}`.trim();
        const spouseId = spouseMap[id];
        let spouseName: string | undefined = undefined;

        if (spouseId && people[spouseId]) {
          const spouse = people[spouseId];
          spouseName = `${spouse.firstName} ${spouse.lastName}`.trim();
          processedDisconnected.add(spouseId);
        }

        // Check if this person has children
        const hasChildren = (childrenMap[id] && childrenMap[id].length > 0) || 
                           (coupleToChildrenMap[`single_${id}`] && coupleToChildrenMap[`single_${id}`].length > 0);
        
        if (hasChildren) {
          const disconnectedNode = buildNode(id, new Set());
          if (disconnectedNode) {
            disconnectedChildren.push(disconnectedNode);
            processedDisconnected.add(id);
          }
        } else {
          disconnectedChildren.push({
            name: fullName,
            spouse: spouseName
          });
          processedDisconnected.add(id);
        }
      });

      if (disconnectedChildren.length > 0) {
        if (rootNode.children) {
          rootNode.children.push(...disconnectedChildren);
        } else {
          rootNode.children = disconnectedChildren;
        }
      }
    }

    return rootNode;
  };

  // Update D3 tree data when familyTree changes
  useEffect(() => {
    const d3Data = convertToD3Format();
    setD3TreeData(d3Data);
  }, [familyTree]);

  const getAvatarForGender = (gender: string): string => {
    if (gender === 'female') return '👩';
    if (gender === 'male') return '👨';
    return '🧑';
  };

  const generateId = () => {
    return 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    return today.getFullYear() - birth.getFullYear();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCurrentPhotoData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRelationshipTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, relationshipType: e.target.value as any, relativeId: '' });
  };

  const addPerson = async () => {
    const { firstName, lastName, gender, dateOfBirth, relationshipType, relativeId } = formData;

    if (!firstName || !lastName || !dateOfBirth) {
      alert('Please fill in all required fields!');
      return;
    }

    if (!selectedFamilyId) {
      alert('Please select a family first!');
      return;
    }

    try {
      // Determine generation and relationships
      let generation = 1;
      let fatherId = '';
      let motherId = '';
      let spouseId = '';
      let relationshipValue = relationshipType;

      if (relationshipType === 'Root Person (Start Here)') {
        if (familyTree.rootPersonId) {
          alert('Root person already exists! Use other relationship types.');
          return;
        }
        generation = 0; // Root should be generation 0
        relationshipValue = gender === 'male' ? 'Father' : 'Mother';
      } else {
        if (!relativeId) {
          alert('Please select a relative!');
          return;
        }

        const relative = familyTree.people[relativeId];
        if (!relative) {
          alert('Selected relative not found!');
          return;
        }

        // Handle different relationship types
        if (relationshipType === 'Spouse') {
          generation = relative.generation;
          spouseId = relativeId;
        } else if (relationshipType === 'Father' || relationshipType === 'Mother') {
          // Parent of the selected relative
          generation = relative.generation - 1;
          // If relative has parents, use them; otherwise, this person becomes the parent
          if (relative.gender === 'male') {
            // Relative is male, so this person should be their parent
            // Check if relative has a spouse - if yes, spouse's parents become this person's parents
            const relativeSpouse = getSpouse(relativeId);
            if (relativeSpouse) {
              // Try to find relative's parents
              const relativeParents = Object.values(familyTree.people).filter(p => 
                p.children?.includes(relativeId)
              );
              if (relativeParents.length > 0) {
                const maleParent = relativeParents.find(p => p.gender === 'male');
                const femaleParent = relativeParents.find(p => p.gender === 'female');
                if (maleParent) fatherId = maleParent.id;
                if (femaleParent) motherId = femaleParent.id;
              }
            }
          }
        } else if (relationshipType === 'Grandfather' || relationshipType === 'Grandmother') {
          generation = relative.generation - 2;
          // Try to find the matching grandparent to pair as spouse
          // Look for opposite gender grandparent at the same generation who is not already married
          const oppositeGender = relationshipType === 'Grandfather' ? 'female' : 'male';
          const matchingRel = relationshipType === 'Grandfather' ? 'grandmother' : 'grandfather';
          
          // Smart matching: prioritize couples that share children, then same last name
          // This prevents incorrect cross-family pairings
          const newPersonLastName = lastName.trim(); // The person we're adding
          
          const matchingGrandparent = Object.values(familyTree.people).find(p => {
            const pRel = (p.relationship || '').toLowerCase().trim();
            const isMatchingRel = pRel === matchingRel.toLowerCase();
            const isOppositeGender = p.gender === oppositeGender;
            const isSameGeneration = p.generation === generation;
            const notMarried = !p.spouse;
            
            if (!isMatchingRel || !isOppositeGender || !isSameGeneration || !notMarried) {
              return false;
            }
            
            // Priority 1: Check if the relative is a child of this grandparent
            const relativePerson = familyTree.people[relativeId];
            if (relativePerson) {
              const pChildren = p.children || [];
              const isRelativeAChild = pChildren.includes(relativeId);
              
              if (isRelativeAChild) {
                console.log(`  ✅ Found matching grandparent - relative ${relativePerson.firstName} is their child: ${p.firstName} ${p.lastName}`);
                return true;
              }
              
              // Also check if they share any children
              const relativeChildren = relativePerson.children || [];
              const shareChildren = relativeChildren.some(childId => pChildren.includes(childId));
              
              if (shareChildren) {
                console.log(`  ✅ Found matching grandparent with shared children: ${p.firstName} ${p.lastName}`);
                return true;
              }
            }
            
            // Priority 2: Check last name - if they have the same last name, they're likely a couple
            const pLastName = (p.lastName || '').trim();
            const sameLastName = newPersonLastName && pLastName && newPersonLastName === pLastName;
            
            if (sameLastName) {
              console.log(`  ✅ Found matching grandparent with same last name (${newPersonLastName}): ${p.firstName} ${p.lastName}`);
              return true;
            }
            
            // Don't auto-match if we don't have strong evidence
            if (pRel.includes('grand')) {
              console.log(`  ⚠️ Skipping ${p.firstName} ${p.lastName} - no shared children or same last name (${pLastName} vs ${newPersonLastName})`);
            }
            
            return false;
          });
          
          if (matchingGrandparent) {
            // Found matching grandparent - they should be spouses
            spouseId = matchingGrandparent.id;
            console.log(`✅ Auto-pairing grandparents: ${relationshipType} with ${matchingGrandparent.firstName} ${matchingGrandparent.lastName}`);
          } else {
            console.log(`ℹ️ No matching ${matchingRel} found for ${relationshipType} at generation ${generation}`);
          }
          // Find relative's grandparents for parent relationships
          const relativeParents = Object.values(familyTree.people).filter(p => 
            p.children?.includes(relativeId)
          );
          if (relativeParents.length > 0) {
            const grandParent = relativeParents[0];
            const grandParents = Object.values(familyTree.people).filter(p => 
              p.children?.includes(grandParent.id)
            );
            if (grandParents.length > 0) {
              const maleGrandParent = grandParents.find(p => p.gender === 'male');
              const femaleGrandParent = grandParents.find(p => p.gender === 'female');
              if (maleGrandParent) fatherId = maleGrandParent.id;
              if (femaleGrandParent) motherId = femaleGrandParent.id;
            }
          }
        } else if (relationshipType === 'Great Grandfather' || relationshipType === 'Great Grandmother') {
          generation = relative.generation - 3;
          // Try to find the matching great grandparent to pair as spouse
          // Look for opposite gender great grandparent at the same generation who is not already married
          const oppositeGender = relationshipType === 'Great Grandfather' ? 'female' : 'male';
          const matchingRel = relationshipType === 'Great Grandfather' ? 'great grandmother' : 'great grandfather';
          
          // Debug: Log all potential matches
          const allGreatGrandparents = Object.values(familyTree.people).filter(p => {
            const pRel = (p.relationship || '').toLowerCase().trim();
            return pRel.includes('great grand');
          });
          console.log(`🔍 Looking for matching ${matchingRel} for ${relationshipType}:`, {
            generation,
            oppositeGender,
            availableGreatGrandparents: allGreatGrandparents.map(p => ({
              name: p.firstName + ' ' + p.lastName,
              relationship: p.relationship,
              gender: p.gender,
              generation: p.generation,
              hasSpouse: !!p.spouse
            }))
          });
          
          // Smart matching: prioritize couples that share children, then same last name
          // This prevents incorrect cross-family pairings (e.g., Krishna A with Sita B)
          // Note: We're adding a new person, so we check if existing great grandparents match
          const newPersonLastName = lastName.trim(); // The person we're adding
          
          const matchingGreatGrandparent = Object.values(familyTree.people).find(p => {
            const pRel = (p.relationship || '').toLowerCase().trim();
            const isMatchingRel = pRel === matchingRel.toLowerCase();
            const isOppositeGender = p.gender === oppositeGender;
            const isSameGeneration = p.generation === generation;
            const notMarried = !p.spouse;
            
            if (!isMatchingRel || !isOppositeGender || !isSameGeneration || !notMarried) {
              return false;
            }
            
            // Priority 1: Check if they share children - strongest indicator of a couple
            // If the relative (person we're adding relative to) is a child of this great grandparent,
            // and we're adding the spouse, they should be paired
            const relativePerson = familyTree.people[relativeId];
            if (relativePerson) {
              const pChildren = p.children || [];
              const isRelativeAChild = pChildren.includes(relativeId);
              
              if (isRelativeAChild) {
                console.log(`  ✅ Found matching great grandparent - relative ${relativePerson.firstName} is their child: ${p.firstName} ${p.lastName}`);
                return true;
              }
              
              // Also check if they share any children
              const relativeChildren = relativePerson.children || [];
              const shareChildren = relativeChildren.some(childId => pChildren.includes(childId));
              
              if (shareChildren) {
                console.log(`  ✅ Found matching great grandparent with shared children: ${p.firstName} ${p.lastName}`);
                return true;
              }
            }
            
            // Priority 2: Check last name - if they have the same last name, they're likely a couple
            // This is especially useful when children haven't been added yet
            // Compare the NEW person's last name with the existing person's last name
            const pLastName = (p.lastName || '').trim();
            const sameLastName = newPersonLastName && pLastName && newPersonLastName === pLastName;
            
            if (sameLastName) {
              console.log(`  ✅ Found matching great grandparent with same last name (${newPersonLastName}): ${p.firstName} ${p.lastName}`);
              return true;
            }
            
            // Don't auto-match if we don't have strong evidence (shared children or same last name)
            // This prevents incorrect cross-family pairings (e.g., Krishna A with Sita B)
            if (pRel.includes('great grand')) {
              console.log(`  ⚠️ Skipping ${p.firstName} ${p.lastName} - no shared children or same last name (${pLastName} vs ${newPersonLastName}, might be from different family)`);
            }
            
            return false;
          });
          
          if (matchingGreatGrandparent) {
            // Found matching great grandparent - they should be spouses
            spouseId = matchingGreatGrandparent.id;
            console.log(`✅ Auto-pairing great grandparents: ${relationshipType} with ${matchingGreatGrandparent.firstName} ${matchingGreatGrandparent.lastName}`);
          } else {
            console.log(`ℹ️ No matching ${matchingRel} found for ${relationshipType} at generation ${generation}`);
          }
        } else if (relationshipType === 'Son' || relationshipType === 'Daughter') {
          generation = relative.generation + 1;
          if (relative.gender === 'male') {
            fatherId = relativeId;
            const spouse = getSpouse(relativeId);
            if (spouse) {
              motherId = spouse.id;
            }
          } else {
            motherId = relativeId;
            const spouse = getSpouse(relativeId);
            if (spouse) {
              fatherId = spouse.id;
            }
          }
        } else if (relationshipType === 'Grandson' || relationshipType === 'Granddaughter') {
          generation = relative.generation + 2;
          // Find relative's children to determine parents
          const relativeChildren = Object.values(familyTree.people).filter(p => {
            const pFather = p.children?.some(c => {
              const child = familyTree.people[c];
              return child && (child.children?.includes(relativeId) || c === relativeId);
            });
            return pFather;
          });
          // If relative has children, this person is a grandchild of relative
          // Find the child who would be the parent
          const potentialParent = Object.values(familyTree.people).find(p => 
            p.children?.includes(relativeId) || 
            (relative.children && relative.children.includes(p.id))
          );
          if (potentialParent) {
            if (potentialParent.gender === 'male') {
              fatherId = potentialParent.id;
              const spouse = getSpouse(potentialParent.id);
              if (spouse) motherId = spouse.id;
            } else {
              motherId = potentialParent.id;
              const spouse = getSpouse(potentialParent.id);
              if (spouse) fatherId = spouse.id;
            }
          }
        } else if (relationshipType === 'Uncle' || relationshipType === 'Aunt') {
          // Uncle/Aunt is sibling of the selected relative's parent
          // If relative is a child, uncle/aunt is sibling of that child's parent
          // If relative is a parent, uncle/aunt is sibling of that parent
          // Find relative's parents to determine uncle/aunt's parents (same as relative's parents)
          const relativeParents = Object.values(familyTree.people).filter(p => 
            p.children?.includes(relativeId)
          );
          if (relativeParents.length > 0) {
            // Relative has parents, so uncle/aunt shares those same parents
            generation = relativeParents[0].generation;
            const maleParent = relativeParents.find(p => p.gender === 'male');
            const femaleParent = relativeParents.find(p => p.gender === 'female');
            if (maleParent) fatherId = maleParent.id;
            if (femaleParent) motherId = femaleParent.id;
          } else {
            // If relative doesn't have parents, uncle/aunt is at same generation as relative
            // This means they're siblings
            generation = relative.generation;
          }
        } else if (relationshipType === 'Nephew' || relationshipType === 'Niece') {
          // Nephew/Niece is child of sibling, so one generation below uncle/aunt
          // Find relative's children to determine generation
          generation = relative.generation + 1;
          // Find relative's sibling who would be the parent
          const relativeParents = Object.values(familyTree.people).filter(p => 
            p.children?.includes(relativeId)
          );
          if (relativeParents.length > 0) {
            const parent = relativeParents[0];
            // Find parent's siblings (other children of parent's parents)
            const grandParents = Object.values(familyTree.people).filter(p => 
              p.children?.includes(parent.id)
            );
            if (grandParents.length > 0) {
              const grandParent = grandParents[0];
              const siblings = Object.values(familyTree.people).filter(p => 
                grandParent.children?.includes(p.id) && p.id !== parent.id
              );
              if (siblings.length > 0) {
                const sibling = siblings[0];
                if (sibling.gender === 'male') {
                  fatherId = sibling.id;
                  const spouse = getSpouse(sibling.id);
                  if (spouse) motherId = spouse.id;
                } else {
                  motherId = sibling.id;
                  const spouse = getSpouse(sibling.id);
                  if (spouse) fatherId = spouse.id;
                }
              }
            }
          }
        } else if (relationshipType === 'Brother' || relationshipType === 'Sister') {
          // Sibling - same generation, same parents
          generation = relative.generation;
          const relativeParents = Object.values(familyTree.people).filter(p => 
            p.children?.includes(relativeId)
          );
          if (relativeParents.length > 0) {
            const maleParent = relativeParents.find(p => p.gender === 'male');
            const femaleParent = relativeParents.find(p => p.gender === 'female');
            if (maleParent) fatherId = maleParent.id;
            if (femaleParent) motherId = femaleParent.id;
          }
        } else if (relationshipType === 'Cousin') {
          // Cousin is child of uncle/aunt, so same generation as child of parent's sibling
          // Find relative's parents
          const relativeParents = Object.values(familyTree.people).filter(p => 
            p.children?.includes(relativeId)
          );
          if (relativeParents.length > 0) {
            generation = relative.generation;
            // Find parent's sibling (uncle/aunt)
            const parent = relativeParents[0];
            const grandParents = Object.values(familyTree.people).filter(p => 
              p.children?.includes(parent.id)
            );
            if (grandParents.length > 0) {
              const grandParent = grandParents[0];
              const unclesAunts = Object.values(familyTree.people).filter(p => 
                grandParent.children?.includes(p.id) && p.id !== parent.id
              );
              if (unclesAunts.length > 0) {
                const uncleAunt = unclesAunts[0];
                if (uncleAunt.gender === 'male') {
                  fatherId = uncleAunt.id;
                  const spouse = getSpouse(uncleAunt.id);
                  if (spouse) motherId = spouse.id;
                } else {
                  motherId = uncleAunt.id;
                  const spouse = getSpouse(uncleAunt.id);
                  if (spouse) fatherId = spouse.id;
                }
              }
            }
          } else {
            generation = relative.generation;
          }
        } else {
          // Default: Other - try to infer from context
          relationshipValue = 'Other';
          generation = relative.generation;
        }
      }

      // Create FormData for API
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', firstName);
      formDataToSend.append('lastName', lastName);
      if (formData.email) formDataToSend.append('email', formData.email);
      formDataToSend.append('gender', gender === 'male' ? 'Male' : 'Female');
      formDataToSend.append('dateOfBirth', dateOfBirth);
      formDataToSend.append('generation', generation.toString());
      formDataToSend.append('relationship', relationshipValue);
      
      if (fatherId) formDataToSend.append('fatherId', fatherId);
      if (motherId) formDataToSend.append('motherId', motherId);
      if (spouseId) formDataToSend.append('spouseId', spouseId);
      
      if (currentPhotoData) {
        // Convert base64 data URL to blob
        const base64Response = await fetch(currentPhotoData);
        const blob = await base64Response.blob();
        formDataToSend.append('photo', blob, 'photo.jpg');
        console.log('Photo blob created, size:', blob.size);
      }

      console.log('Sending member data with photo:', currentPhotoData ? 'Yes' : 'No');
      console.log('Sending relationships:', { fatherId, motherId, spouseId });
      const response = await api.post(`/members/${selectedFamilyId}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Member created, response:', response.data);
      console.log('Created member ID:', response.data?.data?._id);
      if (response.data?.data?.photo) {
        console.log('Photo URL from server:', response.data.data.photo);
      }

      // Optimistically add the new member to the tree immediately
      const newMemberId = response.data?.data?._id;
      if (newMemberId && response.data?.data) {
        const newMember = response.data.data;
        console.log('Optimistically adding new member to tree:', newMember.firstName, newMember.lastName);
        
        // Build the person object from the response
        const gender = newMember.gender?.toLowerCase() || 'male';
        const avatar = getAvatarForGender(gender);
        
        let dateOfBirthStr = '';
        if (newMember.dateOfBirth) {
          if (newMember.dateOfBirth instanceof Date) {
            dateOfBirthStr = newMember.dateOfBirth.toISOString().split('T')[0];
          } else if (typeof newMember.dateOfBirth === 'string') {
            dateOfBirthStr = newMember.dateOfBirth.split('T')[0];
          }
        }
        
        let photoUrl = null;
        if (newMember.photo && newMember.photo.trim() !== '') {
          const photo = newMember.photo.trim();
          if (photo.includes('localhost') || photo.startsWith('http://')) {
            const apiBaseUrl = getApiUrl().replace('/api', '');
            photoUrl = photo.replace(/http:\/\/[^/]+/, apiBaseUrl);
          } else {
            photoUrl = photo;
          }
        }
        
        const newPerson: Person = {
          id: newMemberId,
          firstName: newMember.firstName || '',
          lastName: newMember.lastName || '',
          gender: gender as 'male' | 'female',
          dateOfBirth: dateOfBirthStr,
          avatar,
          photo: photoUrl,
          generation: newMember.generation || 1,
          relationship: newMember.relationship || undefined,
          _id: newMemberId,
          children: [],
          spouse: spouseId || undefined
        };
        
        // Update tree state immediately with optimistic update
        setFamilyTree(prevTree => {
          const updatedPeople = { ...prevTree.people, [newMemberId]: newPerson };
          const updatedRelationships = [...prevTree.relationships];
          
          // Add relationships if they exist
          if (newMember.father?._id || newMember.father) {
            const fatherId = newMember.father?._id || newMember.father;
            if (updatedPeople[fatherId]) {
              updatedRelationships.push({
                id: `rel_${newMemberId}_father_${fatherId}`,
                person1Id: fatherId,
                person2Id: newMemberId,
                type: 'parent-child'
              });
              console.log(`Added father relationship: ${fatherId} -> ${newMemberId}`);
            }
          }
          if (newMember.mother?._id || newMember.mother) {
            const motherId = newMember.mother?._id || newMember.mother;
            if (updatedPeople[motherId]) {
              updatedRelationships.push({
                id: `rel_${newMemberId}_mother_${motherId}`,
                person1Id: motherId,
                person2Id: newMemberId,
                type: 'parent-child'
              });
              console.log(`Added mother relationship: ${motherId} -> ${newMemberId}`);
            }
          }
          if (newMember.spouse?._id || newMember.spouse || spouseId) {
            const spouseIdToUse = newMember.spouse?._id || newMember.spouse || spouseId;
            if (updatedPeople[spouseIdToUse]) {
              // Check for duplicate
              const existing = updatedRelationships.find(r => 
                r.type === 'spouse' && 
                ((r.person1Id === newMemberId && r.person2Id === spouseIdToUse) ||
                 (r.person1Id === spouseIdToUse && r.person2Id === newMemberId))
              );
              if (!existing) {
                updatedRelationships.push({
                  id: `rel_${newMemberId}_spouse_${spouseIdToUse}`,
                  person1Id: newMemberId,
                  person2Id: spouseIdToUse,
                  type: 'spouse'
                });
                // Set spouse property on both Person objects
                updatedPeople[newMemberId] = {
                  ...updatedPeople[newMemberId],
                  spouse: spouseIdToUse
                };
                if (updatedPeople[spouseIdToUse]) {
                  updatedPeople[spouseIdToUse] = {
                    ...updatedPeople[spouseIdToUse],
                    spouse: newMemberId
                  };
                }
                console.log(`Added spouse relationship: ${newMemberId} <-> ${spouseIdToUse}`);
              } else {
                // Still set spouse property even if relationship already exists
                updatedPeople[newMemberId] = {
                  ...updatedPeople[newMemberId],
                  spouse: spouseIdToUse
                };
                if (updatedPeople[spouseIdToUse]) {
                  updatedPeople[spouseIdToUse] = {
                    ...updatedPeople[spouseIdToUse],
                    spouse: newMemberId
                  };
                }
              }
            }
          }
          
          // Update root person if needed
          // Only change root if:
          // 1. No root exists, OR
          // 2. New member is generation 0 and current root is not, OR
          // 3. New member has lower generation than current root (but don't override gen 0)
          let newRootPersonId = prevTree.rootPersonId;
          if (!newRootPersonId) {
            newRootPersonId = newMemberId;
          } else {
            const currentRootGen = updatedPeople[newRootPersonId]?.generation || 999;
            const newMemberGen = newPerson.generation || 1;
            // Prefer generation 0 as root
            if (newMemberGen === 0 && currentRootGen !== 0) {
              newRootPersonId = newMemberId;
            } else if (newMemberGen < currentRootGen && currentRootGen !== 0) {
              newRootPersonId = newMemberId;
            }
            // Otherwise keep existing root
          }
          
          console.log('Optimistically updated tree. Total people:', Object.keys(updatedPeople).length);
          return {
            people: updatedPeople,
            relationships: updatedRelationships,
            rootPersonId: newRootPersonId
          };
        });
      }
      
      // Use the message from server which includes clear email status
      const successMessage = response.data?.message || `${firstName} ${lastName} added successfully!`;
      alert(successMessage);
      clearForm();
      
      // Then refresh from server to ensure consistency
      // Wait a bit longer to ensure server has processed the member
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Refreshing tree from server...');
      await fetchMembersAndBuildTree();
      
      // Force a re-render after refresh
      setTreeRenderKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error adding person:', error);
      alert(error.response?.data?.message || 'Error adding person. Please try again.');
    }
  };

  const clearForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      gender: 'male',
      dateOfBirth: '',
      relationshipType: 'Root Person (Start Here)',
      relativeId: ''
    });
    setCurrentPhotoData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getSpouse = (personId: string): Person | null => {
    const rel = familyTree.relationships.find(r => 
      r.type === 'spouse' && (r.person1Id === personId || r.person2Id === personId)
    );
    if (rel) {
      const spouseId = rel.person1Id === personId ? rel.person2Id : rel.person1Id;
      return familyTree.people[spouseId] || null;
    }
    return null;
  };

  const getChildren = (personId: string): Person[] => {
    return familyTree.relationships
      .filter(r => r.type === 'parent-child' && r.person1Id === personId)
      .map(r => familyTree.people[r.person2Id])
      .filter(Boolean);
  };

  const getParents = (personId: string): Person[] => {
    return familyTree.relationships
      .filter(r => r.type === 'parent-child' && r.person2Id === personId)
      .map(r => familyTree.people[r.person1Id])
      .filter(Boolean);
  };

  const showPersonModalHandler = (personId: string) => {
    setSelectedPersonId(personId);
    setModalPerson(familyTree.people[personId]);
    setShowPersonModal(true);
  };

  const closeModal = () => {
    setShowPersonModal(false);
    setSelectedPersonId(null);
    setModalPerson(null);
  };

  const deletePerson = async () => {
    if (!selectedPersonId || !selectedFamilyId) return;
    
    if (!window.confirm('Are you sure you want to delete this person?')) return;

    try {
      await api.delete(`/members/${selectedFamilyId}/${selectedPersonId}`);
      closeModal();
      fetchMembersAndBuildTree();
    } catch (error) {
      console.error('Error deleting person:', error);
      alert('Error deleting person');
    }
  };


  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    // Trigger D3 tree reset by incrementing resetTrigger
    setResetTrigger(prev => prev + 1);
  };

  const exportTree = () => {
    const dataStr = JSON.stringify(familyTree, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'family-tree.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTree = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedFamilyId) {
      alert('Please select a family first before importing.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        
        // Validate imported data structure
        if (!imported.people || typeof imported.people !== 'object') {
          alert('Invalid file format. Expected format: { people: {...}, relationships: [...] }');
          e.target.value = '';
          return;
        }

        // Show loading message
        const loadingMessage = 'Importing family tree... This may take a moment.';
        alert(loadingMessage);

        // Step 0: Fetch existing members to avoid duplicates
        let existingMembers: any[] = [];
        try {
          const existingResponse = await api.get(`/members/${selectedFamilyId}`);
          if (existingResponse.data.success && existingResponse.data.data) {
            existingMembers = Array.isArray(existingResponse.data.data) 
              ? existingResponse.data.data 
              : [existingResponse.data.data];
          }
        } catch (error) {
          console.warn('Could not fetch existing members:', error);
        }

        // Create a map of existing members by name (firstName + lastName)
        const existingMembersMap: { [key: string]: string } = {};
        existingMembers.forEach((member: any) => {
          const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
          if (fullName) {
            existingMembersMap[fullName] = member._id || member.id;
          }
        });

        // Step 1: Convert people to members and create them (or use existing)
        const people = imported.people;
        const relationships = imported.relationships || [];
        const personIdToMemberId: { [key: string]: string } = {};
        const createdMembers: any[] = [];
        const updatedMembers: any[] = [];
        const errors: string[] = [];

        // Sort people by generation (parents first, then children)
        const sortedPeople = Object.values(people).sort((a: any, b: any) => {
          const genA = a.generation || 0;
          const genB = b.generation || 0;
          return genA - genB;
        });

        // Helper function to map relationship to valid enum value
        const mapRelationship = (rel: string | undefined): string => {
          if (!rel) return 'Other';
          const relLower = rel.toLowerCase().trim();
          const relationshipMap: { [key: string]: string } = {
            'great grandfather': 'Great Grandfather',
            'great grandmother': 'Great Grandmother',
            'grandfather': 'Grandfather',
            'grandmother': 'Grandmother',
            'father': 'Father',
            'mother': 'Mother',
            'uncle': 'Uncle',
            'aunt': 'Aunt',
            'son': 'Son',
            'son-in-law': 'Son', // Map son-in-law to Son
            'daughter': 'Daughter',
            'daughter-in-law': 'Daughter', // Map daughter-in-law to Daughter
            'brother': 'Brother',
            'sister': 'Sister',
            'cousin': 'Cousin',
            'grandson': 'Grandson',
            'granddaughter': 'Granddaughter',
            'nephew': 'Nephew',
            'niece': 'Niece',
            'spouse': 'Spouse',
            'wife': 'Spouse', // Map wife to Spouse
            'husband': 'Spouse', // Map husband to Spouse
            'other': 'Other'
          };
          return relationshipMap[relLower] || 'Other';
        };

        // Helper function to format date
        const formatDate = (dateStr: string | null | undefined): string | null => {
          if (!dateStr) return null;
          try {
            // If it's already a valid date string, return as is
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          } catch {
            return null;
          }
        };

        // Create members one by one (or use existing)
        for (const person of sortedPeople as Person[]) {
          try {
            // Validate required fields
            if (!person.firstName || person.firstName.trim() === '') {
              errors.push(`Skipped member: Missing first name for person ID ${person.id}`);
              continue;
            }

            const firstName = person.firstName.trim();
            const lastName = person.lastName ? person.lastName.trim() : '';
            const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
            
            // Check if member already exists
            let memberId: string | null = null;
            if (existingMembersMap[fullName]) {
              // Use existing member
              memberId = existingMembersMap[fullName];
              if (memberId) {
                personIdToMemberId[person.id] = memberId;
                updatedMembers.push({ id: memberId, name: `${firstName} ${lastName}` });
                console.log(`✅ Using existing member: ${firstName} ${lastName} (ID: ${memberId})`);
              } else {
                errors.push(`Failed to get existing member ID for: ${firstName} ${lastName}`);
                continue;
              }
            } else {
              // Create new member
              const memberData: any = {
                firstName,
                lastName,
                email: person.email ? person.email.trim() : '',
                gender: person.gender === 'male' ? 'Male' : person.gender === 'female' ? 'Female' : 'Other',
                dateOfBirth: formatDate(person.dateOfBirth),
                relationship: mapRelationship(person.relationship),
                generation: person.generation || 0,
                role: 'Member'
              };

              const response = await api.post(`/members/${selectedFamilyId}`, memberData);
              
              if (response.data.success && response.data.data) {
                memberId = response.data.data._id || response.data.data.id;
                personIdToMemberId[person.id] = memberId;
                createdMembers.push(response.data.data);
                // Add to existing map to avoid duplicates in same import
                existingMembersMap[fullName] = memberId;
              } else {
                const personName = `${firstName} ${lastName}`.trim() || 'Unknown';
                errors.push(`Failed to create member: ${personName} - Invalid response from server`);
              }
            }
          } catch (error: any) {
            const personName = `${person.firstName} ${person.lastName}`.trim() || 'Unknown';
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            errors.push(`Failed to create/update member: ${personName} - ${errorMessage}`);
            console.error(`Error processing member ${personName}:`, error);
            if (error.response?.data) {
              console.error(`Error response data:`, error.response.data);
            }
          }
        }

        // Step 2: Update relationships (father, mother, spouse)
        // First pass: collect all relationship data
        const relationshipUpdates: { [memberId: string]: { fatherId?: string; motherId?: string; spouseId?: string } } = {};

        for (const personId in people) {
          const person = people[personId];
          const memberId = personIdToMemberId[personId];
          
          if (!memberId) continue;

          // Find spouse relationship
          const spouseRelationship = relationships.find(
            r => (r.type === 'spouse' && r.person1Id === personId) || 
                 (r.type === 'spouse' && r.person2Id === personId)
          );
          
          let spouseId = null;
          if (spouseRelationship) {
            const spousePersonId = spouseRelationship.person1Id === personId 
              ? spouseRelationship.person2Id 
              : spouseRelationship.person1Id;
            spouseId = personIdToMemberId[spousePersonId] || null;
          }

          // Find parent-child relationships to determine father and mother
          const parentChildRels = relationships.filter(
            r => r.type === 'parent-child' && r.person2Id === personId
          );
          
          let fatherId = null;
          let motherId = null;
          
          for (const rel of parentChildRels) {
            const parentPerson = people[rel.person1Id];
            if (parentPerson) {
              if (parentPerson.gender === 'male') {
                fatherId = personIdToMemberId[rel.person1Id] || null;
              } else if (parentPerson.gender === 'female') {
                motherId = personIdToMemberId[rel.person1Id] || null;
              }
            }
          }

          // Store relationship updates
          if (fatherId || motherId || spouseId) {
            relationshipUpdates[memberId] = {};
            if (fatherId) relationshipUpdates[memberId].fatherId = fatherId;
            if (motherId) relationshipUpdates[memberId].motherId = motherId;
            if (spouseId) relationshipUpdates[memberId].spouseId = spouseId;
          }
        }

        // Second pass: apply relationship updates
        for (const memberId in relationshipUpdates) {
          try {
            const updateData = relationshipUpdates[memberId];
            
            // Validate that all referenced members exist in our mapping
            // If they're in personIdToMemberId values, they should be valid
            const allValidMemberIds = new Set(Object.values(personIdToMemberId));
            const invalidRefs: string[] = [];
            
            if (updateData.fatherId && !allValidMemberIds.has(updateData.fatherId)) {
              invalidRefs.push(`father (${updateData.fatherId})`);
            }
            if (updateData.motherId && !allValidMemberIds.has(updateData.motherId)) {
              invalidRefs.push(`mother (${updateData.motherId})`);
            }
            if (updateData.spouseId && !allValidMemberIds.has(updateData.spouseId)) {
              invalidRefs.push(`spouse (${updateData.spouseId})`);
            }
            
            if (invalidRefs.length > 0) {
              const personId = Object.keys(personIdToMemberId).find(id => personIdToMemberId[id] === memberId);
              const person = personId ? people[personId] : null;
              const personName = person ? `${person.firstName} ${person.lastName}`.trim() || 'Unknown' : 'Unknown';
              console.warn(`⚠️ Skipping relationship update for ${personName}: Invalid references - ${invalidRefs.join(', ')}`);
              // Don't add to errors - this is expected when some members weren't created
              continue;
            }
            
            await api.put(`/members/${selectedFamilyId}/${memberId}`, updateData);
            
            // Handle bidirectional spouse relationship
            if (updateData.spouseId) {
              try {
                // Update the spouse's spouse field to point back
                await api.put(`/members/${selectedFamilyId}/${updateData.spouseId}`, { spouseId: memberId });
              } catch (spouseError: any) {
                const personId = Object.keys(personIdToMemberId).find(id => personIdToMemberId[id] === memberId);
                const person = personId ? people[personId] : null;
                const personName = person ? `${person.firstName} ${person.lastName}`.trim() || 'Unknown' : 'Unknown';
                console.warn(`⚠️ Failed to update bidirectional spouse relationship for ${personName}:`, spouseError);
                // Don't add to errors - this is a non-critical update
              }
            }
          } catch (error: any) {
            const personId = Object.keys(personIdToMemberId).find(id => personIdToMemberId[id] === memberId);
            const person = personId ? people[personId] : null;
            const personName = person ? `${person.firstName} ${person.lastName}`.trim() || 'Unknown' : 'Unknown';
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            errors.push(`Failed to update relationships for: ${personName} - ${errorMessage}`);
            console.error(`Error updating relationships for ${personName}:`, error);
            if (error.response?.data) {
              console.error(`Error response data:`, error.response.data);
            }
          }
        }

        // Step 3: Reload the tree from database
        await fetchMembersAndBuildTree();

        // Step 4: Show success/error message
        const successCount = createdMembers.length;
        const updatedCount = updatedMembers.length;
        const errorCount = errors.length;
        
        if (errorCount === 0) {
          let message = `✅ Family tree imported successfully!\n\n`;
          if (successCount > 0) {
            message += `Created: ${successCount} new member(s)\n`;
          }
          if (updatedCount > 0) {
            message += `Used existing: ${updatedCount} member(s)\n`;
          }
          message += `Total processed: ${successCount + updatedCount} member(s)`;
          alert(message);
        } else {
          let message = `⚠️ Import completed with some errors:\n\n`;
          if (successCount > 0) {
            message += `✅ Created: ${successCount} new member(s)\n`;
          }
          if (updatedCount > 0) {
            message += `✅ Used existing: ${updatedCount} member(s)\n`;
          }
          message += `❌ Errors: ${errorCount}\n\nCheck console for details.`;
          alert(message);
          console.error('Import errors:', errors);
        }

        // Clear file input
        e.target.value = '';
      } catch (error: any) {
        console.error('Error importing file:', error);
        alert(`Error importing file: ${error.message}\n\nPlease check the file format.`);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    
    try {
      const response = await api.get(`/families/template/download?familyId=${selectedFamilyId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'family-members-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template');
    }
  };

  const handleExportExcel = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    try {
      const response = await api.get(`/families/${selectedFamilyId}/export-excel`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `family-tree-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error exporting to Excel');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/families/${selectedFamilyId}/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(response.data.message || 'Members imported successfully!');
      // Refresh families and members after import
      await fetchFamilies();
      await fetchMembersAndBuildTree();
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      alert(error.response?.data?.message || 'Error importing Excel file');
    }

    // Reset file input
    e.target.value = '';
  };

  const renderPersonCard = (person: Person) => {
    const age = calculateAge(person.dateOfBirth);
    
    // Construct proper photo URL
    const getPhotoUrl = () => {
      if (!person.photo || person.photo.trim() === '') return null;
      
      const photo = person.photo.trim();
      
      // If already a full URL (http/https), use as-is (but fix localhost or HTTP)
      if (photo.startsWith('http://') || photo.startsWith('https://')) {
        if (photo.includes('localhost') || photo.startsWith('http://')) {
          const apiBaseUrl = getApiUrl().replace('/api', '');
          try {
            const url = new URL(photo);
            return `${apiBaseUrl}${url.pathname}`;
          } catch {
            return photo.replace(/http:\/\/[^/]+/, apiBaseUrl);
          }
        }
        return photo;
      }
      
      // If it's a filename or relative path, construct full URL
      const apiBaseUrl = getApiUrl().replace('/api', '');
      
      // Handle different path formats
      if (photo.startsWith('/uploads/')) {
        return `${apiBaseUrl}${photo}`;
      } else if (photo.startsWith('uploads/')) {
        return `${apiBaseUrl}/${photo}`;
      } else if (photo.startsWith('/')) {
        return `${apiBaseUrl}${photo}`;
      } else {
        // Just filename, add /uploads/ prefix
        return `${apiBaseUrl}/uploads/${photo}`;
      }
    };
    
    const photoUrl = getPhotoUrl();
    const hasPhoto = photoUrl !== null;
    
    const photoOrAvatar = hasPhoto 
      ? <img 
          src={photoUrl} 
          className="person-photo" 
          alt={person.firstName}
          onError={(e) => {
            // If image fails to load, try alternative URLs
            const img = e.currentTarget;
            const triedUrls = img.dataset.triedUrls ? JSON.parse(img.dataset.triedUrls) : [];
            const originalSrc = img.src;
            
            if (!triedUrls.includes(originalSrc)) {
              triedUrls.push(originalSrc);
            }
            
            console.error('Photo load error for:', person.firstName, 'URL:', originalSrc);
            
            // Try alternative URL formats
            const apiBaseUrl = getApiUrl().replace('/api', '');
            const photo = person.photo || '';
            let justFilename = photo;
            if (photo.includes('/')) {
              justFilename = photo.split('/').pop() || photo;
            }
            
            const alternatives = [
              `${apiBaseUrl}/uploads/${justFilename}`,
              photo.startsWith('http') ? (() => {
                try {
                  const url = new URL(photo);
                  return `${apiBaseUrl}${url.pathname}`;
                } catch {
                  return null;
                }
              })() : null,
              photo.startsWith('/') ? `${apiBaseUrl}${photo}` : (photo ? `${apiBaseUrl}/${photo}` : null)
            ].filter(url => url && !triedUrls.includes(url));
            
            const nextUrl = alternatives.find(url => !triedUrls.includes(url));
            
            if (nextUrl) {
              console.log('Trying alternative photo URL:', nextUrl);
              triedUrls.push(nextUrl);
              img.dataset.triedUrls = JSON.stringify(triedUrls);
              img.src = nextUrl;
            } else {
              // All alternatives failed, hide image and show avatar
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent && !parent.querySelector('.avatar')) {
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'avatar';
                avatarDiv.textContent = person.avatar;
                parent.insertBefore(avatarDiv, img);
              }
            }
          }}
          onLoad={() => {
            console.log('Photo loaded successfully for:', person.firstName);
          }}
        /> 
      : <div className="avatar">{person.avatar}</div>;
    
    return (
      <div 
        className={`person-card ${person.gender}`}
        onClick={() => showPersonModalHandler(person.id)}
      >
        {photoOrAvatar}
        <div className="person-name">{person.firstName} {person.lastName}</div>
        <div className="person-info">Age: {age}</div>
        {person.dateOfBirth && (
          <div className="person-info">{new Date(person.dateOfBirth).toLocaleDateString()}</div>
        )}
      </div>
    );
  };

  const renderHierarchicalTree = (personId: string, visited: Set<string>, renderedSet: Set<string>): React.ReactNode => {
    if (visited.has(personId)) return null;
    visited.add(personId);
    renderedSet.add(personId);
    
    const person = familyTree.people[personId];
    if (!person) return null;
    
    const spouse = getSpouse(personId);
    let children = getChildren(personId);
    
    // Track if spouse was just visited in this call
    let spouseJustVisited = false;
    
    // If spouse exists, get their children too and merge
    if (spouse && !visited.has(spouse.id)) {
      visited.add(spouse.id);
      renderedSet.add(spouse.id);
      spouseJustVisited = true;
      const spouseChildren = getChildren(spouse.id);
      spouseChildren.forEach(child => {
        if (!children.find(c => c.id === child.id)) {
          children.push(child);
        }
      });
    }
    
    // Group children by their spouses - create couple groups
    const childrenWithSpouses: { child: Person; spouse: Person | null }[] = [];
    const childrenWithoutSpouses: Person[] = [];
    
    children.forEach(child => {
      const childSpouse = getSpouse(child.id);
      if (childSpouse && !visited.has(childSpouse.id)) {
        childrenWithSpouses.push({ child, spouse: childSpouse });
        visited.add(childSpouse.id);
        renderedSet.add(childSpouse.id);
      } else {
        childrenWithoutSpouses.push(child);
      }
    });

    return (
      <div className="tree-node" key={personId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Render couple (Father and Mother) in same row with love symbol and arrows */}
        <div className="node-parents" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          {spouse && spouseJustVisited ? (
            <div className="couple-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', position: 'relative' }}>
              {renderPersonCard(person)}
              {/* Bidirectional arrow between spouses */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '25px',
                  height: '3px',
                  background: '#667eea',
                  position: 'relative'
                }}>
              <div style={{
                position: 'absolute',
                    left: '-6px',
                top: '50%',
                    transform: 'translateY(-50%)',
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '8px solid #667eea'
                  }}></div>
                </div>
                <div className="marriage-symbol" style={{ fontSize: '24px' }}>💑</div>
                <div style={{
                  width: '25px',
                  height: '3px',
                  background: '#667eea',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    right: '-6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '8px solid #667eea'
                  }}></div>
              </div>
              </div>
              {renderPersonCard(spouse)}
            </div>
          ) : (
            renderPersonCard(person)
          )}
        </div>

        {/* Render children below the couple */}
        {(childrenWithSpouses.length > 0 || childrenWithoutSpouses.length > 0) && (
          <>
            {/* Vertical connector from parents to children */}
            <div className="vertical-line" style={{ 
              width: '3px', 
              background: '#667eea', 
              height: '30px',
              margin: '10px auto',
              position: 'relative'
            }}>
              {/* Arrow pointing down */}
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '10px solid #667eea'
              }}></div>
          </div>

            {/* Horizontal connector line */}
            <div className="horizontal-line" style={{
              height: '3px',
              background: '#667eea',
                width: '100%',
              marginBottom: '20px',
              position: 'relative'
            }}></div>
            
            <div className="node-children" style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '40px', 
              justifyContent: 'center',
              alignItems: 'flex-start',
              position: 'relative'
            }}>
              {/* Render children with their spouses (couples) */}
              {childrenWithSpouses.map(({ child, spouse }, index) => (
                <div key={child.id} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  {/* Vertical connector from horizontal line to child */}
                  <div style={{
                    width: '3px',
                    background: '#667eea',
                    height: '20px',
                    marginBottom: '5px',
                    position: 'relative'
                  }}>
                    {/* Arrow pointing down to child */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '10px solid #667eea'
                    }}></div>
        </div>

                  {/* Child with spouse in same row */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px', 
                    marginBottom: '20px',
                    position: 'relative'
                  }}>
                    {renderPersonCard(child)}
                    {spouse && (
                      <>
                        {/* Horizontal arrow between child and spouse */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <div style={{
                            width: '20px',
                            height: '3px',
                            background: '#667eea',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              right: '-8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 0,
                              height: 0,
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderLeft: '8px solid #667eea'
                            }}></div>
          </div>
                          <div style={{ fontSize: '20px' }}>💑</div>
                          <div style={{
                            width: '20px',
                            height: '3px',
                            background: '#667eea',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              left: '-8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 0,
                              height: 0,
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderRight: '8px solid #667eea'
                            }}></div>
          </div>
        </div>
                        {renderPersonCard(spouse)}
                      </>
                    )}
        </div>
                  {/* Recursively render grandchildren */}
                  {renderHierarchicalTree(child.id, new Set(visited), renderedSet)}
          </div>
              ))}
              
              {/* Render children without spouses */}
              {childrenWithoutSpouses.map(child => (
                <div key={child.id} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  {/* Vertical connector from horizontal line to child */}
                  <div style={{
                    width: '3px',
                    background: '#667eea',
                    height: '20px',
                    marginBottom: '5px',
                    position: 'relative'
                  }}>
                    {/* Arrow pointing down to child */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '10px solid #667eea'
                    }}></div>
          </div>

                  {renderPersonCard(child)}
                  {/* Recursively render grandchildren */}
                  {renderHierarchicalTree(child.id, new Set(visited), renderedSet)}
                </div>
              ))}
          </div>
          </>
        )}
        </div>
    );
  };

  const renderTree = () => {
    console.log('renderTree called, people count:', Object.keys(familyTree.people).length);
    console.log('familyTree state:', {
      peopleCount: Object.keys(familyTree.people).length,
      relationshipsCount: familyTree.relationships.length,
      rootPersonId: familyTree.rootPersonId
    });
    
    if (Object.keys(familyTree.people).length === 0) {
      console.log('No people in tree, showing empty state');
    return (
        <div className="empty-state">
          <div className="empty-icon">👨‍👩‍👧‍👦</div>
          <h3>Start Building Your Family Tree</h3>
          <p>Add the root person (yourself or a parent) to begin</p>
        </div>
      );
    }

    if (!d3TreeData) {
        return (
        <div className="empty-state">
          <div className="empty-icon">👨‍👩‍👧‍👦</div>
          <h3>Building Family Tree...</h3>
          <p>Please wait while we organize your family tree</p>
          </div>
        );
      }

  return (
      <D3FamilyTree 
        data={d3TreeData} 
        allPeople={familyTree.people} // Pass ALL people data (including siblings, aunts, uncles, cousins)
        relationships={familyTree.relationships} // Pass ALL relationships to build children arrays
        width={1200} 
        height={800}
        zoomLevel={zoomLevel}
        resetTrigger={resetTrigger}
      />
    );
  };

  const totalMembers = Object.keys(familyTree.people).length;
  const generations = new Set(Object.values(familyTree.people).map(p => p.generation));
  const couples = familyTree.relationships.filter(r => r.type === 'spouse').length;

  const availablePeople = Object.values(familyTree.people);

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div className="family-tree-container">
        <header>
          <div className="family-tree-logo">
            <div className="logo-circle">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Orange circle background */}
                <circle cx="40" cy="40" r="40" fill="#FF6B35"/>
                {/* Top left figure (parent 1) */}
                <circle cx="28" cy="22" r="5" fill="white"/>
                <path d="M 28 27 Q 24 31 28 35 Q 32 31 28 27" fill="white"/>
                {/* Top right figure (parent 2) */}
                <circle cx="52" cy="22" r="5" fill="white"/>
                <path d="M 52 27 Q 48 31 52 35 Q 56 31 52 27" fill="white"/>
                {/* Horizontal line connecting parents */}
                <line x1="28" y1="35" x2="52" y2="35" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                {/* Vertical line from center to child */}
                <line x1="40" y1="35" x2="40" y2="45" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                {/* Bottom figure (child) */}
                <circle cx="40" cy="52" r="4.5" fill="white"/>
                <path d="M 40 56.5 Q 37 60 40 64 Q 43 60 40 56.5" fill="white"/>
              </svg>
            </div>
            <h1>Family Tree</h1>
          </div>
          <p>Build Your Family Tree Step by Step</p>
        </header>

        {/* Family Selector */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '20px',
          maxWidth: '1600px',
          margin: '0 auto 20px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          <label style={{ display: 'block', color: '#2c3e50', fontWeight: '600', marginBottom: '12px' }}>
            Select Family
          </label>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none',
              background: 'white',
              color: '#2c3e50'
            }}
          >
            <option value="">Select a family...</option>
            {families.map((family) => (
              <option key={family._id} value={family._id}>
                {family.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedFamilyId && (
          <div style={{
            background: 'white',
            padding: '60px',
            borderRadius: '15px',
            textAlign: 'center',
            maxWidth: '1600px',
            margin: '0 auto',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌳</div>
            <h3 style={{ fontSize: '20px', color: '#2c3e50', margin: '0 0 8px 0' }}>
              No family selected
            </h3>
            <p style={{ color: '#7f8c8d', margin: 0 }}>
              Please select a family to view and build your family tree
            </p>
          </div>
        )}

        {selectedFamilyId && (
        <div className="main-layout">
          {/* Left Panel: Add Members */}
          <div className="add-panel">
            <h3>Add Family Member</h3>
            
            <div className="form-group">
              <label>First Name:</label>
              <input 
                type="text" 
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
              />
      </div>

            <div className="form-group">
              <label>Last Name:</label>
              <input 
                type="text" 
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>

            <div className="form-group">
              <label>Gender:</label>
              <select 
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date of Birth:</label>
              <input 
                type="date" 
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
          </div>

            <div className="form-group">
              <label>Email (Optional - for notifications):</label>
              <input 
                type="email" 
                placeholder="member@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Choose Avatar:</label>
              <div className="avatar-selector">
                {['👨', '👩', '👴', '👵', '👦', '👧', '🧑', '👶'].map(avatar => (
                  <div
                    key={avatar}
                    className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    {avatar}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Upload Photo (Optional):</label>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              {currentPhotoData && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={currentPhotoData} 
                    alt="Preview" 
                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px' }}
                  />
        </div>
      )}
            </div>

            <div className="form-group">
              <label>Relationship Type:</label>
              <select 
                value={formData.relationshipType}
                onChange={handleRelationshipTypeChange}
              >
                {relationshipOptions.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>

            {formData.relationshipType !== 'Root Person (Start Here)' && (
              <div className="form-group">
                <label>Select Relative:</label>
                <select 
                  value={formData.relativeId}
                  onChange={(e) => setFormData({ ...formData, relativeId: e.target.value })}
                >
                  <option value="">Select a relative...</option>
                  {availablePeople.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button className="btn-primary" onClick={addPerson}>Add Person</button>
            <button className="btn-secondary" onClick={clearForm}>Clear Form</button>
            
            <div className="flow-guide">
              <h4>📋 Building Flow:</h4>
              <ol>
                <li>Add <strong>Father & Mother</strong> (Root)</li>
                <li>Add <strong>Spouse</strong> to Father/Mother</li>
                <li>Add <strong>Children</strong> to couple</li>
                <li>Add <strong>Spouse</strong> to children</li>
                <li>Add <strong>Grandchildren</strong></li>
                <li>Continue the pattern ⬇️</li>
              </ol>
            </div>
            
            <button className="btn-export" onClick={exportTree}>💾 Export Tree (JSON)</button>
            <button className="btn-import" onClick={() => importFileRef.current?.click()}>
              📂 Import Tree (JSON)
            </button>
            <input 
              type="file" 
              ref={importFileRef}
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={importTree}
            />
            
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
              <h4 style={{ color: '#667eea', marginBottom: '15px', fontSize: '1em' }}>📊 Excel Operations</h4>
              <button
                className="btn-export" 
                onClick={handleDownloadTemplate}
                style={{ marginBottom: '10px' }}
              >
                <FiFile style={{ marginRight: '8px' }} /> Download Template
              </button>
              <button 
                className="btn-import" 
                onClick={() => excelImportRef.current?.click()}
                style={{ marginBottom: '10px' }}
              >
                <FaUpload style={{ marginRight: '8px' }} /> Import Excel
              </button>
              <button 
                className="btn-export" 
                onClick={handleExportExcel}
              >
                <FaDownload style={{ marginRight: '8px' }} /> Export Excel
              </button>
              <input 
                type="file" 
                ref={excelImportRef}
                accept=".xlsx,.xls" 
                style={{ display: 'none' }} 
                onChange={handleImportExcel}
              />
            </div>
          </div>

          {/* Right Panel: Tree Visualization */}
          <div className="tree-panel">
            <div className="tree-controls">
              <button onClick={zoomIn}>🔍 Zoom In</button>
              <button onClick={zoomOut}>🔍 Zoom Out</button>
              <button onClick={resetZoom}>↺ Reset</button>
            </div>
            
            <div className="tree-container" ref={treeViewRef} key={`tree-${treeRenderKey}-${Object.keys(familyTree.people).length}-${familyTree.relationships.length}`}>
              {renderTree()}
            </div>

            <div className="stats-panel">
              <div className="stat-box">
                <span className="stat-label">Total Members</span>
                <span className="stat-value">{totalMembers}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Generations</span>
                <span className="stat-value">{generations.size}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Couples</span>
                <span className="stat-value">{couples}</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Person Details Modal */}
      {showPersonModal && modalPerson && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            <div style={{ textAlign: 'center' }}>
              {modalPerson.photo ? (
                <img 
                  src={modalPerson.photo} 
                  alt={modalPerson.firstName}
                  style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '15px' }}
                />
              ) : (
                <div style={{ fontSize: '5em' }}>{modalPerson.avatar}</div>
              )}
              <h2>{modalPerson.firstName} {modalPerson.lastName}</h2>
              <p><strong>Gender:</strong> {modalPerson.gender}</p>
              <p><strong>Age:</strong> {calculateAge(modalPerson.dateOfBirth)} years</p>
              <p><strong>Born:</strong> {new Date(modalPerson.dateOfBirth).toLocaleDateString()}</p>
              <p><strong>Generation:</strong> {modalPerson.generation}</p>
              
              {getSpouse(modalPerson.id) && (
                <p><strong>Spouse:</strong> {getSpouse(modalPerson.id)?.firstName} {getSpouse(modalPerson.id)?.lastName}</p>
              )}
              
              {getParents(modalPerson.id).length > 0 && (
                <p><strong>Parents:</strong> {getParents(modalPerson.id).map(p => p.firstName + ' ' + p.lastName).join(', ')}</p>
              )}
              
              {getChildren(modalPerson.id).length > 0 && (
                <p><strong>Children:</strong> {getChildren(modalPerson.id).map(c => c.firstName + ' ' + c.lastName).join(', ')}</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-danger" onClick={deletePerson}>Delete Person</button>
              <button className="btn-secondary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FamilyTree;
