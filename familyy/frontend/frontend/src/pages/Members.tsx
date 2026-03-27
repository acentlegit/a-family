import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api, { getApiUrl } from '../config/api';
import { RELATIONSHIP_OPTIONS } from '../constants/relationshipOptions';
import {
  buildRelativeSelectGroupsFromMembers,
  parseCoupleSelection
} from '../utils/relativeSelectOptions';
import { sortMembersByAgeDesc } from '../utils/sortMembersByAge';
import { FaPlus, FaTrash, FaEdit, FaUser, FaTimes, FaDownload, FaUpload } from 'react-icons/fa';
import { FiImage } from 'react-icons/fi';

const MEMBERS_CACHE_KEY = 'members_page_cache_v1';

function getMemberPhotoSrc(member: { photo?: string }): string {
  const photo = (member.photo || '').trim();
  if (!photo) return '';
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
  const apiBaseUrl = getApiUrl().replace('/api', '');
  if (photo.startsWith('/uploads/')) return `${apiBaseUrl}${photo}`;
  if (photo.startsWith('uploads/')) return `${apiBaseUrl}/${photo}`;
  if (photo.startsWith('/')) return `${apiBaseUrl}${photo}`;
  return `${apiBaseUrl}/uploads/${photo}`;
}

const Members: React.FC = () => {
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  // Helper function to create fresh member objects
  const createFreshMembers = () => {
    return Array.from({ length: 8 }, (_, index) => ({
      id: `member-${index}-${Date.now()}-${Math.random()}`,
      firstName: '',
      lastName: '',
      email: '',
      relationship: 'Other',
      generation: 0,
      gender: 'Male',
      spouseId: '',
      relativeId: '', // Add relative selection
      fatherId: '',
      motherId: '',
      sendEmail: true
    }));
  };

  const [bulkMembers, setBulkMembers] = useState(() => createFreshMembers());
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'Male',
    relationship: 'Other',
    generation: 0,
    fatherId: '',
    motherId: '',
    spouseId: '',
    relativeId: '' // Add relative selection
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const excelImportRef = useRef<HTMLInputElement>(null);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [memberUpdateSaving, setMemberUpdateSaving] = useState(false);

  const relationshipOptions = RELATIONSHIP_OPTIONS;

  const bulkRelativeSelectGroups = useMemo(
    () => buildRelativeSelectGroupsFromMembers(members),
    [members]
  );

  // Calculate generation based on relationship (0 = oldest tier in tree)
  const getGenerationFromRelationship = (relationship: string): number => {
    const rel = relationship.toLowerCase().trim();
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
      rel === 'adoptive mother'
    ) {
      return 3;
    }
    if (rel === 'myself') {
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

  // Find potential spouse when creating a member
  const findPotentialSpouse = (relationship: string, gender: string, existingMembers: any[]): string => {
    const rel = relationship.toLowerCase().trim();
    const oppositeGender = gender === 'Male' ? 'Female' : 'Male';
    
    // Match Grandfather with Grandmother
    if (rel === 'grandfather') {
      const grandmother = existingMembers.find(m => 
        m.relationship?.toLowerCase() === 'grandmother' && 
        m.gender === oppositeGender && 
        !m.spouse && 
        m.generation === 0
      );
      return grandmother?._id || '';
    } else if (rel === 'grandmother') {
      const grandfather = existingMembers.find(m => 
        m.relationship?.toLowerCase() === 'grandfather' && 
        m.gender === oppositeGender && 
        !m.spouse && 
        m.generation === 0
      );
      return grandfather?._id || '';
    }
    
    // Match Father with Mother
    if (rel === 'father') {
      const mother = existingMembers.find(m => 
        m.relationship?.toLowerCase() === 'mother' && 
        m.gender === oppositeGender && 
        !m.spouse && 
        m.generation === 1
      );
      return mother?._id || '';
    } else if (rel === 'mother') {
      const father = existingMembers.find(m => 
        m.relationship?.toLowerCase() === 'father' && 
        m.gender === oppositeGender && 
        !m.spouse && 
        m.generation === 1
      );
      return father?._id || '';
    }
    
    // Match Uncle with Aunt
    if (rel === 'uncle') {
      const aunt = existingMembers.find(m => 
        m.relationship?.toLowerCase() === 'aunt' && 
        m.gender === oppositeGender && 
        !m.spouse && 
        m.generation === 1
      );
      return aunt?._id || '';
    } else if (rel === 'aunt') {
      const uncle = existingMembers.find(m => 
        m.relationship?.toLowerCase() === 'uncle' && 
        m.gender === oppositeGender && 
        !m.spouse && 
        m.generation === 1
      );
      return uncle?._id || '';
    }
    
    return '';
  };

  useEffect(() => {
    try {
      const cachedRaw = sessionStorage.getItem(MEMBERS_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Array.isArray(cached?.families)) setFamilies(cached.families);
        if (typeof cached?.selectedFamilyId === 'string') setSelectedFamilyId(cached.selectedFamilyId);
        if (Array.isArray(cached?.members)) setMembers(sortMembersByAgeDesc(cached.members));
      }
    } catch {
      // Ignore cache read errors
    }
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMembers(selectedFamilyId);
    }
  }, [selectedFamilyId]);

  useEffect(() => {
    setSelectedMemberIds([]);
  }, [selectedFamilyId]);

  useEffect(() => {
    setSelectedMemberIds((prev) =>
      prev.filter((id) => members.some((m) => String(m._id) === id))
    );
  }, [members]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el && members.length > 0) {
      el.indeterminate =
        selectedMemberIds.length > 0 && selectedMemberIds.length < members.length;
    }
  }, [selectedMemberIds, members.length]);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/families');
      const fetchedFamilies = response.data.data || [];
      setFamilies(fetchedFamilies);
      if (fetchedFamilies.length > 0 && !selectedFamilyId) {
        setSelectedFamilyId(fetchedFamilies[0]._id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchMembers = async (familyId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/members/${familyId}`);
      const sortedMembers = sortMembersByAgeDesc(response.data.data || []);
      setMembers(sortedMembers);
      try {
        sessionStorage.setItem(
          MEMBERS_CACHE_KEY,
          JSON.stringify({
            families,
            selectedFamilyId: familyId,
            members: sortedMembers
          })
        );
      } catch {
        // Ignore cache write errors
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firstName', newMember.firstName);
      formData.append('lastName', newMember.lastName);
      formData.append('email', newMember.email);
      formData.append('gender', newMember.gender);
      formData.append('relationship', newMember.relationship);
      formData.append('generation', newMember.generation.toString());
      if (newMember.fatherId) formData.append('fatherId', newMember.fatherId);
      if (newMember.motherId) formData.append('motherId', newMember.motherId);
      if (newMember.spouseId) formData.append('spouseId', newMember.spouseId);
      if (selectedPhoto) formData.append('photo', selectedPhoto);

      await api.post(`/members/${selectedFamilyId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Member added successfully!');
      setShowAddModal(false);
      resetForm();
      await fetchMembers(selectedFamilyId);
      
      // Trigger a custom event to notify Dashboard to refresh
      window.dispatchEvent(new CustomEvent('memberAdded'));
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.message || 'Error adding member');
    }
  };

  const handleBulkAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    // Filter out empty members, calculate generation if missing, and remove the internal 'id' field
    const validMembers = bulkMembers
      .filter(m => m.firstName.trim() && m.lastName.trim())
      .map(({ id, ...member }) => {
        // Ensure generation is set based on relationship if not already set
        const generation = member.generation !== undefined 
          ? member.generation 
          : getGenerationFromRelationship(member.relationship || 'Other');
        
        return {
          ...member,
          generation: generation,
          // Include spouseId if found
          spouseId: member.spouseId || '',
          // Include parent IDs if set from relative selection
          fatherId: member.fatherId || '',
          motherId: member.motherId || ''
        };
      }); // Remove 'id' field before sending
    
    if (validMembers.length === 0) {
      alert('Please add at least one member with first and last name');
      return;
    }

    setBulkAddLoading(true);
    try {
      const response = await api.post(`/members/${selectedFamilyId}/bulk`, {
        members: validMembers
      });

      alert(`Successfully added ${response.data.addedCount} members! ${response.data.emailsSent} invitation emails sent.`);
      setShowBulkAddModal(false);
      setBulkMembers(createFreshMembers());
      fetchMembers(selectedFamilyId);
    } catch (error: any) {
      console.error('Error adding members:', error);
      alert(error.response?.data?.message || 'Error adding members');
    } finally {
      setBulkAddLoading(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || memberUpdateSaving) return;

    const fatherRaw = editingMember.father;
    const motherRaw = editingMember.mother;
    const spouseRaw = editingMember.spouse;
    const fatherId =
      fatherRaw && typeof fatherRaw === 'object' ? fatherRaw._id : fatherRaw;
    const motherId =
      motherRaw && typeof motherRaw === 'object' ? motherRaw._id : motherRaw;
    const spouseId =
      spouseRaw && typeof spouseRaw === 'object' ? spouseRaw._id : spouseRaw;

    setMemberUpdateSaving(true);
    try {
      let response;
      if (selectedPhoto) {
        const formData = new FormData();
        formData.append('firstName', editingMember.firstName);
        formData.append('lastName', editingMember.lastName || '');
        formData.append('email', editingMember.email || '');
        formData.append('gender', editingMember.gender);
        formData.append('relationship', editingMember.relationship);
        formData.append('generation', String(editingMember.generation));
        if (fatherId) formData.append('fatherId', String(fatherId));
        if (motherId) formData.append('motherId', String(motherId));
        if (spouseId) formData.append('spouseId', String(spouseId));
        formData.append('photo', selectedPhoto);
        response = await api.put(
          `/members/${selectedFamilyId}/${editingMember._id}`,
          formData
        );
      } else {
        const body: Record<string, string | number> = {
          firstName: editingMember.firstName,
          lastName: editingMember.lastName || '',
          email: editingMember.email || '',
          gender: editingMember.gender,
          relationship: editingMember.relationship,
          generation: editingMember.generation
        };
        if (fatherId) body.fatherId = String(fatherId);
        if (motherId) body.motherId = String(motherId);
        if (spouseId) body.spouseId = String(spouseId);
        response = await api.put(
          `/members/${selectedFamilyId}/${editingMember._id}`,
          body
        );
      }

      const updated = response.data?.data;
      if (updated) {
        setMembers((prev) => {
          const next = sortMembersByAgeDesc(
            prev.map((m) =>
              String(m._id) === String(updated._id) ? { ...m, ...updated } : m
            )
          );
          try {
            sessionStorage.setItem(
              MEMBERS_CACHE_KEY,
              JSON.stringify({
                families,
                selectedFamilyId: selectedFamilyId,
                members: next
              })
            );
          } catch {
            // ignore cache write errors
          }
          return next;
        });
      }

      setShowEditModal(false);
      setEditingMember(null);
      resetForm();
      window.dispatchEvent(new CustomEvent('memberAdded'));
    } catch (error: any) {
      console.error('Error updating member:', error);
      alert(error.response?.data?.message || 'Error updating member');
    } finally {
      setMemberUpdateSaving(false);
    }
  };

  const toggleMemberSelected = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allMembersSelected =
    members.length > 0 && selectedMemberIds.length === members.length;

  const toggleSelectAllMembers = () => {
    if (allMembersSelected) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => String(m._id)));
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (!selectedFamilyId || selectedMemberIds.length === 0) return;
    const n = selectedMemberIds.length;
    if (
      !window.confirm(
        `Delete ${n} selected member${n === 1 ? '' : 's'}? This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkDeleteLoading(true);
    try {
      const { data } = await api.delete(`/members/${selectedFamilyId}/bulk`, {
        data: { ids: selectedMemberIds },
      });
      setSelectedMemberIds([]);
      alert(data?.message || `Removed ${data?.deletedCount ?? n} member(s).`);
      await fetchMembers(selectedFamilyId);
      window.dispatchEvent(new CustomEvent('memberAdded'));
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      alert(error.response?.data?.message || 'Could not delete selected members.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const openEditModal = (member: any) => {
    setEditingMember(member);
    setPhotoPreview(member.photo || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setNewMember({
      firstName: '',
      lastName: '',
      email: '',
      gender: 'Male',
      relationship: 'Other',
      generation: 0,
      fatherId: '',
      motherId: '',
      spouseId: '',
      relativeId: ''
    });
    setSelectedPhoto(null);
    setPhotoPreview('');
  };

  const handleExportMembers = async () => {
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
      link.setAttribute('download', `members-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting members:', error);
      alert('Error exporting to Excel');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = (file.name || '').toLowerCase();
    const isExcelFile = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    if (!isExcelFile) {
      alert('Please upload only Excel files (.xlsx or .xls).');
      e.target.value = '';
      return;
    }

    if (!selectedFamilyId) {
      alert('Please select a family first');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    let timeoutId: number | undefined;

    setExcelImportLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You are not logged in. Please login and try again.');
      }

      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 300000); // 5 min

      const baseApiUrl = getApiUrl().replace(/\/$/, '');
      const importUrl = `${baseApiUrl}/families/${selectedFamilyId}/import-excel`;

      const response = await fetch(importUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      window.clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { message: responseText || 'Unexpected server response' };
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
          (response.status === 400
            ? 'Only Excel files (.xlsx, .xls) are allowed.'
            : `Import failed with status ${response.status}`)
        );
      }

      const importedCount = responseData?.importedCount;
      const skippedCount = responseData?.skippedCount;
      const skippedRows = Array.isArray(responseData?.skippedRows) ? responseData.skippedRows : [];

      if (typeof importedCount === 'number' || typeof skippedCount === 'number') {
        const summaryLines = [
          responseData.message || 'Import completed.',
          `Imported: ${importedCount ?? 0}`,
          `Skipped: ${skippedCount ?? 0}`
        ];

        if (skippedRows.length > 0) {
          summaryLines.push('', 'Skipped row details:');
          skippedRows.slice(0, 10).forEach((item: any) => {
            summaryLines.push(`- Row ${item.row}: ${item.reason}`);
          });
          if (skippedRows.length > 10) {
            summaryLines.push(`...and ${skippedRows.length - 10} more`);
          }
        }

        alert(summaryLines.join('\n'));
      } else {
        alert(responseData.message || 'Members imported successfully!');
      }
      // Refresh members after import
      if (selectedFamilyId) {
        fetchMembers(selectedFamilyId);
      }
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      if (error?.name === 'AbortError') {
        alert('Import timed out. Please try a smaller Excel file or retry.');
      } else {
        alert(error?.message || error?.response?.data?.message || 'Error importing Excel file');
      }
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      setExcelImportLoading(false);
      e.target.value = '';
    }
  };


  const potentialFathers = members.filter(m => m.gender === 'Male');
  const potentialMothers = members.filter(m => m.gender === 'Female');
  const potentialSpouses = members;

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'white', margin: '0 0 8px 0', fontWeight: '600' }}>Manage Members</h2>
            <p style={{ color: 'white', margin: 0, opacity: 0.9 }}>Add and manage family members</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {loading && <span style={{ color: 'white', fontSize: '13px', alignSelf: 'center', opacity: 0.9 }}>Refreshing...</span>}
            <button
              type="button"
              onClick={() => excelImportRef.current?.click()}
              disabled={!selectedFamilyId || excelImportLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: !selectedFamilyId || excelImportLoading ? colors.muted : '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: !selectedFamilyId || excelImportLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {excelImportLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Importing…
                </>
              ) : (
                <>
                  <FaUpload /> Import Excel
                </>
              )}
            </button>
            <button
              onClick={handleExportMembers}
              disabled={!selectedFamilyId || members.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: (!selectedFamilyId || members.length === 0) ? colors.muted : '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (!selectedFamilyId || members.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              <FaDownload /> Export Excel
            </button>
            <button
              onClick={() => {
                // Reset members when opening modal
                setBulkMembers(createFreshMembers());
                setShowBulkAddModal(true);
              }}
              disabled={!selectedFamilyId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: !selectedFamilyId ? colors.muted : colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: !selectedFamilyId ? 'not-allowed' : 'pointer'
              }}
            >
              <span style={{ fontSize: '16px' }}>+</span> Add Members
            </button>
          </div>
        </div>

        {excelImportLoading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px',
              padding: '14px 18px',
              background: 'rgba(59, 130, 246, 0.18)',
              border: '1px solid rgba(147, 197, 253, 0.5)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 500
            }}
          >
            <div className="spinner" style={{ width: 22, height: 22, borderWidth: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Importing your file…</div>
              <div style={{ opacity: 0.92, fontSize: '14px', fontWeight: 400 }}>
                Your spreadsheet is uploading and being processed. This can take a few seconds for large files — please
                wait; you do not need to select the file again.
              </div>
            </div>
          </div>
        )}

        {/* Family Selector */}
        <div style={{
          background: colors.cardBg,
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px'
        }}>
          <label style={{ display: 'block', color: colors.body, fontWeight: '600', marginBottom: '8px' }}>
            Select Family
          </label>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none',
              background: colors.cardBg,
              color: colors.body
            }}
          >
            {families.map((family) => (
              <option key={family._id} value={family._id}>
                {family.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk selection toolbar */}
        {selectedFamilyId && members.length > 0 && !loading && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: colors.cardBg,
              padding: '14px 18px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: colors.body,
                  userSelect: 'none',
                }}
              >
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  checked={allMembersSelected}
                  onChange={toggleSelectAllMembers}
                />
                Select all ({members.length})
              </label>
              <span style={{ color: colors.muted, fontSize: '14px' }}>
                {selectedMemberIds.length === 0
                  ? 'Tick people to delete several at once'
                  : `${selectedMemberIds.length} selected`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {selectedMemberIds.length > 0 && (
                <button
                  type="button"
                  disabled={bulkDeleteLoading}
                  onClick={() => setSelectedMemberIds([])}
                  style={{
                    padding: '10px 16px',
                    background: colors.sectionBg,
                    color: colors.body,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: bulkDeleteLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Clear selection
                </button>
              )}
              <button
                type="button"
                disabled={selectedMemberIds.length === 0 || bulkDeleteLoading}
                onClick={handleBulkDeleteSelected}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background:
                    selectedMemberIds.length === 0 || bulkDeleteLoading ? colors.muted : '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor:
                    selectedMemberIds.length === 0 || bulkDeleteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <FaTrash />
                {bulkDeleteLoading
                  ? 'Deleting…'
                  : `Delete selected${selectedMemberIds.length ? ` (${selectedMemberIds.length})` : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Members Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : members.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
              gap: '10px',
              alignItems: 'stretch'
            }}
          >
            {members.map((member) => {
              const mid = String(member._id);
              const isCardSelected = selectedMemberIds.includes(mid);
              return (
              <div
                key={member._id}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  border: isCardSelected
                    ? `2px solid ${colors.primary}`
                    : `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  boxShadow: isCardSelected
                    ? '0 4px 16px rgba(59, 130, 246, 0.25)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  minHeight: '200px',
                  height: '100%',
                  isolation: 'isolate'
                }}
              >
                {member.photo?.trim() ? (
                  <img
                    src={getMemberPhotoSrc(member)}
                    alt={`${member.firstName} ${member.lastName || ''}`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center center',
                      display: 'block'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: member.photo?.trim()
                      ? 'transparent'
                      : member.gender === 'Male'
                        ? 'linear-gradient(165deg, #E0F2FE 0%, #93c5fd 100%)'
                        : 'linear-gradient(165deg, #F0F9FF 0%, #e9d5ff 100%)',
                    zIndex: 0
                  }}
                />
                {!member.photo?.trim() && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}
                  >
                    <FaUser size={48} color={colors.primary} />
                  </div>
                )}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 35%, transparent 60%)',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                />
                <label
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    background: 'rgba(255,255,255,0.96)',
                    borderRadius: 5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isCardSelected}
                    onChange={() => toggleMemberSelected(mid)}
                    aria-label={`Select ${member.firstName} ${member.lastName || ''}`}
                    style={{ width: 13, height: 13, cursor: 'pointer', margin: 0 }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => openEditModal(member)}
                  title="Edit member"
                  aria-label={`Edit ${member.firstName} ${member.lastName || ''}`}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    zIndex: 5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    padding: 0,
                    border: 'none',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.94)',
                    color: colors.primary,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                  }}
                >
                  <FaEdit size={15} aria-hidden />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '10px 10px 12px',
                    zIndex: 3
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: 1.25,
                      textShadow: '0 1px 10px rgba(0,0,0,0.85)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {member.firstName} {member.lastName || ''}
                  </h3>
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div style={{
            background: colors.cardBg,
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
              No members yet
            </h3>
            <p style={{ color: colors.body, margin: '0 0 24px 0' }}>
              Add your first family member to get started
            </p>
          </div>
        )}
      </div>

      {/* Single Add Member Modal - REMOVED (using bulk add instead) */}
      {/* {showAddModal && ( ... )} */}

      {/* Bulk Add Members Modal */}
      {showBulkAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: '#000', margin: 0, fontWeight: '600' }}>
                Add Members
              </h2>
              <button
                onClick={() => setShowBulkAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#000'
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{
              background: colors.sectionBg,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{ margin: 0, color: colors.body, fontSize: '14px' }}>
                ✉️ <strong>Optional Fields:</strong> Fill in as many members as you want (1-8). Only first and last names are required. Members with valid email addresses will automatically receive an invitation email.
              </p>
            </div>

            <form onSubmit={handleBulkAddMembers}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {bulkMembers.map((member, index) => (
                  <div key={member.id || `member-${index}`} style={{
                    background: colors.sectionBg,
                    padding: '20px',
                    borderRadius: '8px',
                    border: `2px solid ${bulkMembers[index]?.firstName || bulkMembers[index]?.lastName ? colors.primary : colors.border}`
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#000', fontWeight: '600' }}>
                      Member {index + 1}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          First Name {bulkMembers[index]?.firstName || bulkMembers[index]?.lastName ? '*' : '(optional)'}
                        </label>
                        <input
                          key={`firstName-${member.id || index}`}
                          type="text"
                          placeholder="Optional"
                          value={bulkMembers[index]?.firstName || ''}
                          onChange={(e) => {
                            const firstNameValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { ...m, firstName: firstNameValue };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#000'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Last Name {bulkMembers[index]?.firstName || bulkMembers[index]?.lastName ? '*' : '(optional)'}
                        </label>
                        <input
                          key={`lastName-${member.id || index}`}
                          type="text"
                          placeholder="Optional"
                          value={bulkMembers[index]?.lastName || ''}
                          onChange={(e) => {
                            const lastNameValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { ...m, lastName: lastNameValue };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#000'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Email (optional)
                        </label>
                        <input
                          id={`email-input-${index}-${member.id}`}
                          key={`email-${member.id || index}`}
                          type="email"
                          placeholder="Optional"
                          autoComplete="off"
                          value={bulkMembers[index]?.email || ''}
                          onChange={(e) => {
                            const emailValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              // Create a completely new array with new objects
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  // Create a completely new object for the updated member
                                  return {
                                    ...m,
                                    email: emailValue
                                  };
                                }
                                // Return a copy of existing member (not the same reference)
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#000'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Gender
                        </label>
                        <select
                          value={bulkMembers[index]?.gender || 'Male'}
                          onChange={(e) => {
                            const genderValue = e.target.value;
                            const relationshipValue = bulkMembers[index]?.relationship || 'Other';
                            const generation = getGenerationFromRelationship(relationshipValue);
                            const potentialSpouseId = findPotentialSpouse(relationshipValue, genderValue, members);
                            
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { 
                                    ...m, 
                                    gender: genderValue,
                                    generation: generation,
                                    spouseId: potentialSpouseId || m.spouseId || ''
                                  };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#000'
                          }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Relationship
                        </label>
                        <select
                          value={bulkMembers[index]?.relationship || 'Other'}
                          onChange={(e) => {
                            const relationshipValue = e.target.value;
                            const generation = getGenerationFromRelationship(relationshipValue);
                            const memberGender = bulkMembers[index]?.gender || 'Male';
                            const potentialSpouseId = findPotentialSpouse(relationshipValue, memberGender, members);
                            
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { 
                                    ...m, 
                                    relationship: relationshipValue,
                                    generation: generation,
                                    spouseId: potentialSpouseId || m.spouseId || '',
                                    ...(relationshipValue === 'Myself'
                                      ? { relativeId: '', fatherId: '', motherId: '' }
                                      : {})
                                  };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#000'
                          }}
                        >
                          {relationshipOptions.map(rel => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Select relative
                          {(bulkMembers[index]?.relationship === 'Son' ||
                            bulkMembers[index]?.relationship === 'Daughter') &&
                            ' (couple = both parents)'}
                        </label>
                        {(bulkMembers[index]?.relationship || 'Other') === 'Myself' ? (
                          <div
                            style={{
                              padding: '10px',
                              border: `1px solid ${colors.border}`,
                              borderRadius: '6px',
                              fontSize: '14px',
                              color: colors.muted,
                              background: colors.sectionBg
                            }}
                          >
                            Not used for Myself
                          </div>
                        ) : (
                        <select
                          value={bulkMembers[index]?.relativeId || ''}
                          onChange={(e) => {
                            const relativeId = e.target.value;
                            const relationshipValue = bulkMembers[index]?.relationship || 'Other';
                            
                            const getM = (id: string) =>
                              members.find((m) => String(m._id) === String(id));

                            let fatherId = '';
                            let motherId = '';
                            let spouseId = '';
                            let generation = getGenerationFromRelationship(relationshipValue);

                            const paired = parseCoupleSelection(relativeId, (id) => getM(id));
                            if (
                              paired &&
                              (relationshipValue === 'Son' || relationshipValue === 'Daughter')
                            ) {
                              fatherId = paired.fatherId;
                              motherId = paired.motherId;
                              const p1 = getM(paired.fatherId);
                              const p2 = getM(paired.motherId);
                              generation =
                                Math.max(p1?.generation ?? 0, p2?.generation ?? 0) + 1;
                            } else {
                              const relative = getM(relativeId);
                              if (relative && relationshipValue !== 'Other') {
                              if (relationshipValue === 'Spouse') {
                                spouseId = relativeId;
                                generation = relative.generation || 0;
                              } else if (relationshipValue === 'Father' || relationshipValue === 'Mother') {
                                generation = (relative.generation || 0) - 1;
                              } else if (relationshipValue === 'Grandfather' || relationshipValue === 'Grandmother') {
                                generation = (relative.generation || 0) - 2;
                              } else if (relationshipValue === 'Great Grandfather' || relationshipValue === 'Great Grandmother') {
                                generation = (relative.generation || 0) - 3;
                              } else if (relationshipValue === 'Son' || relationshipValue === 'Daughter') {
                                generation = (relative.generation || 0) + 1;
                                if (relative.gender === 'Male') {
                                  fatherId = String(relativeId);
                                  const spouse = members.find(m => m.spouse?._id === relativeId || m.spouse === relativeId);
                                  if (spouse) motherId = String(spouse._id);
                                } else {
                                  motherId = String(relativeId);
                                  const spouse = members.find(m => m.spouse?._id === relativeId || m.spouse === relativeId);
                                  if (spouse) fatherId = String(spouse._id);
                                }
                              } else if (relationshipValue === 'Brother' || relationshipValue === 'Sister') {
                                generation = relative.generation || 0;
                                if (relative.father?._id) fatherId = String(relative.father._id);
                                if (relative.mother?._id) motherId = String(relative.mother._id);
                              } else if (relationshipValue === 'Uncle' || relationshipValue === 'Aunt') {
                                const relativeParents = members.filter(m => 
                                  m._id === relative.father?._id || m._id === relative.mother?._id
                                );
                                if (relativeParents.length > 0) {
                                  generation = relativeParents[0].generation || 0;
                                  const grandParent = relativeParents[0];
                                  const grandParents = members.filter(m => 
                                    m._id === grandParent.father?._id || m._id === grandParent.mother?._id
                                  );
                                  if (grandParents.length > 0) {
                                    const maleGP = grandParents.find(p => p.gender === 'Male');
                                    const femaleGP = grandParents.find(p => p.gender === 'Female');
                                    if (maleGP) fatherId = String(maleGP._id);
                                    if (femaleGP) motherId = String(femaleGP._id);
                                  }
                                }
                              }
                              }
                            }

                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { 
                                    ...m, 
                                    relativeId: relativeId,
                                    fatherId: fatherId || m.fatherId || '',
                                    motherId: motherId || m.motherId || '',
                                    spouseId: spouseId || m.spouseId || '',
                                    generation: generation
                                  };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            color: '#000'
                          }}
                        >
                          <option value="">Select a relative...</option>
                          {(bulkMembers[index]?.relationship === 'Son' ||
                            bulkMembers[index]?.relationship === 'Daughter') &&
                            bulkRelativeSelectGroups.couples.length > 0 && (
                            <optgroup label="Couples">
                              {bulkRelativeSelectGroups.couples.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup
                            label={
                              bulkMembers[index]?.relationship === 'Son' ||
                              bulkMembers[index]?.relationship === 'Daughter'
                                ? 'Individuals'
                                : 'Members'
                            }
                          >
                            {bulkRelativeSelectGroups.individuals.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(false)}
                  disabled={bulkAddLoading}
                  style={{
                    padding: '12px 24px',
                    background: colors.sectionBg,
                    color: colors.body,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: bulkAddLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAddLoading}
                  style={{
                    padding: '12px 24px',
                    background: bulkAddLoading ? colors.muted : colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: bulkAddLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bulkAddLoading ? 'Adding Members...' : 'Add Members & Send Invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: '#000', margin: 0, fontWeight: '600' }}>
                Edit Member
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  resetForm();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <FaTimes size={20} color={colors.muted} />
              </button>
            </div>

            <form onSubmit={handleEditMember}>
              {/* Photo Upload */}
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <label style={{
                  display: 'inline-block',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: photoPreview ? `url(${photoPreview})` : colors.sectionBg,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `2px dashed ${colors.border}`,
                  cursor: 'pointer',
                  margin: '0 auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    {!photoPreview && <FiImage size={32} color={colors.muted} />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                <p style={{ fontSize: '12px', color: '#333', marginTop: '8px' }}>
                  Click to upload photo
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={editingMember.firstName}
                    onChange={(e) => setEditingMember({ ...editingMember, firstName: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editingMember.lastName || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, lastName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingMember.email || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Gender *
                  </label>
                  <select
                    value={editingMember.gender}
                    onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Relationship *
                  </label>
                  <select
                    value={editingMember.relationship}
                    onChange={(e) => setEditingMember({ ...editingMember, relationship: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    {relationshipOptions.map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Generation (0 = oldest)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingMember.generation}
                  onChange={(e) => setEditingMember({ ...editingMember, generation: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Father
                  </label>
                  <select
                    value={editingMember.father?._id || editingMember.father || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, father: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    <option value="">None</option>
                    {potentialFathers.map(m => (
                      <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Mother
                  </label>
                  <select
                    value={editingMember.mother?._id || editingMember.mother || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, mother: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    <option value="">None</option>
                    {potentialMothers.map(m => (
                      <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Spouse
                </label>
                <select
                  value={editingMember.spouse?._id || editingMember.spouse || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, spouse: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    background: colors.cardBg
                  }}
                >
                  <option value="">None</option>
                  {potentialSpouses.filter(m => m._id !== editingMember._id).map(m => (
                    <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={memberUpdateSaving}
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  resetForm();
                }}
                style={{
                  padding: '12px 24px',
                  background: colors.sectionBg,
                  color: colors.body,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: memberUpdateSaving ? 'not-allowed' : 'pointer',
                  opacity: memberUpdateSaving ? 0.7 : 1
                }}
              >
                Cancel
              </button>
                <button
                  type="submit"
                  disabled={memberUpdateSaving}
                  style={{
                    padding: '12px 24px',
                    background: memberUpdateSaving ? colors.muted : colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: memberUpdateSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {memberUpdateSaving ? 'Saving…' : 'Update Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden file input for Excel import */}
      <input
        type="file"
        ref={excelImportRef}
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        disabled={excelImportLoading}
        style={{ display: 'none' }}
        onChange={handleImportExcel}
      />
    </Layout>
  );
};

export default Members;
