// app/test-finance/page.tsx
'use client'

import { useFinanceDashboard, useFinanceStatistics } from '@/hooks/useFinance'

export default function TestFinancePage() {
  const { data: dashboard, loading: dashLoading } = useFinanceDashboard()
  const { data: stats, loading: statsLoading } = useFinanceStatistics()

  if (dashLoading || statsLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Finance API Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Statistics</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(stats, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Dashboard ({dashboard.length} records)</h2>
        <div className="space-y-2">
          {dashboard.slice(0, 3).map(item => (
            <div key={item.id} className="bg-gray-100 p-3 rounded">
              <p><strong>{item.follow_up_type}</strong> - {item.client_name}</p>
              <p>Rp {item.nominal?.toLocaleString('id-ID')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
