export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface ReportV2Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  media: MediaItem[];
}

export interface ReportV2Section {
  id: string;
  type: 'text' | 'activity' | 'divider' | 'custom';
  title: string;
  content: string;
  /** Only for type=activity */
  activityData?: ReportV2Activity;
  sortOrder: number;
}

export interface ReportV2Header {
  logoLeft: string;
  logoCenter: string;
  logoRight: string;
}

export interface ReportV2Data {
  title: string;
  object: string;
  summary: string;
  activities: ReportV2Activity[];
  sections: ReportV2Section[];
  header: ReportV2Header;
  footer?: string;
}

export const DEFAULT_HEADER: ReportV2Header = {
  logoLeft: '',
  logoCenter: '',
  logoRight: '',
};

export function createDefaultSection(type: ReportV2Section['type'] = 'text', order: number = 0): ReportV2Section {
  return {
    id: crypto.randomUUID(),
    type,
    title: type === 'divider' ? '' : 'Nova Seção',
    content: '',
    sortOrder: order,
  };
}
