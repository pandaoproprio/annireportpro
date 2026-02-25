import React from 'react';
import type { ReportV2Data } from './types';

interface ReportPreviewProps {
  data: ReportV2Data;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ data }) => {
  const { header } = data;
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
        className="space-y-8 shadow-lg"
      >
        {/* Cabeçalho com logos */}
        {hasLogos && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #1a1a1a',
              paddingBottom: '12px',
              marginBottom: '24px',
              breakInside: 'avoid',
            }}
          >
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              {header.logoLeft && (
                <img src={header.logoLeft} alt="Logo esquerda" crossOrigin="anonymous"
                  style={{ height: '60px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {header.logoCenter && (
                <img src={header.logoCenter} alt="Logo central" crossOrigin="anonymous"
                  style={{ height: '60px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {header.logoRight && (
                <img src={header.logoRight} alt="Logo direita" crossOrigin="anonymous"
                  style={{ height: '60px', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        )}

        {/* Título */}
        {data.title && (
          <div style={{ textAlign: 'center', breakInside: 'avoid' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
              {data.title}
            </h1>
          </div>
        )}

        {/* Objeto */}
        {data.object && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
              OBJETO
            </h2>
            <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
              {data.object}
            </p>
          </div>
        )}

        {/* Resumo */}
        {data.summary && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
              RESUMO
            </h2>
            <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
              {data.summary}
            </p>
          </div>
        )}

        {/* Seções dinâmicas */}
        {data.sections.map((section) => (
          <div key={section.id} style={{ breakInside: 'avoid' }}>
            {section.title && (
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                {section.title}
              </h2>
            )}
            {section.content && (
              <p style={{ fontSize: '14px', textAlign: 'justify', lineHeight: '1.6', margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                {section.content}
              </p>
            )}
            {section.photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
                {section.photos.map((url, idx) => (
                  <img key={idx} src={url} alt={`Foto ${idx + 1}`} crossOrigin="anonymous"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportPreview;
