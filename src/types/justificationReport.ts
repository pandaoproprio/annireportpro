export interface AttachmentFileData {
  name: string;
  url: string;
}

export interface JustificationReport {
  id: string;
  projectId: string;
  objectSection: string;
  justificationSection: string;
  executedActionsSection: string;
  futureActionsSection: string;
  requestedDeadlineSection: string;
  attachmentsSection: string;
  attachmentFiles?: AttachmentFileData[];
  newDeadlineDate?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JustificationReportDraft {
  id?: string;
  projectId: string;
  objectSection: string;
  justificationSection: string;
  executedActionsSection: string;
  futureActionsSection: string;
  requestedDeadlineSection: string;
  attachmentsSection: string;
  newDeadlineDate?: string;
  isDraft: boolean;
}
