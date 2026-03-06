import React from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';

const Timeline: React.FC = () => {
  const timelineEvents = [
    { year: '1955', title: 'Ravi Arakala Born', description: 'Family patriarch born in Hyderabad, India' },
    { year: '1985', title: 'Migration to USA', description: 'Family moved to Dallas, Texas for new opportunities' },
    { year: '2005', title: 'Family Reunion', description: 'Grand reunion with 50+ family members from around the world' },
    { year: '2010', title: 'Digital Archive Started', description: 'Began digitizing family photos and documents' },
    { year: '2020', title: 'Arakala Legacy Platform Launched', description: 'This digital heritage system was created to preserve family history' }
  ];

  return (
    <Layout>
      <div>
        <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 8px 0' }}>Family Timeline</h2>
        <p style={{ color: colors.muted, margin: '0 0 24px 0' }}>Explore your family's history through important milestones</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {timelineEvents.map((event, index) => (
            <div
              key={index}
              style={{
                background: colors.cardBg,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(10px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                {event.year}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: colors.title, fontSize: '20px', margin: '0 0 8px 0', fontWeight: '600' }}>
                  {event.title}
                </h3>
                <p style={{ color: colors.body, fontSize: '15px', margin: 0, lineHeight: '1.6' }}>
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Timeline;
