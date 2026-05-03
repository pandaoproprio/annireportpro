export enum ActivityType {
  EXECUCAO = 'Execução de Meta',
  REUNIAO = 'Reunião de Equipe',
  OCORRENCIA = 'Ocorrência/Imprevisto',
  COMUNICACAO = 'Divulgação/Mídia',
  ADMINISTRATIVO = 'Administrativo/Financeiro',
  OUTROS = 'Outras Ações',
}

export type UserRole = 'USUARIO' | 'OFICINEIRO' | 'VOLUNTARIO' | 'COORDENADOR' | 'ANALISTA' | 'ADMIN' | 'SUPER_ADMIN';

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
  attendanceFileName?: string;
  registrationFileName?: string;
  mediaFileName?: string;
  attendanceDisplayName?: string;
  registrationDisplayName?: string;
  mediaDisplayName?: string;
}

export interface ReportSection {
  id: string;
  type: 'fixed' | 'custom';
  key: string;
  title: string;
  content?: string;
  isVisible: boolean;
}

export type PhotoSize = 'small' | 'medium' | 'large' | 'full';

export type PhotoLayout = 'grid-1' | 'grid-2' | 'grid-3' | 'carousel';

export interface ReportPhotoMeta {
  caption: string;
  size: PhotoSize;
  /** Custom width percentage (10-100) for granular control */
  widthPercent?: number;
  /** Horizontal alignment of the photo within the page */
  alignment?: 'left' | 'center' | 'right';
}

export interface ReportData {
  logo?: string;
  logoCenter?: string;
  logoSecondary?: string;
  headerBannerUrl?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  headerLeftText?: string;
  headerRightText?: string;
  footerText?: string;
  footerShowAddress?: boolean;
  footerShowContact?: boolean;
  footerAlignment?: 'left' | 'center' | 'right';
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
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  /** Per-activity overrides applied only at the report layer (does NOT modify Diário) */
  activityOverrides?: Record<string, ActivityOverride>;
  /** Hide the "Atividades realizadas" block (and dates/local/participantes) for a given section/goal key */
  hideActivitiesBySection?: Record<string, boolean>;
  /** Per-goal overrides for the photo gallery title ("REGISTROS FOTOGRÁFICOS – META N: ..."). Keyed by goal.id */
  goalTitleOverrides?: Record<string, { description?: string; hide?: boolean }>;
}

export interface ActivityOverride {
  description?: string;
  results?: string;
  photos?: string[];
  photoCaptions?: Record<string, string>;
  hidden?: boolean;
  /** Oculta apenas o texto de descrição/relato — mantém fotos visíveis */
  hideDescription?: boolean;
  /** Oculta apenas o texto de resultados — mantém fotos visíveis */
  hideResults?: boolean;
}

export interface AttendanceFile {
  name: string;
  url: string;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  fileName?: string;
  fileUrl?: string;
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
  isDraft?: boolean;
  photoCaptions?: Record<string, string>;
  attendanceFiles?: AttendanceFile[];
  expenseRecords?: ExpenseRecord[];
  /** Snapshot of author's role at the time of creation */
  projectRoleSnapshot?: string;
  /** Author info (joined from profiles) */
  authorName?: string;
  authorEmail?: string;
  /** Sector snapshot at creation time */
  setorResponsavel?: string;
  /** Created at timestamp from DB */
  createdAt?: string;
  /** Whether this activity is linked to a published report */
  isLinkedToReport?: boolean;
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
  // Dados jurídicos para Justificativas (Lei 13.019/2014)
  cnpjConvenente?: string;
  cnpjConcedente?: string;
  valorGlobal?: number;
  valorRepasse?: number;
  contrapartida?: number;
  responsavelNome?: string;
  responsavelCpf?: string;
  responsavelCargo?: string;
}

export interface PhotoWithCaption {
  id: string;
  url: string;
  caption: string;
}

export interface PhotoGroup {
  id: string;
  caption: string;
  photoIds: string[];
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
  photoGroups?: PhotoGroup[];
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
