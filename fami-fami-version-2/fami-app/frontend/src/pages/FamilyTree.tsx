import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import api, { getApiUrl } from '../config/api';
import { FaDownload, FaUpload, FaTree } from 'react-icons/fa';
import { FiFile } from 'react-icons/fi';
import { colors } from '../styles/colors';
import './FamilyTree.css';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  avatar: string;
  photo: string | null;
  generation: number;
  _id?: string; // API ID
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
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'male' as 'male' | 'female',
    dateOfBirth: '',
    relationshipType: 'root' as 'root' | 'parent' | 'spouse' | 'child',
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

    // Include ALL members in the tree - don't filter them out
    // This ensures all added members are visible, even if they don't have relationships yet
    const membersWithRelationships = members.filter((member) => {
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

    console.log(`Including all ${membersWithRelationships.length} members in the tree`);

    // Deduplicate members by ID to prevent duplicates
    const uniqueMembers = new Map();
    membersWithRelationships.forEach((member) => {
      const memberId = member._id?.toString() || member.id?.toString();
      if (memberId && !uniqueMembers.has(memberId)) {
        uniqueMembers.set(memberId, member);
      } else if (memberId) {
        console.warn('⚠️ Duplicate member detected:', member.firstName, member.lastName, 'ID:', memberId);
      }
    });
    
    console.log(`Deduplicated ${membersWithRelationships.length} members to ${uniqueMembers.size} unique members`);

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
          _id: member._id
        };
      } else {
        console.warn('⚠️ Skipping duplicate person:', member.firstName, member.lastName, 'ID:', personId);
        return; // Skip processing this duplicate member
      }

      // Set root person (lowest generation, prefer generation 0)
      // Only update root if:
      // 1. No root exists yet, OR
      // 2. Current member has generation 0 and existing root doesn't, OR
      // 3. Current member has lower generation than existing root
      if (!rootPersonId) {
        rootPersonId = personId;
      } else {
        const currentRootGen = people[rootPersonId]?.generation || 999;
        const memberGen = member.generation || 1;
        // Prefer generation 0 as root, otherwise lowest generation
        if (memberGen === 0 && currentRootGen !== 0) {
          rootPersonId = personId;
        } else if (memberGen < currentRootGen && currentRootGen !== 0) {
          rootPersonId = personId;
        }
      }
    });

    // Build relationships from member data (only for unique members with relationships)
    Array.from(uniqueMembers.values()).forEach((member) => {
      console.log(`Building relationships for ${member.firstName}:`, {
        father: member.father,
        mother: member.mother,
        spouse: member.spouse,
        fatherId: member.father?._id || member.father,
        motherId: member.mother?._id || member.mother,
        spouseId: member.spouse?._id || member.spouse
      });
      
      // Handle father relationship - can be populated object or just ID
      const fatherId = member.father?._id || member.father || null;
      if (fatherId && people[fatherId]) {
        relationships.push({
          id: `rel_${member._id}_father_${fatherId}`,
          person1Id: fatherId,
          person2Id: member._id,
          type: 'parent-child'
        });
        console.log(`Added father relationship: ${fatherId} -> ${member._id}`);
      }
      
      // Handle mother relationship - can be populated object or just ID
      const motherId = member.mother?._id || member.mother || null;
      if (motherId && people[motherId]) {
        relationships.push({
          id: `rel_${member._id}_mother_${motherId}`,
          person1Id: motherId,
          person2Id: member._id,
          type: 'parent-child'
        });
        console.log(`Added mother relationship: ${motherId} -> ${member._id}`);
      }
      
      // Handle spouse relationship - can be populated object or just ID
      const spouseId = member.spouse?._id || member.spouse || null;
      if (spouseId && people[spouseId]) {
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
          console.log(`Added spouse relationship: ${member._id} <-> ${spouseId}`);
        }
      }
    });

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

      if (relationshipType === 'root') {
        if (familyTree.rootPersonId) {
          alert('Root person already exists! Use other relationship types.');
          return;
        }
        generation = 0; // Root should be generation 0
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

        if (relationshipType === 'parent') {
          generation = relative.generation - 1;
        } else if (relationshipType === 'spouse') {
          generation = relative.generation;
          spouseId = relativeId;
        } else if (relationshipType === 'child') {
          generation = relative.generation + 1;
          if (relative.gender === 'male') {
            fatherId = relativeId;
            // Find spouse to set as mother
            const spouse = getSpouse(relativeId);
            if (spouse) {
              motherId = spouse.id;
            }
          } else {
            motherId = relativeId;
            // Find spouse to set as father
            const spouse = getSpouse(relativeId);
            if (spouse) {
              fatherId = spouse.id;
            }
          }
        }
      }

      // Map relationship type to valid enum value
      let relationshipValue = 'Other';
      if (relationshipType === 'root') {
        relationshipValue = gender === 'male' ? 'Father' : 'Mother';
      } else if (relationshipType === 'parent') {
        relationshipValue = gender === 'male' ? 'Grandfather' : 'Grandmother';
      } else if (relationshipType === 'spouse') {
        relationshipValue = 'Spouse';
      } else if (relationshipType === 'child') {
        relationshipValue = gender === 'male' ? 'Son' : 'Daughter';
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
          _id: newMemberId
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
          if (newMember.spouse?._id || newMember.spouse) {
            const spouseId = newMember.spouse?._id || newMember.spouse;
            if (updatedPeople[spouseId]) {
              // Check for duplicate
              const existing = updatedRelationships.find(r => 
                r.type === 'spouse' && 
                ((r.person1Id === newMemberId && r.person2Id === spouseId) ||
                 (r.person1Id === spouseId && r.person2Id === newMemberId))
              );
              if (!existing) {
                updatedRelationships.push({
                  id: `rel_${newMemberId}_spouse_${spouseId}`,
                  person1Id: newMemberId,
                  person2Id: spouseId,
                  type: 'spouse'
                });
                console.log(`Added spouse relationship: ${newMemberId} <-> ${spouseId}`);
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
      relationshipType: 'root',
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

  const importTree = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          setFamilyTree(imported);
          alert('Family tree imported successfully!');
        } catch (error) {
          alert('Error importing file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
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

    // Get all people and organize by generation
    const allPeople = Object.values(familyTree.people);
    const peopleByGeneration: { [key: number]: Person[] } = {};
    allPeople.forEach(person => {
      const gen = person.generation || 0;
      if (!peopleByGeneration[gen]) {
        peopleByGeneration[gen] = [];
      }
      peopleByGeneration[gen].push(person);
    });

    // Find root person (lowest generation)
    let rootPerson = null;
    if (familyTree.rootPersonId && familyTree.people[familyTree.rootPersonId]) {
      rootPerson = familyTree.people[familyTree.rootPersonId];
      console.log('Using rootPersonId:', familyTree.rootPersonId, 'Person:', rootPerson);
    } else {
      const sortedPeople = allPeople.sort((a, b) => (a.generation || 0) - (b.generation || 0));
      rootPerson = sortedPeople[0];
      console.log('No rootPersonId, using first person by generation:', rootPerson);
    }

    if (!rootPerson) {
      console.log('No root person found');
      return <div>No family members found</div>;
    }

    console.log('Rendering tree with root person:', rootPerson.firstName, rootPerson.lastName);
    console.log('All people in tree:', allPeople.map(p => `${p.firstName} ${p.lastName} (gen ${p.generation})`));
    console.log('All relationships:', familyTree.relationships.map(r => `${r.person1Id} -> ${r.person2Id} (${r.type})`));
    
    // Render hierarchical tree starting from root
    const visited = new Set<string>();
    const renderedPeople = new Set<string>();
    
    // Start rendering from root - pass renderedPeople set to track all rendered people
    const treeContent = renderHierarchicalTree(rootPerson.id, visited, renderedPeople);
    
    // Find and render disconnected members (members not connected to the main tree)
    // Use a Set to track unique person IDs to prevent duplicates
    const disconnectedMemberIds = new Set<string>();
    const disconnectedMembers: Person[] = [];
    
    allPeople.forEach(person => {
      if (!renderedPeople.has(person.id) && !disconnectedMemberIds.has(person.id)) {
        disconnectedMemberIds.add(person.id);
        disconnectedMembers.push(person);
        console.log('Found disconnected member:', person.firstName, person.lastName, 'ID:', person.id);
      }
    });
    
    // Render disconnected members as standalone person cards (only unique ones)
    const disconnectedTrees = disconnectedMembers.map((person, index) => {
      // Check if this person has any relationships
      const hasRelationships = familyTree.relationships.some(r => 
        (r.person1Id === person.id || r.person2Id === person.id) &&
        familyTree.people[r.person1Id] && familyTree.people[r.person2Id] // Both people must exist
      );
      
      if (hasRelationships) {
        // If they have relationships, render as a tree (might be a separate branch)
        const disconnectedVisited = new Set<string>(visited); // Share visited to prevent cycles
        const disconnectedRendered = new Set<string>(renderedPeople); // Share rendered to prevent duplicates
        return (
          <div key={`disconnected-tree-${person.id}`} style={{ marginTop: index > 0 ? '60px' : '0' }}>
            {renderHierarchicalTree(person.id, disconnectedVisited, disconnectedRendered)}
          </div>
        );
      } else {
        // If no relationships, just render as a standalone person card
        return (
          <div key={`disconnected-${person.id}`} style={{ 
            marginTop: index > 0 ? '40px' : '0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {renderPersonCard(person)}
          </div>
        );
      }
    });

  return (
      <div className="tree-hierarchy" style={{ transform: `scale(${zoomLevel})` }}>
        {treeContent}
        {disconnectedTrees.length > 0 && (
          <div style={{ marginTop: '60px', paddingTop: '40px', borderTop: '3px dashed #667eea' }}>
            <h3 style={{ textAlign: 'center', color: '#667eea', marginBottom: '30px', fontSize: '18px' }}>
              Additional Family Members
            </h3>
            {disconnectedTrees}
          </div>
        )}
        </div>
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
                <option value="root">Root Person (Start Here)</option>
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
              </select>
            </div>

            {formData.relationshipType !== 'root' && (
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
