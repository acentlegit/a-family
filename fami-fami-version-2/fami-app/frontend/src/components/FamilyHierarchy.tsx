import React, { useState } from 'react';
import { colors } from '../styles/colors';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';

interface Member {
  _id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  gender: string;
  relationship: string;
  generation: number;
  father?: any;
  mother?: any;
  spouse?: any;
  children?: Member[];
}

interface Props {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (memberId: string) => void;
}

const FamilyHierarchy: React.FC<Props> = ({ members, onEdit, onDelete }) => {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Build tree structure
  const buildTree = () => {
    // Find root members (generation 0 or those without parents)
    const roots = members.filter(m => 
      m.generation === 0 || (!m.father && !m.mother)
    );

    // Build children relationships
    const memberMap = new Map(members.map(m => [m._id, { ...m, children: [] as Member[] }]));
    
    members.forEach(member => {
      if (member.father) {
        const father = memberMap.get(member.father._id || member.father);
        if (father && !father.children.find((c: Member) => c._id === member._id)) {
          father.children.push(memberMap.get(member._id)!);
        }
      }
      if (member.mother) {
        const mother = memberMap.get(member.mother._id || member.mother);
        if (mother && !mother.children.find((c: Member) => c._id === member._id)) {
          mother.children.push(memberMap.get(member._id)!);
        }
      }
    });

    return roots.map(r => memberMap.get(r._id)!);
  };

  const handlePhotoUpload = (memberId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const member = members.find(m => m._id === memberId);
      if (member) {
        // Trigger edit with photo
        const reader = new FileReader();
        reader.onloadend = () => {
          onEdit({ ...member, photo: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const renderMemberNode = (member: Member, isRoot: boolean = false) => {
    const isHovered = hoveredMember === member._id;
    
    return (
      <div
        key={member._id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
        onMouseEnter={() => setHoveredMember(member._id)}
        onMouseLeave={() => setHoveredMember(null)}
      >
        {/* Member Circle */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: isRoot ? '120px' : '100px',
              height: isRoot ? '120px' : '100px',
              borderRadius: '50%',
              background: member.photo 
                ? `url(${member.photo})` 
                : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '4px solid white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isRoot ? '32px' : '28px',
              fontWeight: '700',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            {!member.photo && (
              <>
                {member.firstName?.[0]}
                {member.lastName?.[0]}
              </>
            )}
          </div>

          {/* Action Buttons on Hover */}
          {isHovered && (
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              display: 'flex',
              gap: '4px',
              zIndex: 10
            }}>
              <label style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: colors.accentGold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <FaUpload size={14} color="white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(member._id, e)}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={() => onEdit(member)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.primary,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <FaEdit size={14} color="white" />
              </button>
              <button
                onClick={() => onDelete(member._id)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#DC2626',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <FaTrash size={14} color="white" />
              </button>
            </div>
          )}
        </div>

        {/* Name Label */}
        <div style={{
          marginTop: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.title,
          textAlign: 'center'
        }}>
          {member.firstName} {member.lastName}
        </div>

        {/* Relationship Label */}
        <div style={{
          fontSize: '12px',
          color: colors.muted,
          textAlign: 'center'
        }}>
          {member.relationship}
        </div>
      </div>
    );
  };

  const renderAddButton = (parentId?: string) => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <button
          onClick={() => {
            // Open add member modal with parent pre-selected
            const addEvent = new CustomEvent('openAddMember', { detail: { parentId } });
            window.dispatchEvent(addEvent);
          }}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'white',
            border: `3px dashed ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.primary;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <FaPlus size={24} color={colors.primary} />
        </button>
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: colors.muted,
          fontWeight: '600'
        }}>
          Add Member
        </div>
      </div>
    );
  };

  const renderTreeLevel = (member: Member, level: number = 0) => {
    const children = member.children || [];
    const hasChildren = children.length > 0;

    return (
      <div key={member._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Current Member */}
        {renderMemberNode(member, level === 0)}

        {/* Vertical Line Down */}
        {(hasChildren || level < 2) && (
          <div style={{
            width: '3px',
            height: '40px',
            background: '#333',
            margin: '8px 0'
          }} />
        )}

        {/* Children Container */}
        {(hasChildren || level < 2) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Horizontal Line */}
            {hasChildren && children.length > 1 && (
              <div style={{
                width: `${(children.length - 1) * 180 + 100}px`,
                height: '3px',
                background: '#333',
                position: 'relative'
              }}>
                {/* Vertical connectors to each child */}
                {children.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      width: '3px',
                      height: '40px',
                      background: '#333',
                      left: `${(idx / (children.length - 1)) * 100}%`,
                      top: '0',
                      transform: 'translateX(-50%)'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Single child connector */}
            {hasChildren && children.length === 1 && (
              <div style={{
                width: '3px',
                height: '40px',
                background: '#333'
              }} />
            )}

            {/* Children Row */}
            <div style={{
              display: 'flex',
              gap: '80px',
              marginTop: hasChildren && children.length > 1 ? '40px' : '0',
              alignItems: 'flex-start'
            }}>
              {children.map(child => renderTreeLevel(child, level + 1))}
              
              {/* Add button for more children */}
              {level < 2 && renderAddButton(member._id)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  if (members.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%)',
        borderRadius: '12px',
        padding: '60px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌳</div>
        <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
          Start Your Family Tree
        </h3>
        <p style={{ color: colors.muted, margin: '0 0 24px 0' }}>
          Add family members to build your tree
        </p>
        {renderAddButton()}
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%)',
      borderRadius: '12px',
      padding: '40px',
      overflow: 'auto',
      minHeight: '500px'
    }}>
      <div style={{
        display: 'flex',
        gap: '120px',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        {tree.map(root => renderTreeLevel(root))}
        {tree.length === 0 && renderAddButton()}
      </div>
    </div>
  );
};

export default FamilyHierarchy;
