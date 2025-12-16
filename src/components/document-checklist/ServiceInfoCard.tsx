// src/components/document-checklist/ServiceInfoCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ServiceInfoCardProps {
  serviceTitle?: string
  clientName?: string
  subLayanan?: string
  layanan?: string
  status?: string
  progressPercentage: number
  completedSteps: number
  totalSteps: number
}

export function ServiceInfoCard({
  serviceTitle,
  clientName,
  subLayanan,
  layanan,
  status,
  progressPercentage,
  completedSteps,
  totalSteps,
}: ServiceInfoCardProps) {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold text-gray-900">
          {serviceTitle || 'Layanan Notaris'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Klien</p>
            <p className="font-semibold text-gray-900">
              {clientName || '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Jenis Layanan</p>
            <p className="font-semibold text-gray-900">
              {subLayanan || layanan || '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
              {status || 'Draft'}
            </Badge>
          </div>
        </div>

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
      </CardContent>
    </Card>
  )
}
