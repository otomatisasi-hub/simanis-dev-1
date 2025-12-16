import { useState, useEffect } from 'react'
import axios from 'axios'

export interface WorkflowDocument {
  id: string
  document_name: string
  is_required: boolean
  is_uploaded: boolean
  file_url?: string
  uploaded_at?: string
}

export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'skipped'

export interface WorkflowStep {
  id: string
  step_order: number
  step_name: string
  description?: string
  status: StepStatus
  documents: WorkflowDocument[]
}

export function useWorkflowData(workflowInstanceId: string) {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workflowInstanceId) return

    setLoading(true)
    axios.get(`/api/workflow/${workflowInstanceId}/steps`)
      .then(({ data }) => {
        if (!data.success) throw new Error(data.error || 'Gagal memuat data')

        const mappedSteps: WorkflowStep[] = data.data.map((step: any) => ({
          id: step.id,
          step_order: step.step_order,
          step_name: step.workflow_template_steps.step_name,
          description: step.workflow_template_steps.description,
          status: step.status,
          documents: (step.pnbp_requests ?? []).map((doc: any) => ({
            id: doc.id,
            document_name: step.workflow_template_steps.step_name,
            is_required: step.workflow_template_steps.requires_document,
            is_uploaded: !!doc.finance_file_url,
            file_url: doc.finance_file_url,
            uploaded_at: doc.sent_at
          })),
        }))
        setSteps(mappedSteps)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [workflowInstanceId])

  return { steps, loading, error, setSteps }
}
