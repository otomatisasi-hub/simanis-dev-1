'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Edit, Loader2, X, AlertCircle, HardDrive, Folder } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"


interface WorksheetData {
  id: string
  title: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  reference_number: string
  description?: string
  notes?: string
  estimated_completion_date?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  fee_amount?: number
  fee_status?: 'unpaid' | 'partial' | 'paid'
  document_checklist_complete?: boolean
  legality_verified?: boolean
  clients?: {
    full_name: string
    company_name?: string
  }
  service_types?: {
    layanan: string
  }
  created_at?: string
}

interface WorksheetDetailViewProps {
  data: WorksheetData
  onSuccess?: () => void
}

export function WorksheetDetailView({ data, onSuccess }: WorksheetDetailViewProps) {
  const { toast } = useToast()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fileStorageLocation, setFileStorageLocation] = useState<string>('')
  
  const [formData, setFormData] = useState<WorksheetData>(data)

  useEffect(() => {
    // Fetch file storage location dari database
    fetchFileStorageLocation()
  }, [])

  const fetchFileStorageLocation = async () => {
    try {
      // Query ke tabel file_storage atau file_storage_location jika ada
      const { data: storageData, error } = await supabase
        .from('file_storage_location')
        .select('location_path')
        .eq('service_id', data.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching storage location:', error)
      }

      if (storageData) {
        setFileStorageLocation(storageData.location_path)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleInputChange = (field: keyof WorksheetData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSelectChange = (field: keyof WorksheetData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpdateData = async () => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('services')
        .update({
          title: formData.title,
          status: formData.status,
          description: formData.description,
          notes: formData.notes,
          estimated_completion_date: formData.estimated_completion_date,
          priority: formData.priority,
          fee_amount: formData.fee_amount,
          fee_status: formData.fee_status,
          document_checklist_complete: formData.document_checklist_complete,
          legality_verified: formData.legality_verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Data lembar kerja berhasil diperbarui",
      })
      
      setIsEditDialogOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Update error:', error)
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteData = async () => {
    try {
      setIsLoading(true)

      // Step 1: Hapus semua workflow instances terkait
      const { error: workflowError } = await supabase
        .from('workflow_instances')
        .delete()
        .eq('service_id', data.id)

      if (workflowError) {
        console.error('Delete workflow error:', workflowError)
        throw new Error(`Gagal menghapus workflow: ${workflowError.message}`)
      }

      // Step 2: Hapus semua service_documents terkait
      const { error: docsError } = await supabase
        .from('service_documents_unified')
        .delete()
        .eq('service_id', data.id)

      if (docsError) {
        console.error('Delete documents error:', docsError)
        throw new Error(`Gagal menghapus dokumen: ${docsError.message}`)
      }

      // Step 3: Hapus semua service_finances terkait
      const { error: financesError } = await supabase
        .from('service_finances')
        .delete()
        .eq('service_id', data.id)

      if (financesError) {
        console.error('Delete finances error:', financesError)
        throw new Error(`Gagal menghapus data keuangan: ${financesError.message}`)
      }

      // Step 4: Hapus service_timeline terkait
      const { error: timelineError } = await supabase
        .from('service_timeline')
        .delete()
        .eq('service_id', data.id)

      if (timelineError) {
        console.error('Delete timeline error:', timelineError)
        throw new Error(`Gagal menghapus timeline: ${timelineError.message}`)
      }

      // Step 5: Hapus file_storage_location terkait
      const { error: storageError } = await supabase
        .from('file_storage_location')
        .delete()
        .eq('service_id', data.id)

      if (storageError) {
        console.error('Delete storage location error:', storageError)
        // Tidak critical, lanjutkan
      }

      // Step 6: Hapus service
      const { error: serviceError } = await supabase
        .from('services')
        .delete()
        .eq('id', data.id)

      if (serviceError) {
        console.error('Delete service error:', serviceError)
        throw new Error(`Gagal menghapus lembar kerja: ${serviceError.message}`)
      }

      toast({
        title: "Success",
        description: "Lembar kerja dan semua data terkait berhasil dihapus",
      })
      
      setIsDeleteDialogOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Draft',
      'in_progress': 'Dalam Proses',
      'review': 'Review',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'low': return 'bg-green-50 text-green-700 border-green-200'
      case 'normal': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'urgent': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl">{data.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ref: {data.reference_number}
              </p>
              <div className="flex gap-2 mt-3">
                <Badge className={getStatusColor(data.status || 'draft')}>
                  {getStatusLabel(data.status || 'draft')}
                </Badge>
                {data.priority && (
                  <Badge variant="outline" className={getPriorityColor(data.priority)}>
                    {data.priority === 'low' ? 'Rendah' :
                     data.priority === 'normal' ? 'Normal' :
                     data.priority === 'high' ? 'Tinggi' : 'Urgent'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsEditDialogOpen(true)}
                variant="default"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update
              </Button>
              <Button 
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* ✅ NOTIFIKASI LOKASI SIMPAN FILE */}
          <Alert className="border-blue-200 bg-blue-50">
            <HardDrive className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <div>
                  <p className="font-semibold">Lokasi Penyimpanan File</p>
                  <p className="text-sm mt-1">
                    {fileStorageLocation ? (
                      <code className="bg-blue-100 px-2 py-1 rounded">{fileStorageLocation}</code>
                    ) : (
                      <span className="italic">Belum ada lokasi penyimpanan</span>
                    )}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Informasi Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Klien</label>
                <p className="text-sm mt-1 font-semibold">
                  {data.clients?.company_name || data.clients?.full_name || 'Unknown'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Jenis Layanan</label>
                <p className="text-sm mt-1">{data.service_types?.layanan || '-'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{data.description || '-'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Catatan</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{data.notes || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prioritas</label>
                <p className="text-sm mt-1">
                  {data.priority === 'low' ? 'Rendah' :
                   data.priority === 'normal' ? 'Normal' :
                   data.priority === 'high' ? 'Tinggi' :
                   data.priority === 'urgent' ? 'Urgent' : '-'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                <p className="text-sm mt-1">
                  {data.estimated_completion_date 
                    ? new Date(data.estimated_completion_date).toLocaleDateString('id-ID')
                    : '-'
                  }
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Biaya Layanan</label>
                <p className="text-sm mt-1">{formatCurrency(data.fee_amount)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status Pembayaran</label>
                <p className="text-sm mt-1">
                  {data.fee_status === 'paid' ? 'Lunas' :
                   data.fee_status === 'partial' ? 'Sebagian' :
                   data.fee_status === 'unpaid' ? 'Belum Dibayar' : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Checklist Status */}
          <div className="border-t pt-6 space-y-3">
            <h3 className="font-semibold">Status Checklist</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <input 
                  type="checkbox" 
                  checked={data.document_checklist_complete || false} 
                  disabled
                  className="h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium">Dokumen Lengkap</p>
                  <p className="text-xs text-muted-foreground">
                    {data.document_checklist_complete ? 'Sudah dilengkapi' : 'Belum lengkap'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <input 
                  type="checkbox" 
                  checked={data.legality_verified || false} 
                  disabled
                  className="h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium">Verifikasi Legalitas</p>
                  <p className="text-xs text-muted-foreground">
                    {data.legality_verified ? 'Sudah diverifikasi' : 'Belum diverifikasi'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Waktu Dibuat */}
          <div className="border-t pt-6">
            <label className="text-sm font-medium text-muted-foreground">Dibuat Pada</label>
            <p className="text-sm mt-1">
              {data.created_at 
                ? new Date(data.created_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '-'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Update Lembar Kerja</DialogTitle>
      <DialogDescription>
        Ubah informasi lembar kerja sesuai kebutuhan
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Form content tetap sama */}
    </div>

    <DialogFooter>
      <Button 
        variant="outline" 
        onClick={() => setIsEditDialogOpen(false)}
        disabled={isLoading}
      >
        Batal
      </Button>
      <Button 
        onClick={handleUpdateData}
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Simpan Perubahan
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Hapus Lembar Kerja?</DialogTitle>
      <DialogDescription>
        Apakah Anda yakin ingin menghapus lembar kerja <strong>{data.title}</strong> beserta semua data terkait? Tindakan ini tidak dapat dibatalkan.
      </DialogDescription>
    </DialogHeader>
    
    <DialogFooter>
      <Button 
        variant="outline" 
        onClick={() => setIsDeleteDialogOpen(false)}
        disabled={isLoading}
      >
        Batal
      </Button>
      <Button 
        variant="destructive"
        onClick={handleDeleteData}
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Hapus Semua Data
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Lembar Kerja?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus lembar kerja <strong>{data.title}</strong> beserta semua data terkait? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteData}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
