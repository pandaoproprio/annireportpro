export interface ReportV2Section {
  id: string;
  title: string;
  content: string;
  photos: string[];
}

export interface ReportV2Data {
  title: string;
  object: string;
  summary: string;
  sections: ReportV2Section[];
}
