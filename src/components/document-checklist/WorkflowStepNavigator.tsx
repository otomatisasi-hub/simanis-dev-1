// src/components/document-checklist/WorkflowStepNavigator.tsx
'use client'

import { WorkflowTimeline } from './WorkflowTimeline'
import type { WorkflowStep } from './useDocumentChecklist'

interface WorkflowStepNavigatorProps {
  steps: WorkflowStep[]
  currentStepIndex: number
  onChangeStepIndex: (index: number) => void
}

export function WorkflowStepNavigator({
  steps,
  currentStepIndex,
  onChangeStepIndex,
}: WorkflowStepNavigatorProps) {
  return (
    <WorkflowTimeline
      steps={steps}
      currentStepIndex={currentStepIndex}
      onChangeStepIndex={onChangeStepIndex}
    />
  )
}
