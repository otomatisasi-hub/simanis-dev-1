// src/data/syariahWorkflows.ts
// Types and sample data for Syariah workflows


// Types for Syariah workflows (mirroring Notary/PPAT)
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
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  documents?: DocumentChecklistItem[];
}

export interface WorkflowTemplate {
  serviceType: string;
  subServiceType: string;
  documents: DocumentChecklistItem[];
  steps: WorkflowStep[];
  paymentTiming?: string;
}

export const syariahWorkflowTemplates: WorkflowTemplate[] = [
  {
    serviceType: "Akad",
    subServiceType: "Murabahah",
    documents: [
      { id: "doc-1", documentName: "KTP Nasabah", isRequired: true, isUploaded: false },
      { id: "doc-2", documentName: "NPWP Nasabah", isRequired: false, isUploaded: false },
      { id: "doc-3", documentName: "Surat Permohonan", isRequired: true, isUploaded: false },
    ],
    steps: [
      { id: "step-1", order: 1, stepName: "Persiapan Dokumen", status: "pending" },
      { id: "step-2", order: 2, stepName: "Verifikasi Data", status: "pending" },
      { id: "step-3", order: 3, stepName: "Penandatanganan Akad", status: "pending" },
    ],
    paymentTiming: "Pembayaran diawal"
  },
  // Add more templates as needed
];

export function getWorkflowTemplate(serviceType: string, subServiceType?: string): WorkflowTemplate | undefined {
  return syariahWorkflowTemplates.find(
    template =>
      template.serviceType === serviceType &&
      (!subServiceType || template.subServiceType === subServiceType)
  );
}
