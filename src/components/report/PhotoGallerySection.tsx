import React from 'react';
import { Activity } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PhotoGroup {
  monthYear: string;
  location: string;
  photos: string[];
}

interface PhotoGallerySectionProps {
  title: string;
  photos: string[];
  activities: Activity[];
  organizationName: string;
  organizationAddress?: string;
  organizationWebsite?: string;
  organizationEmail?: string;
  organizationPhone?: string;
}

export const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({
  title,
  photos,
  activities,
  organizationName,
  organizationAddress,
  organizationWebsite,
  organizationEmail,
  organizationPhone,
}) => {
  // Group photos by month/year and location
  const groupPhotosByMonthAndLocation = (): PhotoGroup[] => {
    const groups: Map<string, PhotoGroup> = new Map();
    
    // Add standalone photos (use current month if no date context)
    if (photos.length > 0) {
      const currentMonth = format(new Date(), 'MMMM/yyyy', { locale: ptBR }).toUpperCase();
      const key = `${currentMonth}|Geral`;
      if (!groups.has(key)) {
        groups.set(key, { monthYear: currentMonth, location: 'Geral', photos: [] });
      }
      photos.forEach(photo => groups.get(key)!.photos.push(photo));
    }
    
    // Add photos from activities grouped by month and location
    activities.forEach(activity => {
      if (activity.photos && activity.photos.length > 0) {
        const monthYear = format(new Date(activity.date), 'MMMM/yyyy', { locale: ptBR }).toUpperCase();
        const location = activity.location || 'Local não especificado';
        const key = `${monthYear}|${location}`;
        
        if (!groups.has(key)) {
          groups.set(key, { monthYear, location, photos: [] });
        }
        activity.photos.forEach(photo => groups.get(key)!.photos.push(photo));
      }
    });

    // Convert to array and sort by date (most recent first)
    return Array.from(groups.values()).sort((a, b) => {
      const dateA = new Date(a.monthYear.split('/')[1] + '-' + getMonthNumber(a.monthYear.split('/')[0]));
      const dateB = new Date(b.monthYear.split('/')[1] + '-' + getMonthNumber(b.monthYear.split('/')[0]));
      return dateB.getTime() - dateA.getTime();
    });
  };

  const getMonthNumber = (monthName: string): string => {
    const months: Record<string, string> = {
      'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
      'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
      'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
    };
    return months[monthName] || '01';
  };

  const photoGroups = groupPhotosByMonthAndLocation();

  if (photoGroups.length === 0) return null;

  const Footer = () => (
    <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
      <p className="font-semibold">{organizationName}</p>
      {organizationAddress && <p>{organizationAddress}</p>}
      <p>
        {organizationWebsite && <span>{organizationWebsite}</span>}
        {organizationEmail && <span> | {organizationEmail}</span>}
        {organizationPhone && <span> | {organizationPhone}</span>}
      </p>
    </div>
  );

  return (
    <>
      {photoGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="page-break mb-8">
          {/* Photo Gallery Header */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold uppercase mb-2">REGISTROS FOTOGRÁFICOS</h3>
            <h4 className="text-base font-bold uppercase text-primary">{group.monthYear}</h4>
            <h5 className="text-sm font-semibold uppercase text-muted-foreground">{group.location}</h5>
          </div>

          {/* Photo Grid - 2x3 layout like the reference PDF */}
          <div className="grid grid-cols-2 gap-4">
            {group.photos.slice(0, 6).map((photo, photoIdx) => (
              <div key={photoIdx} className="aspect-[4/3] overflow-hidden rounded-lg border shadow-sm">
                <img 
                  src={photo} 
                  alt={`Registro ${photoIdx + 1}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Additional photos on next page if more than 6 */}
          {group.photos.length > 6 && (
            <div className="page-break mt-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold uppercase mb-2">REGISTROS FOTOGRÁFICOS (continuação)</h3>
                <h4 className="text-base font-bold uppercase text-primary">{group.monthYear}</h4>
                <h5 className="text-sm font-semibold uppercase text-muted-foreground">{group.location}</h5>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {group.photos.slice(6, 12).map((photo, photoIdx) => (
                  <div key={photoIdx} className="aspect-[4/3] overflow-hidden rounded-lg border shadow-sm">
                    <img 
                      src={photo} 
                      alt={`Registro ${photoIdx + 7}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <Footer />
            </div>
          )}

          {/* Show remaining photo count if more than 12 */}
          {group.photos.length > 12 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              + {group.photos.length - 12} fotos adicionais disponíveis no link de mídias
            </p>
          )}

          <Footer />
        </div>
      ))}
    </>
  );
};
