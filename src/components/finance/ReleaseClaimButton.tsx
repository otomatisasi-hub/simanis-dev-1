// src/components/finance/ReleaseClaimButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useReleaseTask } from '@/hooks/useFinance'
import { Loader2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ReleaseClaimButtonProps {
  financeId: string
  onSuccess?: () => void
}

export function ReleaseClaimButton({ financeId, onSuccess }: ReleaseClaimButtonProps) {
  const { releaseTask, loading } = useReleaseTask()
  const [open, setOpen] = useState(false)

  const handleRelease = async () => {
    const success = await releaseTask(financeId)
    if (success) {
      setOpen(false)
      onSuccess?.()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          size="sm"
          variant="outline"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <X className="h-4 w-4 mr-1" />
          )}
          Release
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release Claim?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda yakin ingin melepas claim tugas ini? Tugas akan kembali tersedia untuk di-claim user lain.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleRelease} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Melepas...
              </>
            ) : (
              'Ya, Release'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
