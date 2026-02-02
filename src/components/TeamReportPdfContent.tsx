import React from 'react';
import { Project, TeamReport } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamReportPdfContentProps {
  project: Project;
  report: TeamReport;
}

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return `[${startMonth} à ${endMonth}]`;
};

export const TeamReportPdfContent: React.FC<TeamReportPdfContentProps> = ({ project, report }) => {
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url) => ({ url, caption: 'Registro fotográfico das atividades realizadas' })) || [];

  return (
    <div 
      id="pdf-content-container"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '30mm 20mm 25mm 30mm',
        backgroundColor: '#fff',
        fontFamily: 'Times New Roman, serif',
        fontSize: '12pt',
        lineHeight: '1.5',
        color: '#000',
        position: 'absolute',
        left: '-9999px',
        top: '0',
      }}
    >
      {/* Title */}
      <h1 style={{
        fontSize: '16pt',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '24px',
        fontFamily: 'Times New Roman, serif',
      }}>
        RELATÓRIO DA EQUIPE DE TRABALHO
      </h1>

      {/* Header Info */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: '6px 0', fontFamily: 'Times New Roman, serif' }}>
          <strong>Termo de Fomento nº:</strong> {project.fomentoNumber}
        </p>
        <p style={{ margin: '6px 0', fontFamily: 'Times New Roman, serif' }}>
          <strong>Projeto:</strong> {project.name}
        </p>
        <p style={{ margin: '6px 0', fontFamily: 'Times New Roman, serif' }}>
          <strong>Período de Referência:</strong> {formatPeriod(report.periodStart, report.periodEnd)}
        </p>
      </div>

      {/* Section 1: Identification */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '14pt',
          fontWeight: 'bold',
          marginBottom: '12px',
          fontFamily: 'Times New Roman, serif',
        }}>
          1. Dados de Identificação
        </h2>
        <ul style={{ 
          listStyleType: 'disc', 
          paddingLeft: '20px',
          margin: 0,
          fontFamily: 'Times New Roman, serif',
        }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Prestador:</strong> {report.providerName || '[Não informado]'}
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Responsável Técnico:</strong> {report.responsibleName}
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Função:</strong> {report.functionRole}
          </li>
        </ul>
      </div>

      {/* Section 2: Execution Report */}
      <div style={{ marginBottom: '24px' }} data-pdf-section>
        <h2 style={{
          fontSize: '14pt',
          fontWeight: 'bold',
          marginBottom: '12px',
          fontFamily: 'Times New Roman, serif',
        }}>
          2. Relato de Execução da Coordenação do Projeto
        </h2>
        <div 
          style={{
            textAlign: 'justify',
            fontFamily: 'Times New Roman, serif',
            fontSize: '12pt',
            lineHeight: '1.5',
          }}
          dangerouslySetInnerHTML={{ 
            __html: report.executionReport || '<p>[Nenhum relato informado]</p>' 
          }}
        />
      </div>

      {/* Signature Section */}
      <div style={{ marginTop: '48px', marginBottom: '48px' }} data-pdf-section>
        <p style={{ fontFamily: 'Times New Roman, serif', marginBottom: '48px' }}>
          Rio de Janeiro, {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.
        </p>
        
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <div style={{ 
            borderTop: '1px solid #000', 
            display: 'inline-block', 
            paddingTop: '8px', 
            paddingLeft: '64px', 
            paddingRight: '64px',
            marginBottom: '16px',
          }}>
            Assinatura do responsável legal
          </div>
          <p style={{ marginTop: '16px', fontFamily: 'Times New Roman, serif' }}>
            <strong>Nome e cargo:</strong> {report.responsibleName} - {report.functionRole}
          </p>
          <p style={{ fontFamily: 'Times New Roman, serif' }}>
            <strong>CNPJ:</strong> {report.providerDocument || '[Não informado]'}
          </p>
        </div>
      </div>

      {/* Photos Section */}
      {photosToExport.length > 0 && (
        <div style={{ pageBreakBefore: 'always' }} data-pdf-section>
          <h2 style={{
            fontSize: '14pt',
            fontWeight: 'bold',
            marginBottom: '24px',
            fontFamily: 'Times New Roman, serif',
          }}>
            3. Anexos de Comprovação - Registros Fotográficos
          </h2>
          
          {photosToExport.map((photo, idx) => (
            <div 
              key={idx} 
              style={{ 
                marginBottom: '32px',
                textAlign: 'center',
              }}
              data-pdf-section
            >
              <img
                src={photo.url}
                alt={`Foto ${idx + 1}`}
                style={{
                  maxWidth: '140mm',
                  maxHeight: '90mm',
                  objectFit: 'contain',
                  border: '1px solid #ccc',
                }}
                crossOrigin="anonymous"
              />
              <p style={{
                fontStyle: 'italic',
                fontSize: '10pt',
                marginTop: '8px',
                fontFamily: 'Times New Roman, serif',
                textAlign: 'center',
              }}>
                Foto {idx + 1}: {photo.caption}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer placeholder - will be added by jsPDF */}
      <div style={{
        position: 'fixed',
        bottom: '10mm',
        left: '30mm',
        right: '20mm',
        textAlign: 'center',
        fontSize: '10pt',
        color: '#666',
        borderTop: '1px solid #ccc',
        paddingTop: '8px',
        fontFamily: 'Times New Roman, serif',
      }}>
        {project.organizationName}
      </div>
    </div>
  );
};
