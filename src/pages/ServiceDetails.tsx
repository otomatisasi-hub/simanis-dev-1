import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/custom-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertTriangle, User, Calendar, Download, Upload } from "lucide-react"
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ServiceDetail {
  id: string
  reference_number: string
  title: string
  description?: string
  status: string
  priority: string
  fee_amount?: number
  fee_status: string
  document_checklist_complete: boolean
  legality_verified: boolean
  estimated_completion_date?: string
  created_at: string
  category: {
    name: string
    type: string
  }
  client: {
    full_name: string
    client_type: string
  }
  assigned_to_profile?: {
    full_name: string
  }
}

interface Document {
  id: string
  document_name: string
  document_type: string
  file_url?: string
  verified_at?: string
  notes?: string
}

interface TimelineEntry {
  id: string
  action_type: string
  description: string
  created_at: string
  performer: {
    full_name: string
  }
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, color: 'bg-secondary' },
  in_progress: { label: 'Dalam Proses', variant: 'default' as const, color: 'bg-primary' },
  review: { label: 'Review', variant: 'outline' as const, color: 'bg-warning' },
  completed: { label: 'Selesai', variant: 'outline' as const, color: 'bg-success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' as const, color: 'bg-destructive' }
}

const priorityConfig = {
  low: { label: 'Rendah', color: 'text-muted-foreground' },
  normal: { label: 'Normal', color: 'text-foreground' },
  high: { label: 'Tinggi', color: 'text-warning' },
  urgent: { label: 'Mendesak', color: 'text-destructive' }
}

export function ServiceDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      fetchServiceDetails()
      fetchDocuments()
      fetchTimeline()
    }
  }, [id])

  const fetchServiceDetails = async () => {
    if (!id) return
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(name, type),
          client:clients(full_name, client_type)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      
      // Fetch assigned user profile separately
      let assignedProfile = null
      if (data.assigned_to) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.assigned_to)
          .single()
        
        assignedProfile = profileData
      }
      
      setService({
        ...data,
        assigned_to_profile: assignedProfile
      } as ServiceDetail)
    } catch (error) {
      console.error('Error fetching service details:', error)
      toast({
        variant: "destructive",
        title: "Gagal memuat detail layanan",
        description: "Terjadi kesalahan saat memuat detail layanan"
      })
    }
  }

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('service_documents')
        .select('*')
        .eq('service_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data as Document[] || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('service_timeline')
        .select('*')
        .eq('service_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch performer profiles separately
      const timelineWithPerformers = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', entry.performed_by)
            .single()
          
          return {
            ...entry,
            performer: profileData || { full_name: 'Unknown User' }
          }
        })
      )
      
      setTimeline(timelineWithPerformers as TimelineEntry[])
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateServiceStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      
      toast({
        title: "Status berhasil diperbarui",
        description: `Status layanan diubah menjadi ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`
      })
      
      fetchServiceDetails()
      fetchTimeline()
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        variant: "destructive",
        title: "Gagal memperbarui status",
        description: "Terjadi kesalahan saat memperbarui status layanan"
      })
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    
    try {
      const { error } = await supabase
        .from('service_timeline')
        .insert({
          service_id: id,
          action_type: 'note_added',
          description: newNote,
          performed_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error
      
      setNewNote('')
      fetchTimeline()
      toast({
        title: "Catatan berhasil ditambahkan",
        description: "Catatan telah ditambahkan ke timeline layanan"
      })
    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        variant: "destructive",
        title: "Gagal menambahkan catatan",
        description: "Terjadi kesalahan saat menambahkan catatan"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat detail layanan...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Layanan tidak ditemukan</p>
            <Button onClick={() => navigate('/services')} className="mt-4">
              Kembali ke Daftar Layanan
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const statusInfo = statusConfig[service.status as keyof typeof statusConfig]
  const priorityInfo = priorityConfig[service.priority as keyof typeof priorityConfig]
  
  const requiredDocs = documents.filter(d => d.document_type === 'required')
  const receivedDocs = documents.filter(d => d.document_type === 'received')
  const documentProgress = requiredDocs.length > 0 ? (receivedDocs.length / requiredDocs.length) * 100 : 0

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{service.title}</h1>
            <p className="text-muted-foreground">{service.reference_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <Badge variant="outline" className={priorityInfo.color}>
                        {priorityInfo.label}
                      </Badge>
                    </div>
                    <CardTitle>Informasi Layanan</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    {service.status === 'draft' && (
                      <Button size="sm" onClick={() => updateServiceStatus('in_progress')}>
                        Mulai Proses
                      </Button>
                    )}
                    {service.status === 'in_progress' && (
                      <Button size="sm" onClick={() => updateServiceStatus('review')}>
                        Kirim Review
                      </Button>
                    )}
                    {service.status === 'review' && (
                      <Button size="sm" onClick={() => updateServiceStatus('completed')}>
                        Tandai Selesai
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kategori</p>
                    <p className="text-sm">{service.category.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jenis</p>
                    <p className="text-sm">{service.category.type.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Klien</p>
                    <p className="text-sm">{service.client.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ditugaskan ke</p>
                    <p className="text-sm">{service.assigned_to_profile?.full_name || 'Belum ditugaskan'}</p>
                  </div>
                </div>
                {service.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Deskripsi</p>
                    <p className="text-sm">{service.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents">Dokumen</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="deed">Draft Akta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Checklist Dokumen</CardTitle>
                    <CardDescription>
                      Progress kelengkapan dokumen: {documentProgress.toFixed(0)}%
                    </CardDescription>
                    <Progress value={documentProgress} className="w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.document_name}</p>
                              {doc.notes && <p className="text-xs text-muted-foreground">{doc.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.document_type === 'received' ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Clock className="h-4 w-4 text-warning" />
                            )}
                            {doc.file_url && (
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline Aktivitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Tambahkan catatan..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={addNote} disabled={!newNote.trim()}>
                          Tambah
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {timeline.map((entry) => (
                          <div key={entry.id} className="flex gap-3 p-3 border-l-2 border-primary">
                            <div className="flex-1">
                              <p className="text-sm">{entry.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.performer.full_name} • {new Date(entry.created_at).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="deed">
                <Card>
                  <CardHeader>
                    <CardTitle>Draft Akta</CardTitle>
                    <CardDescription>
                      Kelola draft akta dan penjadwalan tanda tangan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Fitur draft akta akan segera tersedia</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status Progres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {service.document_checklist_complete ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" />
                  )}
                  <span className="text-sm">Checklist Dokumen</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {service.legality_verified ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  <span className="text-sm">Verifikasi Legalitas</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {service.fee_status === 'paid' ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" />
                  )}
                  <span className="text-sm">Pembayaran</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informasi Tambahan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tanggal Dibuat</p>
                  <p className="text-sm">{new Date(service.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                
                {service.estimated_completion_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target Selesai</p>
                    <p className="text-sm">{new Date(service.estimated_completion_date).toLocaleDateString('id-ID')}</p>
                  </div>
                )}
                
                {service.fee_amount && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Biaya</p>
                    <p className="text-sm">Rp {service.fee_amount.toLocaleString('id-ID')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}