// Sample workflow templates for PPAT (add more as needed)
export const ppatWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: "ppat-001",
    name: "Jual Beli Tanah",
    paymentTiming: "Pembayaran diawal",
    steps: [
      { id: "step-1", order: 1, stepName: "Persiapan Dokumen", status: "pending" },
      { id: "step-2", order: 2, stepName: "Verifikasi Data", status: "pending" },
      { id: "step-3", order: 3, stepName: "Penandatanganan Akta", status: "pending" },
    ],
  },
  // Add more templates as needed
];

export function getWorkflowTemplate(name: string): WorkflowTemplate | undefined {
  return ppatWorkflowTemplates.find(
    template => template.name === name
  );
}
// Types for PPAT workflows (copied from notaryWorkflows)

export interface DocumentChecklistItem {
  id: string;
  documentName: string;
  isRequired: boolean;
  isUploaded: boolean;
  fileUrl?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  stepName: string;
  status: 'pending' | 'in-progress' | 'completed';
  description?: string;
  completedAt?: Date;
  documents?: DocumentChecklistItem[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  paymentTiming?: string;
  steps: WorkflowStep[];
}
