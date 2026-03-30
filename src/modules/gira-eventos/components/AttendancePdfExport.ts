import jsPDF from 'jspdf';
import type { GiraEvent, EventRegistration, EventCheckin } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function exportAttendancePdf(
  event: GiraEvent,
  registrations: EventRegistration[],
  checkins: EventCheckin[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  const checkinMap = new Map<string, EventCheckin>();
  checkins.forEach(c => checkinMap.set(c.registration_id, c));

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTA DE PRESENÇA', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.text(event.title, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Data: ${format(new Date(event.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2, y, { align: 'center' }
  );
  y += 5;
  if (event.location) {
    doc.text(`Local: ${event.location}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  y += 5;

  // Summary
  const present = checkins.length;
  const total = registrations.length;
  doc.setFontSize(9);
  doc.text(`Total de inscritos: ${total} | Presentes: ${present} | Taxa: ${total > 0 ? Math.round(present / total * 100) : 0}%`, margin, y);
  y += 8;

  // Table header
  const cols = [margin, margin + 8, margin + 55, margin + 90, margin + 115, margin + 140];
  const colLabels = ['#', 'Nome', 'Documento', 'Hora', 'Tipo', 'Hash'];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  colLabels.forEach((label, i) => doc.text(label, cols[i], y));
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  registrations.forEach((reg, index) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    const checkin = checkinMap.get(reg.id);
    doc.text(String(index + 1), cols[0], y);
    doc.text(reg.name.substring(0, 25), cols[1], y);
    doc.text(reg.document?.substring(0, 18) ?? '—', cols[2], y);
    doc.text(checkin ? format(new Date(checkin.checkin_at), 'HH:mm') : 'AUSENTE', cols[3], y);
    doc.text(checkin ? (checkin.signature_type === 'drawing' ? 'Manuscrita' : 'Digital') : '—', cols[4], y);
    doc.text(checkin ? checkin.signature_hash.substring(0, 12) + '...' : '—', cols[5], y);
    y += 5;
  });

  // Footer
  y += 10;
  if (y > 270) { doc.addPage(); y = 20; }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const now = new Date();
  const footerText = `Documento gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}. Assinaturas eletrônicas com hash SHA-256 conforme Lei 14.063/2020.`;
  doc.text(footerText, pageWidth / 2, 285, { align: 'center' });

  doc.save(`lista_presenca_${event.title.replace(/\s+/g, '_')}.pdf`);
}
