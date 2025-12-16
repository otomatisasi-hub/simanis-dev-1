// src/components/document-checklist/WorkflowTimeline.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from 'lucide-react'

export interface WorkflowStep {
  id: string
  step_order: number
  step_name: string
  status: 'pending' | 'in-progress' | 'completed' | 'skipped'
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[]
  currentStepIndex: number
  onChangeStepIndex: (index: number) => void
}

function getStepStatusBadge(step: WorkflowStep) {
  if (step.status === 'completed') {
    return <Badge className="bg-blue-600 text-white">Selesai</Badge>
  }
  if (step.status === 'in-progress') {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
        Dikerjakan
      </Badge>
    )
  }
  return <Badge variant="secondary">Pending</Badge>
}

export function WorkflowTimeline({
  steps,
  currentStepIndex,
  onChangeStepIndex,
}: WorkflowTimelineProps) {
  if (!steps || steps.length === 0) return null

  return (
    <Card className="bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Timeline Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-0 min-w-max">
            {steps.map((step, index) => {
              const isCompleted = step.status === 'completed'
              const isInProgress = step.status === 'in-progress'
              const isCurrent = index === currentStepIndex
              const isLast = index === steps.length - 1

              return (
                <div key={step.id} className="flex items-start">
                  <button
                    type="button"
                    onClick={() => onChangeStepIndex(index)}
                    className="flex flex-col items-center min-w-[200px] focus:outline-none"
                  >
                    <div
                      className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                        isCompleted
                          ? 'bg-blue-500 border-blue-500'
                          : isInProgress || isCurrent
                          ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-200'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-7 h-7 text-white" />
                      ) : (
                        <Circle className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="mt-3 text-center px-2">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted ? 'text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {step.step_name}
                      </p>
                      {getStepStatusBadge(step)}
                    </div>
                  </button>

                  {!isLast && (
                    <div
                      className="flex items-center"
                      style={{ marginTop: '24px' }}
                    >
                      <div
                        className={`h-1 w-12 transition-all duration-500 ${
                          isCompleted ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
