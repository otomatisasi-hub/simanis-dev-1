// src/components/document-checklist/DocumentChecklistHeader.tsx
'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ServiceInfoCard } from './ServiceInfoCard'
import type { ServiceData, WorkflowStep } from './useDocumentChecklist'

interface DocumentChecklistHeaderProps {
  serviceData: ServiceData | null
  workflowSteps: WorkflowStep[]
  progressPercentage: number
  onBack: () => void
}

export function DocumentChecklistHeader({
  serviceData,
  workflowSteps,
  progressPercentage,
  onBack,
}: DocumentChecklistHeaderProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali ke Notaris
      </Button>

      <ServiceInfoCard
        serviceTitle={serviceData?.title}
        clientName={serviceData?.clients?.full_name}
        subLayanan={serviceData?.sub_layanan}
        layanan={serviceData?.layanan}
        status={serviceData?.status}
        progressPercentage={progressPercentage}
        completedSteps={workflowSteps.filter((s) => s.status === 'completed').length}
        totalSteps={workflowSteps.length}
      />
    </>
  )
}
