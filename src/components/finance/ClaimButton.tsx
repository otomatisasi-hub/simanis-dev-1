import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClaimTask } from '@/hooks/useFinance'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ClaimButtonProps {
  financeId: string
  onSuccess?: () => void
}

export function ClaimButton({ financeId, onSuccess }: ClaimButtonProps) {
  const { claimTask, loading } = useClaimTask()
  const { toast } = useToast()

  const handleClaim = async () => {
    console.log('🔵 Attempt to claim financeId:', financeId)

    if (!financeId) {
      console.error('❌ financeId is required but missing:', financeId)
      toast({
        title: 'Error',
        description: 'Finance ID tidak valid',
        variant: 'destructive',
      })
      return
    }

    try {
      console.log('📤 Calling claimTask...')
      const success = await claimTask(financeId)
      
      console.log('📥 claimTask result:', { success })

      if (success) {
        console.log('✅ Claim berhasil')
        toast({
          title: 'Berhasil',
          description: 'Task berhasil di-claim',
        })
        
        if (onSuccess) {
          console.log('🔄 Calling onSuccess callback...')
          onSuccess()
        }
      } else {
        console.error('❌ Claim gagal: success = false')
        toast({
          title: 'Error',
          description: 'Gagal claim task',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('❌ Claim error exception:', error)
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan saat claim task',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button size="sm" onClick={handleClaim} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Claiming...
        </>
      ) : (
        'Claim'
      )}
    </Button>
  )
}
