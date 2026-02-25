export interface ReportV2Section {
  id: string;
  title: string;
  content: string;
  photos: string[];
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
  sections: ReportV2Section[];
  header: ReportV2Header;
}

export const DEFAULT_HEADER: ReportV2Header = {
  logoLeft: '',
  logoCenter: '',
  logoRight: '',
};
