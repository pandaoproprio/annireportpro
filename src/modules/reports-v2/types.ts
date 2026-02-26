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
  header: ReportV2Header;
}

export const DEFAULT_HEADER: ReportV2Header = {
  logoLeft: '',
  logoCenter: '',
  logoRight: '',
};
