export enum ActivityType {
  EXECUCAO = 'Execução de Meta',
  REUNIAO = 'Reunião de Equipe',
  OCORRENCIA = 'Ocorrência/Imprevisto',
  COMUNICACAO = 'Divulgação/Mídia',
  ADMINISTRATIVO = 'Administrativo/Financeiro',
  OUTROS = 'Outras Ações',
}

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'OFICINEIRO';

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
}

export interface ExpenseItem {
  id: string;
  itemName: string;
  description: string;
  image?: string;
}

export interface ReportLinks {
  attendanceList?: string;
  registrationList?: string;
  mediaFolder?: string;
}

export interface ReportSection {
  id: string;
  type: 'fixed' | 'custom';
  key: string;
  title: string;
  content?: string;
  isVisible: boolean;
}

export interface ReportData {
  logo?: string;
  logoSecondary?: string;
  objectOverride?: string;
  executiveSummary?: string;
  goalNarratives?: Record<string, string>;
  goalPhotos?: Record<string, string[]>;
  otherActionsText?: string;
  otherActionsPhotos?: string[];
  communicationText?: string;
  communicationPhotos?: string[];
  satisfactionText?: string;
  futureActionsText?: string;
  expenses?: ExpenseItem[];
  links?: ReportLinks;
  sections?: ReportSection[];
}

export interface Activity {
  id: string;
  projectId: string;
  goalId?: string;
  date: string;
  endDate?: string;
  location: string;
  type: ActivityType;
  description: string;
  results: string;
  challenges: string;
  attendeesCount: number;
  teamInvolved: string[];
  photos: string[];
  attachments: string[];
  costEvidence?: string;
}

export interface Project {
  id: string;
  organizationName: string;
  organizationAddress?: string;
  organizationWebsite?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  name: string;
  fomentoNumber: string;
  funder: string;
  startDate: string;
  endDate: string;
  object: string;
  summary: string;
  goals: Goal[];
  team: TeamMember[];
  locations: string[];
  reportData?: ReportData;
}

export interface PhotoWithCaption {
  id: string;
  url: string;
  caption: string;
}

export interface AdditionalSection {
  id: string;
  title: string;
  content: string;
}

export interface TeamReport {
  id: string;
  projectId: string;
  teamMemberId: string;
  providerName: string;
  providerDocument: string;
  responsibleName: string;
  functionRole: string;
  periodStart: string;
  periodEnd: string;
  executionReport: string;
  photos: string[];
  photoCaptions?: PhotoWithCaption[];
  reportTitle?: string;
  executionReportTitle?: string;
  attachmentsTitle?: string;
  additionalSections?: AdditionalSection[];
  footerText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;
  projects: Project[];
  activeProjectId: string | null;
  activities: Activity[];
}

export interface AppContextType extends Omit<AppState, 'projects'> {
  project: Project | null;
  projects: Project[];
  allActivities: Activity[];
  setProject: (p: Project) => void;
  addProject: (p: Project) => void;
  switchProject: (id: string) => void;
  removeProject: (id: string) => void;
  addActivity: (a: Activity) => void;
  updateActivity: (a: Activity) => void;
  deleteActivity: (id: string) => void;
  resetApp: () => void;
  updateReportData: (data: Partial<ReportData>) => void;
  login: (email: string) => void;
  logout: () => void;
}
