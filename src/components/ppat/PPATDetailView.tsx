'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Edit, Loader2, Plus, X, CheckCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface DirectorKTP {
  name: string
  ktp_url: string
  npwp_url: string
}

interface CommissionerDetail {
  name: string
  ktp_url: string
}

interface UploadedDocument {
  document_name: string
  file_url: string
  file_name: string
  uploaded_at: Date
}

interface PPATData {
  id: string
  full_name: string
  client_type: string
  email: string
  phone: string
  address: string
  company_name?: string
  jenis_layanan?: string
  deadline?: string
  director_ktp?: string | DirectorKTP[]
  commissioner_details?: CommissionerDetail[]
  mandatory_documents_uploaded?: UploadedDocument[]
  created_by?: string
  created_at?: string
}

interface PPATDetailViewProps {
  data: PPATData
  onSuccess?: () => void
}

export function PPATDetailView({ data, onSuccess }: PPATDetailViewProps) {
  const { toast } = useToast()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  
  const [formData, setFormData] = useState<PPATData>(data)
  const [directors, setDirectors] = useState<DirectorKTP[]>([{ name: '', ktp_url: '', npwp_url: '' }])
  const [commissioners, setCommissioners] = useState<CommissionerDetail[]>([{ name: '', ktp_url: '' }])
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('🔍 Current User:', user)
        console.log('🔍 User ID:', user?.id)
        
        if (userError || !user) {
          console.error('❌ Error fetching user:', userError)
          setCanDelete(false)
          return
        }

        console.log('🔍 Step 2 - Fetching role for user_id:', user.id)
        
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        console.log('📋 Step 3 - Role Data Raw:', roleData)
        console.log('📋 Role Data Type:', typeof roleData?.role)
        console.log('📋 Role Data Value:', roleData?.role)
        console.log('❌ Role Error:', roleError)

        if (roleError) {
          console.error('❌ Error fetching role:', roleError.message)
          setUserRole(null)
          setCanDelete(false)
          return
        }

        let role = ''
        if (typeof roleData?.role === 'string') {
          role = roleData.role
        } else if (roleData?.role) {
          role = String(roleData.role)
        }
        
        console.log('✅ Step 4 - Parsed Role:', role)
        
        setUserRole(role)
        
        const isPPAT = role.toLowerCase() === 'ppat'
        setCanDelete(isPPAT)
        
        console.log('🔒 Step 5 - Can Delete:', isPPAT)
        console.log('🔒 Role matches "ppat":', role === 'ppat')
        console.log('🔒 Role (lowercase) matches "ppat":', role.toLowerCase() === 'ppat')

      } catch (error: any) {
        console.error('💥 Catch Error:', error)
        setCanDelete(false)
      }
    }

    checkUserRole()
  }, [])

  useEffect(() => {
    if (typeof data.director_ktp === 'string') {
      try {
        const parsed = JSON.parse(data.director_ktp)
        setDirectors(Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ name: '', ktp_url: '', npwp_url: '' }])
      } catch {
        setDirectors([{ name: '', ktp_url: '', npwp_url: '' }])
      }
    } else if (Array.isArray(data.director_ktp)) {
      setDirectors(data.director_ktp.length > 0 ? data.director_ktp : [{ name: '', ktp_url: '', npwp_url: '' }])
    }

    if (Array.isArray(data.commissioner_details) && data.commissioner_details.length > 0) {
      setCommissioners(data.commissioner_details)
    }

    if (Array.isArray(data.mandatory_documents_uploaded) && data.mandatory_documents_uploaded.length > 0) {
      setUploadedDocuments(data.mandatory_documents_uploaded)
    }
  }, [data])

  const handleInputChange = (field: keyof PPATData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpdateData = async () => {
    try {
      console.log('📝 Update clicked')
      console.log('📝 Form Data:', formData)
      console.log('📝 Directors:', directors)
      console.log('📝 Commissioners:', commissioners)
      
      setIsLoading(true)
      
      const updatePayload = {
        full_name: formData.full_name,
        client_type: formData.client_type,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        company_name: formData.company_name || null,
        jenis_layanan: formData.jenis_layanan || null,
        deadline: formData.deadline || null,
        director_ktp: JSON.stringify(directors.filter(d => d.name)),
        commissioner_details: commissioners.filter(c => c.name) as any,
        mandatory_documents_uploaded: uploadedDocuments as any,
        updated_at: new Date().toISOString()
      }
      
      console.log('📝 Update Payload:', updatePayload)
      
      const { data: updatedData, error } = await supabase
        .from('clients')
        .update(updatePayload)
        .eq('id', data.id)
        .select()

      console.log('📝 Updated Data:', updatedData)
      console.log('❌ Update Error:', error)

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Data klien berhasil diperbarui",
      })
      
      setIsEditDialogOpen(false)
      
      setTimeout(() => {
        if (onSuccess) {
          console.log('🔄 Triggering parent refresh after update...')
          onSuccess()
        }
      }, 500)
    } catch (error: any) {
      console.error('💥 Update error:', error)
      console.error('💥 Error details:', error.message, error.hint, error.details)
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
    console.log('🗑️ Delete clicked - canDelete:', canDelete)
    console.log('🗑️ Delete clicked - userRole:', userRole)
    
    if (!canDelete) {
      toast({
        title: "Akses Ditolak",
        description: `Hanya user dengan role PPAT yang dapat menghapus data. Role Anda: ${userRole || 'Unknown'}`,
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)

      console.log('🗑️ Deleting services for client_id:', data.id)
      
      const { error: servicesError } = await supabase
        .from('services')
        .delete()
        .eq('client_id', data.id)

      if (servicesError) {
        console.error('❌ Services delete error:', servicesError)
        throw servicesError
      }

      console.log('✅ Services deleted')
      console.log('🗑️ Deleting client:', data.id)

      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', data.id)

      if (clientError) {
        console.error('❌ Client delete error:', clientError)
        throw clientError
      }

      console.log('✅ Client deleted successfully')

      toast({
        title: "Berhasil",
        description: "Data klien dan semua layanan terkait berhasil dihapus",
      })
      
      setIsDeleteDialogOpen(false)
      
      setTimeout(() => {
        if (onSuccess) {
          console.log('🔄 Triggering parent refresh after delete...')
          onSuccess()
        }
      }, 500)
      
    } catch (error: any) {
      console.error('💥 Delete error:', error)
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const showCorporateSections = formData.client_type === 'Badan Hukum'

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{data.full_name}</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                Tipe: <Badge variant="outline">{data.client_type}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  console.log('✏️ Edit button clicked')
                  console.log('✏️ Current formData:', formData)
                  setIsEditDialogOpen(true)
                }}
                variant="default"
                size="sm"
                disabled={isLoading}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Data
              </Button>
              {canDelete && (
                <Button 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  variant="destructive"
                  size="sm"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nama Klien</label>
                <p className="text-sm mt-1">{data.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Judul Layanan</label>
                <p className="text-sm mt-1">{data.company_name || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Jenis Klien</label>
                <p className="text-sm mt-1">{data.client_type}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm mt-1">{data.email || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telepon</label>
                <p className="text-sm mt-1">{data.phone || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Alamat</label>
                <p className="text-sm mt-1">{data.address || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Jenis Layanan</label>
                <p className="text-sm mt-1">{data.jenis_layanan || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                <p className="text-sm mt-1">
                  {data.deadline 
                    ? new Date(data.deadline).toLocaleDateString('id-ID')
                    : '-'
                  }
                </p>
              </div>
              
              <div>
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

              {userRole && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role Anda</label>
                  <div className="mt-1">
                    <Badge variant={canDelete ? "default" : "secondary"}>
                      {userRole} {canDelete && "(Dapat Hapus)"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {uploadedDocuments.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Dokumen Terupload</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uploadedDocuments.map((doc, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700">{doc.document_name}</p>
                        <p className="text-xs text-green-600 truncate">{doc.file_name}</p>
                      </div>
                      <a 
                        href={`http://localhost:3001/${doc.file_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Lihat
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Informasi Klien</DialogTitle>
            <DialogDescription>
              Ubah informasi klien sesuai kebutuhan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-lg">Informasi Klien</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Klien <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.full_name} 
                    onChange={(e) => handleInputChange('full_name', e.target.value)} 
                    placeholder="Nama Klien" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Judul Layanan</Label>
                  <Input 
                    value={formData.company_name || ''} 
                    onChange={(e) => handleInputChange('company_name', e.target.value)} 
                    placeholder="Contoh: Pendirian PT Sejahtera Jaya" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    value={formData.email || ''} 
                    onChange={(e) => handleInputChange('email', e.target.value)} 
                    placeholder="Email klien" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>No Telepon</Label>
                  <Input 
                    type="tel" 
                    value={formData.phone || ''} 
                    onChange={(e) => handleInputChange('phone', e.target.value)} 
                    placeholder="Nomor telepon" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input 
                  type="date" 
                  value={formData.deadline || ''} 
                  onChange={(e) => handleInputChange('deadline', e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Jenis Klien <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.client_type} 
                  onValueChange={(value) => handleInputChange('client_type', value)}
                >
                  <SelectTrigger className="bg-green-50">
                    <SelectValue placeholder="Pilih jenis klien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individu">Individu</SelectItem>
                    <SelectItem value="Badan Hukum">Badan Hukum</SelectItem>
                    <SelectItem value="Badan Non-Hukum">Badan Non-Hukum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Alamat</Label>
                <Textarea 
                  value={formData.address || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value)} 
                  placeholder="Alamat lengkap" 
                  rows={3} 
                />
              </div>
            </div>

            {showCorporateSections && (
              <>
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Direktur</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDirectors([...directors, { name: '', ktp_url: '', npwp_url: '' }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah Direktur
                    </Button>
                  </div>
                  {directors.map((director, index) => (
                    <div key={index} className="space-y-3 p-3 border rounded bg-white relative">
                      {directors.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-2 right-2" 
                          onClick={() => setDirectors(directors.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Nama</Label>
                          <Input 
                            placeholder="Nama direktur" 
                            value={director.name} 
                            onChange={(e) => {
                              const updated = [...directors]
                              updated[index].name = e.target.value
                              setDirectors(updated)
                            }} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>NPWP</Label>
                          <Input 
                            placeholder="NPWP direktur" 
                            value={director.npwp_url} 
                            onChange={(e) => {
                              const updated = [...directors]
                              updated[index].npwp_url = e.target.value
                              setDirectors(updated)
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Komisaris</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCommissioners([...commissioners, { name: '', ktp_url: '' }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah Komisaris
                    </Button>
                  </div>
                  {commissioners.map((commissioner, index) => (
                    <div key={index} className="space-y-3 p-3 border rounded bg-white relative">
                      {commissioners.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-2 right-2" 
                          onClick={() => setCommissioners(commissioners.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <Input 
                          placeholder="Nama komisaris" 
                          value={commissioner.name} 
                          onChange={(e) => {
                            const updated = [...commissioners]
                            updated[index].name = e.target.value
                            setCommissioners(updated)
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                console.log('❌ Cancel clicked')
                setIsEditDialogOpen(false)
              }} 
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button 
              onClick={() => {
                console.log('💾 Save clicked')
                handleUpdateData()
              }} 
              disabled={isLoading} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data Klien?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data <strong>{data.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.
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
              disabled={isLoading || !canDelete}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
