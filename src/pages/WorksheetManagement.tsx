import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlobalFilters, FilterValues } from "@/components/shared/GlobalFilters"
import { Header } from "@/components/layout/Header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Play, 
  Upload,
  FileText,
  Users,
  Building,
  CheckSquare,
  Square,
  Eye
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"

interface WorkflowStep {
  id: string
  service_id: string
  step_name: string
  step_order: number
  status: 'Belum Mulai' | 'Proses' | 'Selesai'
  is_ppat_step: boolean
  ppat_warkah_number?: string
  ppat_agenda_number?: string
  ppat_entry_date?: string
  ppat_exit_date?: string
  ppat_certificate_check?: string
  started_at?: string
  completed_at?: string
  notes?: string
}

interface DocumentChecklistItem {
  id: string
  service_id: string
  document_group: string
  document_name: string
  is_required: boolean
  is_completed: boolean
  file_url?: string
  notes?: string
}

interface ServiceData {
  id: string
  reference_number: string
  title: string
  status: string
  client_name: string
  service_category: string
  steps: WorkflowStep[]
  documents: DocumentChecklistItem[]
}

interface PPATFormData {
  warkah_number: string
  agenda_number: string
  entry_date: string
  exit_date: string
  certificate_check: string
}

export function WorksheetManagement() {
  const [services, setServices] = useState<ServiceData[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceData[]>([])
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPPATDialog, setShowPPATDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNotes, setUploadNotes] = useState("")
  const [ppatFormData, setPPATFormData] = useState<PPATFormData>({
    warkah_number: '',
    agenda_number: '',
    entry_date: '',
    exit_date: '',
    certificate_check: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    loadWorksheetData()
  }, [])

  const loadWorksheetData = async () => {
    try {
      setLoading(true)
      
      // Load services with their workflow steps and document checklist
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          reference_number,
          title,
          status,
          clients!inner (
            full_name,
            company_name,
            client_type
          )
        `)

      if (servicesError) throw servicesError

      const formattedServices: ServiceData[] = []

      for (const service of servicesData || []) {
        // Load workflow steps
        const { data: stepsData } = await supabase
          .from('service_workflow_steps')
          .select('*')
          .eq('service_id', service.id)
          .order('step_order')

        // Load document checklist
        const { data: documentsData } = await supabase
          .from('service_document_checklist')
          .select('*')
          .eq('service_id', service.id)

        formattedServices.push({
          id: service.id,
          reference_number: service.reference_number,
          title: service.title,
          status: service.status,
          client_name: service.clients.client_type === 'individual' 
            ? service.clients.full_name 
            : service.clients.company_name || service.clients.full_name,
          service_category: service.title.includes('PT') || service.title.includes('CV') ? 'Notaris' : 'PPAT',
          steps: (stepsData || []).map((step: any) => ({
            ...step,
            status: step.status as 'Belum Mulai' | 'Proses' | 'Selesai'
          })),
          documents: documentsData || []
        })
      }

      setServices(formattedServices)
      setFilteredServices(formattedServices)
    } catch (error) {
      console.error('Error loading worksheet data:', error)
      toast({
        title: "Error",
        description: "Gagal memuat data lembar kerja",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = (filters: FilterValues) => {
    let filtered = [...services]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(service => 
        service.reference_number.toLowerCase().includes(searchLower) ||
        service.title.toLowerCase().includes(searchLower) ||
        service.client_name.toLowerCase().includes(searchLower)
      )
    }

    if (filters.layanan !== 'all') {
      filtered = filtered.filter(service => 
        service.title.toLowerCase().includes(filters.layanan.toLowerCase())
      )
    }

    setFilteredServices(filtered)
  }

  const updateStepStatus = async (stepId: string, newStatus: 'Belum Mulai' | 'Proses' | 'Selesai') => {
    try {
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'Proses' && !selectedStep?.started_at) {
        updates.started_at = new Date().toISOString()
        updates.started_by = (await supabase.auth.getUser()).data.user?.id
      } else if (newStatus === 'Selesai') {
        updates.completed_at = new Date().toISOString()
        updates.completed_by = (await supabase.auth.getUser()).data.user?.id
      }

      const { error } = await supabase
        .from('service_workflow_steps')
        .update(updates)
        .eq('id', stepId)

      if (error) throw error

      // Reload data to reflect changes
      await loadWorksheetData()
      
      toast({
        title: "Berhasil",
        description: `Status langkah berhasil diubah ke ${newStatus}`
      })
    } catch (error) {
      console.error('Error updating step status:', error)
      toast({
        title: "Error",
        description: "Gagal mengubah status langkah",
        variant: "destructive"
      })
    }
  }

  const updateDocumentStatus = async (documentId: string, isCompleted: boolean) => {
    try {
      const updates: any = { 
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      }

      if (isCompleted) {
        updates.uploaded_at = new Date().toISOString()
        updates.uploaded_by = (await supabase.auth.getUser()).data.user?.id
      }

      const { error } = await supabase
        .from('service_document_checklist')
        .update(updates)
        .eq('id', documentId)

      if (error) throw error

      // Update local state
      if (selectedService) {
        const updatedDocuments = selectedService.documents.map(doc =>
          doc.id === documentId ? { ...doc, is_completed: isCompleted } : doc
        )
        setSelectedService({ ...selectedService, documents: updatedDocuments })
      }

      toast({
        title: "Berhasil",
        description: `Dokumen ${isCompleted ? 'ditandai selesai' : 'ditandai belum selesai'}`
      })
    } catch (error) {
      console.error('Error updating document status:', error)
      toast({
        title: "Error",
        description: "Gagal mengubah status dokumen",
        variant: "destructive"
      })
    }
  }

  const savePPATData = async () => {
    if (!selectedStep) return

    try {
      const { error } = await supabase
        .from('service_workflow_steps')
        .update({
          ppat_warkah_number: ppatFormData.warkah_number,
          ppat_agenda_number: ppatFormData.agenda_number,
          ppat_entry_date: ppatFormData.entry_date || null,
          ppat_exit_date: ppatFormData.exit_date || null,
          ppat_certificate_check: ppatFormData.certificate_check,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStep.id)

      if (error) throw error

      setShowPPATDialog(false)
      setPPATFormData({
        warkah_number: '',
        agenda_number: '',
        entry_date: '',
        exit_date: '',
        certificate_check: ''
      })

      await loadWorksheetData()

      toast({
        title: "Berhasil",
        description: "Data PPAT berhasil disimpan"
      })
    } catch (error) {
      console.error('Error saving PPAT data:', error)
      toast({
        title: "Error",
        description: "Gagal menyimpan data PPAT",
        variant: "destructive"
      })
    }
  }

  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case 'Belum Mulai':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Belum Mulai</Badge>
      case 'Proses':
        return <Badge variant="outline" className="bg-warning/10 text-warning">Proses</Badge>
      case 'Selesai':
        return <Badge variant="outline" className="bg-success/10 text-success">Selesai</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const groupDocumentsByCategory = (documents: DocumentChecklistItem[]) => {
    return documents.reduce((groups, doc) => {
      const group = groups[doc.document_group] || []
      groups[doc.document_group] = [...group, doc]
      return groups
    }, {} as Record<string, DocumentChecklistItem[]>)
  }

  const getDocumentGroupIcon = (group: string) => {
    switch (group) {
      case 'pihak_perorangan':
        return Users
      case 'pihak_badan_hukum':
        return Building
      case 'objek':
        return FileText
      default:
        return FileText
    }
  }

  const getDocumentGroupLabel = (group: string) => {
    switch (group) {
      case 'pihak_perorangan':
        return 'Dokumen Pihak Perorangan'
      case 'pihak_badan_hukum':
        return 'Dokumen Pihak Badan Hukum'
      case 'objek':
        return 'Dokumen Objek'
      case 'pendukung':
        return 'Dokumen Pendukung'
      default:
        return group.replace('_', ' ').toUpperCase()
    }
  }

  const handleViewDetails = async (service: ServiceData) => {
    setSelectedService(service)
    setShowDetailDialog(true)
    
    // Fetch timeline
    try {
      const { data, error } = await supabase
        .from('service_timeline')
        .select('*, performed_by:profiles!service_timeline_performed_by_fkey(full_name)')
        .eq('service_id', service.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTimeline(data || [])
    } catch (error) {
      console.error('Error fetching timeline:', error)
    }
  }

  const handleUploadDocument = async (file: File, documentType: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // ⬇️ TAMBAHKAN CONTEXT (wajib untuk folder dinamis)
      formData.append('modul', service.menu_layanan || 'notaris');
      formData.append('layanan', service.layanan || 'umum');
      formData.append('subLayanan', service.sub_layanan || '');
      formData.append('clientName', service.clients?.full_name || 'unknown');
      formData.append('serviceName', service.title || 'service');
      formData.append('documentName', documentType); // 'ktp', 'npwp', 'akta'
  
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: formData,
      });
  
      const result = await response.json();
  
      if (result.success) {
        console.log('✅ File uploaded:', result.data.url);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  };
  

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <Header />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Lembar Kerja
          </h1>
          <p className="text-muted-foreground">Kelola alur kerja dan checklist dokumen layanan</p>
        </div>

        <GlobalFilters onFiltersChange={handleFiltersChange} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Services List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Daftar Layanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Memuat...</div>
              ) : (
                filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      selectedService?.id === service.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="space-y-2">
                      <div 
                        className="space-y-1 cursor-pointer"
                        onClick={() => setSelectedService(service)}
                      >
                        <div className="font-medium text-sm">{service.reference_number}</div>
                        <div className="text-xs text-muted-foreground">{service.client_name}</div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {service.service_category}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {service.steps.filter(s => s.status === 'Selesai').length}/{service.steps.length} langkah
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails(service)
                        }}
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Lihat Detail
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Workflow Steps */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedService ? `Alur Kerja - ${selectedService.reference_number}` : 'Pilih Layanan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedService ? (
                <div className="space-y-6">
                  {/* Progress Tracker */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Langkah-langkah Kerja</h3>
                    <div className="space-y-3">
                      {selectedService.steps.map((step, index) => (
                        <div key={step.id} className="flex items-start space-x-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                              step.status === 'Selesai' 
                                ? "bg-success text-success-foreground"
                                : step.status === 'Proses'
                                ? "bg-warning text-warning-foreground"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {step.status === 'Selesai' ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : step.status === 'Proses' ? (
                                <Clock className="h-4 w-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            {index < selectedService.steps.length - 1 && (
                              <div className="w-0.5 h-6 bg-border mt-1" />
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{step.step_name}</span>
                                {step.is_ppat_step && (
                                  <Badge variant="outline" className="bg-teal/10 text-teal text-xs">
                                    PPAT
                                  </Badge>
                                )}
                              </div>
                              {getStepStatusBadge(step.status)}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStepStatus(step.id, 'Proses')}
                                disabled={step.status === 'Proses' || step.status === 'Selesai'}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Mulai
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStepStatus(step.id, 'Selesai')}
                                disabled={step.status === 'Selesai'}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Selesai
                              </Button>
                              
                              {step.is_ppat_step && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStep(step)
                                    setPPATFormData({
                                      warkah_number: step.ppat_warkah_number || '',
                                      agenda_number: step.ppat_agenda_number || '',
                                      entry_date: step.ppat_entry_date || '',
                                      exit_date: step.ppat_exit_date || '',
                                      certificate_check: step.ppat_certificate_check || ''
                                    })
                                    setShowPPATDialog(true)
                                  }}
                                >
                                  Data BPN
                                </Button>
                              )}
                            </div>
                            
                            {step.notes && (
                              <p className="text-sm text-muted-foreground">{step.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Document Checklist */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Checklist Dokumen</h3>
                    <div className="space-y-4">
                      {Object.entries(groupDocumentsByCategory(selectedService.documents)).map(([group, documents]) => {
                        const IconComponent = getDocumentGroupIcon(group)
                        return (
                          <Card key={group}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                {getDocumentGroupLabel(group)}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      checked={doc.is_completed}
                                      onCheckedChange={(checked) => 
                                        updateDocumentStatus(doc.id, !!checked)
                                      }
                                    />
                                    <span className={cn(
                                      "text-sm",
                                      doc.is_completed && "line-through text-muted-foreground"
                                    )}>
                                      {doc.document_name}
                                    </span>
                                    {doc.is_required && (
                                      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
                                        Wajib
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <Button variant="ghost" size="sm">
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Pilih layanan untuk melihat lembar kerja
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PPAT Dialog */}
      <Dialog open={showPPATDialog} onOpenChange={setShowPPATDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Data PPAT - {selectedStep?.step_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warkah">Nomor Warkah BPN</Label>
              <Input
                id="warkah"
                value={ppatFormData.warkah_number}
                onChange={(e) => setPPATFormData(prev => ({...prev, warkah_number: e.target.value}))}
                placeholder="Masukkan nomor warkah"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agenda">Nomor Agenda BPN</Label>
              <Input
                id="agenda"
                value={ppatFormData.agenda_number}
                onChange={(e) => setPPATFormData(prev => ({...prev, agenda_number: e.target.value}))}
                placeholder="Masukkan nomor agenda"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="entry-date">Tanggal Masuk</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={ppatFormData.entry_date}
                  onChange={(e) => setPPATFormData(prev => ({...prev, entry_date: e.target.value}))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exit-date">Tanggal Keluar</Label>
                <Input
                  id="exit-date"
                  type="date"
                  value={ppatFormData.exit_date}
                  onChange={(e) => setPPATFormData(prev => ({...prev, exit_date: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="certificate-check">Bukti Cek Sertifikat</Label>
              <Textarea
                id="certificate-check"
                value={ppatFormData.certificate_check}
                onChange={(e) => setPPATFormData(prev => ({...prev, certificate_check: e.target.value}))}
                placeholder="Hasil pengecekan sertifikat..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPPATDialog(false)}>
                Batal
              </Button>
              <Button onClick={savePPATData}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Checklist, Timeline and Upload */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Layanan - {selectedService?.reference_number}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checklist">Checklist Dokumen</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="upload">Upload Dokumen</TabsTrigger>
            </TabsList>
            
            <TabsContent value="checklist" className="space-y-4 mt-4">
              {selectedService && (
                <div className="space-y-4">
                  {Object.entries(groupDocumentsByCategory(selectedService.documents)).map(([group, documents]) => {
                    const IconComponent = getDocumentGroupIcon(group)
                    return (
                      <Card key={group}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {getDocumentGroupLabel(group)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={doc.is_completed}
                                  onCheckedChange={(checked) => 
                                    updateDocumentStatus(doc.id, !!checked)
                                  }
                                />
                                <span className={cn(
                                  "text-sm",
                                  doc.is_completed && "line-through text-muted-foreground"
                                )}>
                                  {doc.document_name}
                                </span>
                                {doc.is_required && (
                                  <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
                                    Wajib
                                  </Badge>
                                )}
                              </div>
                              
                              {doc.is_completed && (
                                <Badge variant="outline" className="text-xs bg-success/10 text-success">
                                  Selesai
                                </Badge>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4 mt-4">
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada aktivitas</p>
                ) : (
                  timeline.map((item) => (
                    <div key={item.id} className="flex gap-4 border-l-2 border-primary/20 pl-4 py-2">
                      <div className="flex-shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.action_type}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          oleh: {item.performed_by?.full_name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="document-upload">Pilih File</Label>
                  <Input
                    id="document-upload"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="upload-notes">Catatan</Label>
                  <Textarea
                    id="upload-notes"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Tambahkan catatan untuk dokumen ini..."
                    className="mt-2"
                  />
                </div>
                
                <Button 
                  onClick={handleUploadDocument}
                  disabled={!uploadFile}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Dokumen
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}