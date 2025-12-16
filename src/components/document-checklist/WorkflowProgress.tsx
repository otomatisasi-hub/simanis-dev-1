// src/components/document-checklist/WorkflowProgress.tsx
'use client'

import { Progress } from '@/components/ui/progress'

interface WorkflowProgressProps {
  progressPercentage: number
  completedSteps: number
  totalSteps: number
}

export function WorkflowProgress({
  progressPercentage,
  completedSteps,
  totalSteps,
}: WorkflowProgressProps) {
  return (
    <div className="pt-4">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-gray-700">
          Proses {progressPercentage}%
        </p>
        <p className="text-xs text-gray-500">
          {completedSteps} dari {totalSteps} step
        </p>
      </div>
      <Progress value={progressPercentage} className="h-3" />
    </div>
  )
}
