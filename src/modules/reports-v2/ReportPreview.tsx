import React from 'react';
import type { ReportV2Data } from './types';

interface ReportPreviewProps {
  data: ReportV2Data;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ data }) => {
  const { header, activities, sections = [] } = data;
  const hasLogos = header.logoLeft || header.logoCenter || header.logoRight;

  return (
    <div className="flex justify-center overflow-auto">
      <div
        id="report-preview"
        style={{
          width: '794px',
          minHeight: '1123px',
          fontFamily: '"Times New Roman", Times, serif',
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '64px',
        }}
        className="shadow-lg"
      >
        {/* Cabeçalho com logos */}
        {hasLogos && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              {header.logoLeft && <img src={header.logoLeft} alt="Logo esquerda" crossOrigin="anonymous" style={{ height: '60px', objectFit: 'contain' }} />}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {header.logoCenter && <img src={header.logoCenter} alt="Logo central" crossOrigin="anonymous" style={{ height: '60px', objectFit: 'contain' }} />}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {header.logoRight && <img src={header.logoRight} alt="Logo direita" crossOrigin="anonymous" style={{ height: '60px', objectFit: 'contain' }} />}
            </div>
          </div>
        )}

        {/* Título */}
        {data.title && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>{data.title}</h1>
          </div>
        )}

        {/* Objeto */}
        {data.object && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>OBJETO</h2>
            <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{data.object}</p>
          </div>
        )}

        {/* Resumo */}
        {data.summary && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>RESUMO</h2>
            <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{data.summary}</p>
          </div>
        )}

        {/* Seções personalizadas */}
        {sections.map((section) => {
          if (section.type === 'divider') {
            return <hr key={section.id} style={{ border: 'none', borderTop: '2px solid #e5e7eb', margin: '24px 0' }} />;
          }
          if (!section.title && !section.content) return null;
          return (
            <div key={section.id} style={{ marginBottom: '24px' }}>
              {section.title && (
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>{section.title}</h2>
              )}
              {section.content && (
                <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{section.content}</p>
              )}
            </div>
          );
        })}

        {/* Atividades */}
        {activities.map((act) => {
          if (!act.title && !act.description && act.media.length === 0) return null;
          return (
            <div key={act.id} style={{ marginBottom: '32px', breakInside: 'avoid' }}>
              {act.title && (
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>{act.title}</h2>
              )}
              {act.date && (
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>Data: {act.date}</p>
              )}
              {act.description && (
                <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>{act.description}</p>
              )}
              {act.media.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
                  {act.media.map((m, idx) =>
                    m.type === 'image' ? (
                      <img key={idx} src={m.url} alt={`Foto ${idx + 1}`} crossOrigin="anonymous" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <video key={idx} src={m.url} controls muted style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', background: '#000' }} />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Rodapé */}
        {data.footer && (
          <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '12px', marginTop: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{data.footer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPreview;
