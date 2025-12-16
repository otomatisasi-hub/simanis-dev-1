import { supabase } from '@/integrations/supabase/client'

const API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
    ? process.env.NEXT_PUBLIC_API_URL!
    : 'http://localhost:3001'

// Interfaces (tetap sama seperti kamu punya)

async function getAuthToken(): Promise<string> {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Failed to get session from Supabase:', error)
      throw new Error('Authentication failed. Please login again.')
    }

    const session = data.session
    if (!session) {
      throw new Error('No active session. Please login again.')
    }

    return session.access_token
  } catch (err) {
    console.error('Failed to get auth token:', err)
    throw err instanceof Error
      ? err
      : new Error('Authentication failed. Please login again.')
  }
}

async function handleResponse<T>(response: Response, defaultError: string): Promise<T> {
  const text = await response.text()
  let json: any = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // ignore parse error, will fall back to defaultError
  }

  if (!response.ok) {
    const msg = json?.error || json?.message || `${defaultError} (HTTP ${response.status})`
    throw new Error(msg)
  }

  return json as T
}

export interface FinanceRecord {
  id: string;
  serviceid?: string;
  jenistransaksi?: string;
  nominal?: number | null;
  statuspembayaran?: string;
  duedate?: string;
  invoicenumber?: string | null;

  claimedby?: string | null;
  claimedat?: string | null;
  createdat?: string;
  notes?: string | null;

  servicetitle?: string;
  modul?: string;
  layanan?: string;
  sublayanan?: string;
  clientname?: string;
  clientphone?: string;
  clientemail?: string;

  createdbyname?: string;
  claimedbyname?: string;

  totalbayar?: number;
  sisabayar?: number;

  canclaim?: boolean;
  canprocesspayment?: boolean;
  claimstatus?: string;
}

// src/lib/api/finance.ts

export interface FinanceStatistics {
  pending_count: number
  in_progress_count: number
  completed_today: number
  completed_this_week: number
  completed_this_month: number
  total_amount_pending: number
  total_amount_completed_month: number
  pnbp_pending: number
  invoice_pending: number
  awaiting_validation: number
  hold_count: number
}



function mapDashboardRow(raw: any): FinanceRecord {
  return {
    finance_id: raw.servicefinanceid,
    service_id: raw.serviceid,
    follow_up_type: raw.jenistransaksi,          // 'Biaya Layanan'
    modul: raw.modul,
    layanan: raw.layanan,
    sub_layanan: raw.sublayanan,
    service_title: raw.servicetitle,
    client_name: raw.clientname,
    client_phone: raw.clientphone,
    nominal: Number(raw.nominal ?? 0),
    total_bayar: Number(raw.totalbayar ?? 0),
    sisa_bayar: Number(raw.sisabayar ?? 0),
    status_pembayaran: raw.statuspembayaran,
    claimed_by: raw.claimedby,
    claimed_by_name: raw.claimedbyname ?? null,
    claimed_at: raw.claimedat,
    claim_status: raw.claimstatus,
    can_claim: !!raw.canclaim,
  }
}



export const financeApi = {
  // 1) DASHBOARD
  async getDashboard(): Promise<{ success: boolean; data: any[]; total: number }> {
    const token = await getAuthToken();
    const url = `${API_URL}/api/finance/dashboard`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return handleResponse<typeof response extends never ? never : {
      success: boolean;
      data: any[];
      total: number;
    }>(response, "Failed to fetch dashboard");
  },

  // 2) WORKLOAD
  async getWorkload(): Promise<{ success: boolean; data: FinanceRecord[]; total: number }> {
    const token = await getAuthToken();
    const url = `${API_URL}/api/finance/workload`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return handleResponse(response, "Failed to fetch workload");
  },


  async getStatistics(): Promise<{ success: boolean; data: FinanceStatistics }> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/statistics`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return handleResponse(response, 'Failed to fetch statistics')
  },

  // Claim & Release
  async claimTask(financeId: string): Promise<{ success: boolean; message?: string }> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/claim`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ finance_id: financeId }),
    })

    return handleResponse(response, 'Failed to claim task')
  },

  async releaseClaim(financeId: string): Promise<{ success: boolean; message?: string }> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/release`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ finance_id: financeId }),
    })

    return handleResponse(response, 'Failed to release claim')
  },

  // Payment Management
  async recordPayment(data: RecordPaymentPayload): Promise<{ success: boolean; data: any }> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/payment`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    return handleResponse(response, 'Failed to record payment')
  },

  async getFinanceById(id: string): Promise<{ success: boolean; data: any }> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/${id}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return handleResponse(response, 'Failed to fetch detail')
  },

  async updateFinance(id: string, data: UpdateFinancePayload): Promise<{ success: boolean; data: any }> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/${id}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    return handleResponse(response, 'Failed to update finance')
  },

  // Invoice/PNBP Request Detail
  async getDetail(requestId: string): Promise<ApiResponse<InvoiceRequestDetail>> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/detail/${requestId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    return handleResponse(response, 'Failed to fetch detail')
  },

  async getInvoiceRequest(serviceId: string): Promise<ApiResponse<InvoiceRequestDetail | null>> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/invoice/request/${serviceId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    return handleResponse(response, 'Failed to fetch invoice request')
  },

  async getPnbpRequest(serviceId: string): Promise<ApiResponse<InvoiceRequestDetail | null>> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/pnbp/request/${serviceId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    return handleResponse(response, 'Failed to fetch PNBP request')
  },

  // Notaris Request Invoice/PNBP
  async requestInvoice(serviceId: string, workflowStepInstanceId: string): Promise<ApiResponse<any>> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/invoice/request`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serviceId, workflowStepInstanceId }),
    })

    return handleResponse(response, 'Failed to request invoice')
  },

  async requestPnbp(serviceId: string, workflowStepInstanceId: string): Promise<ApiResponse<any>> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/pnbp/request`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serviceId, workflowStepInstanceId }),
    })

    return handleResponse(response, 'Failed to request PNBP')
  },

  // Notaris Upload Payment Proof
  async uploadInvoicePaymentProof(requestId: string, file: File, paidAt: string, notes?: string): Promise<ApiResponse<any>> {
    const token = await getAuthToken()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('requestId', requestId)
    formData.append('paidAt', paidAt)
    if (notes) formData.append('notes', notes)

    const url = `${API_URL}/api/invoice/upload-payment-proof`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    return handleResponse(response, 'Failed to upload payment proof')
  },

  async uploadPnbpPaymentProof(requestId: string, file: File, paidAt: string, notes?: string): Promise<ApiResponse<any>> {
    const token = await getAuthToken()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('requestId', requestId)
    formData.append('paidAt', paidAt)
    if (notes) formData.append('notes', notes)

    const url = `${API_URL}/api/pnbp/upload-payment-proof`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    return handleResponse(response, 'Failed to upload PNBP payment proof')
  },

  // Keuangan Validate Payment
  async validatePayment(requestId: string, isApproved: boolean, notes?: string): Promise<ApiResponse<any>> {
    const token = await getAuthToken()
    const url = `${API_URL}/api/finance/validate-payment`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId, isApproved, notes }),
    })

    return handleResponse(response, 'Failed to validate payment')
  },
}


