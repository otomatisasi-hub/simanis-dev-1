// src/components/finance/ProcessPaymentButton.tsx
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import type { FinanceRecord } from '@/lib/api/finance'

interface ProcessPaymentButtonProps {
  finance: FinanceRecord
  onSuccess?: () => void
}

export function ProcessPaymentButton({ finance, onSuccess }: ProcessPaymentButtonProps) {
  const handleClick = () => {
    // This button is now replaced by Review button in the table
    // Keeping it for backward compatibility
    console.log('Process payment for:', finance.id)
  }

  return (
    <Button 
      size="sm"
      variant="outline"
      onClick={handleClick}
    >
      <Wallet className="mr-2 h-4 w-4" />
      Bayar
    </Button>
  )
}
