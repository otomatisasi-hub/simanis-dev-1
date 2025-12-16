// src/pages/FileStorageLocation.tsx
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  FolderOpen,
  Eye,
  Search,
  Loader2,
  Download,
  FileText,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { Header } from "@/components/layout/Header"

const API_URL = "http://localhost:3001"

interface StorageLocation {
  id: string
  service_id: string
  storage_location: string
  floor_number?: string
  rack_number?: string
  row_number?: string
  nomor_buku?: string
  nomor_lembar?: string
  notes?: string
  created_at: string
  services?: {
    title: string
    deadline: string | null
    layanan: string | null
    menu_layanan?: string | null
    fee_amount: number | null
    clients?: {
      full_name: string
      company_name: string | null
    }
    service_finances?: {
      amount: number
    }[]
  }
}

interface WorkflowStep {
  id: string
  step_name: string
  step_order: number
  documents: {
    id: string
    document_name: string
    is_uploaded: boolean
    file_url: string | null
  }[]
}

export function FileStorageLocation() {
  const [records, setRecords] = useState<StorageLocation[]>([])
  const [filteredRecords, setFilteredRecords] = useState<StorageLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<StorageLocation | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)

  // Viewer dialog
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<WorkflowStep["documents"]>([])
  const [selectedStepName, setSelectedStepName] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    loadStorageRecords()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, filterYear, filterMonth, records])

  const loadStorageRecords = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("document_storage_locations")
        .select(`
          *,
          services!document_storage_locations_service_id_fkey (
            title,
            deadline,
            menu_layanan,
            layanan,
            fee_amount,
            clients:client_id (
              full_name,
              company_name
            ),
            service_finances (
              amount
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setRecords(data || [])
      setFilteredRecords(data || [])
    } catch (error: any) {
      console.error("Error loading storage records:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data lokasi simpan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadWorkflowDocuments = async (serviceId: string) => {
    try {
      setDocumentsLoading(true)

      const { data: wfInstance } = await supabase
        .from("workflow_instances")
        .select("id")
        .eq("service_id", serviceId)
        .maybeSingle()

      if (!wfInstance) {
        setWorkflowSteps([])
        return
      }

      const { data: stepsData, error: stepsError } = await supabase
        .from("workflow_step_instances")
        .select(`
          id,
          step_order,
          workflow_template_steps (
            step_name
          )
        `)
        .eq("workflow_instance_id", wfInstance.id)
        .order("step_order", { ascending: true })

      if (stepsError) throw stepsError

      const { data: docsData } = await supabase
        .from("service_documents_unified")
        .select("id, document_name, is_uploaded, file_url, workflow_step_instance_id")
        .eq("service_id", serviceId)
        .eq("is_uploaded", true)

      const mappedSteps: WorkflowStep[] = (stepsData || []).map((step: any) => ({
        id: step.id,
        step_name: step.workflow_template_steps?.step_name || `Step ${step.step_order}`,
        step_order: step.step_order,
        documents: (docsData || []).filter(
          (d: any) => d.workflow_step_instance_id === step.id
        ),
      }))

      setWorkflowSteps(mappedSteps)
    } catch (error) {
      console.error("Error loading workflow docs:", error)
    } finally {
      setDocumentsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...records]

    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.services?.title?.toLowerCase().includes(lower) ||
          r.services?.clients?.full_name?.toLowerCase().includes(lower) ||
          r.storage_location?.toLowerCase().includes(lower)
      )
    }

    if (filterYear || filterMonth) {
      filtered = filtered.filter((r) => {
        const dateStr = r.services?.deadline || r.created_at
        if (!dateStr) return false
        const d = new Date(dateStr)
        const year = d.getFullYear().toString()
        const month = (d.getMonth() + 1).toString()

        if (filterYear && year !== filterYear) return false
        if (filterMonth && month !== filterMonth) return false
        return true
      })
    }

    setFilteredRecords(filtered)
  }

  const openDetailDialog = async (record: StorageLocation) => {
    setSelectedRecord(record)
    setDetailDialogOpen(true)
    await loadWorkflowDocuments(record.service_id)
  }

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return "Rp 0"
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  /**
   * ✅ PERBAIKAN: Normalisasi file URL sesuai dengan server.js
   * Server melayani static files dari: app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))
   * Jadi URL yang benar adalah: http://localhost:3001/uploads/...
   */
  const normalizeFileUrl = (fileUrl: string | null): string => {
    if (!fileUrl) return ""

    console.log("🔍 normalizeFileUrl - Input:", fileUrl)

    let normalized = fileUrl.trim()

    // 1. Jika sudah absolute URL (http://...), return as-is
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      console.log("✅ Already absolute URL:", normalized)
      return normalized
    }

    // 2. Normalisasi backslash ke forward slash (Windows compatibility)
    normalized = normalized.replace(/\\/g, "/")

    // 3. Extract path mulai dari /uploads
    const uploadsIndex = normalized.indexOf("/uploads")
    if (uploadsIndex !== -1) {
      normalized = normalized.substring(uploadsIndex)
    }

    // 4. Pastikan diawali dengan /uploads
    if (!normalized.startsWith("/uploads")) {
      // Jika tidak ada /uploads, tambahkan
      if (normalized.startsWith("/")) {
        normalized = "/uploads" + normalized
      } else {
        normalized = "/uploads/" + normalized
      }
    }

    // 5. Build full URL
    const fullUrl = `${API_URL}${normalized}`

    console.log("✅ normalizeFileUrl - Output:", fullUrl)

    return fullUrl
  }

  // View Documents - buka dialog viewer
  const handleViewDocuments = (step: WorkflowStep) => {
    if (step.documents.length === 0) {
      toast({
        title: "Tidak ada dokumen",
        description: "Belum ada dokumen yang diupload untuk langkah ini",
        variant: "destructive",
      })
      return
    }

    setSelectedDocuments(step.documents)
    setSelectedStepName(step.step_name)
    setViewerDialogOpen(true)
  }

  /**
   * ✅ PERBAIKAN: Open file dengan URL yang sudah dinormalisasi
   */
  const handleOpenFile = (doc: WorkflowStep["documents"][0]) => {
    if (!doc.file_url) {
      toast({
        title: "Gagal",
        description: "File URL tidak tersedia",
        variant: "destructive",
      })
      return
    }

    const fullUrl = normalizeFileUrl(doc.file_url)

    console.log("🔗 Opening file:", {
      id: doc.id,
      name: doc.document_name,
      rawUrl: doc.file_url,
      normalizedUrl: fullUrl,
    })

    window.open(fullUrl, "_blank")
  }

  /**
   * ✅ PERBAIKAN: Download dengan URL yang benar dan auth token
   */
  const handleDownloadDocument = async (doc: {
    id: string
    document_name: string
    file_url: string | null
  }): Promise<boolean> => {
    if (!doc.file_url) {
      toast({
        title: "Gagal",
        description: "File URL tidak tersedia",
        variant: "destructive",
      })
      return false
    }

    try {
      setDownloadingDocId(doc.id)

      const fullUrl = normalizeFileUrl(doc.file_url)

      console.log("📥 Starting download:", {
        id: doc.id,
        name: doc.document_name,
        rawUrl: doc.file_url,
        fullUrl,
      })

      // Get auth token untuk authenticate dengan backend
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Fetch file dengan auth header
      const response = await fetch(fullUrl, {
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : {},
      })

      console.log("📥 Download response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()

      console.log("📥 Blob received:", {
        size: blob.size,
        type: blob.type,
      })

      // Extract extension dari file URL
      const extension = doc.file_url.split(".").pop()?.toLowerCase() || "pdf"

      // Sanitize nama file (hapus karakter yang tidak valid)
      const sanitizedName = doc.document_name
        .replace(/[^a-zA-Z0-9\s\-_.()]/g, "_")
        .replace(/\s+/g, "_")
        .substring(0, 100) // Limit panjang nama file

      const fileName = `${sanitizedName}.${extension}`

      console.log("💾 Saving as:", fileName)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)

      console.log("✅ Download completed successfully")

      toast({
        title: "Berhasil",
        description: `File "${doc.document_name}" berhasil diunduh`,
      })

      return true
    } catch (error: any) {
      console.error("❌ Download error:", {
        message: error?.message,
        stack: error?.stack,
      })

      toast({
        title: "Gagal mengunduh",
        description: error.message || "Terjadi kesalahan saat mengunduh file",
        variant: "destructive",
      })

      return false
    } finally {
      setDownloadingDocId(null)
    }
  }

  /**
   * ✅ Download semua dokumen dalam satu step (batch download)
   */
  const handleDownloadAllStepDocuments = async (step: WorkflowStep) => {
    const uploadedDocs = step.documents.filter((doc) => doc.is_uploaded && doc.file_url)

    if (uploadedDocs.length === 0) {
      toast({
        title: "Tidak ada dokumen",
        description: "Belum ada dokumen yang diupload untuk langkah ini",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Memulai unduhan...",
      description: `Mengunduh ${uploadedDocs.length} file`,
    })

    console.log("📦 Starting batch download:", {
      stepId: step.id,
      stepName: step.step_name,
      totalDocs: uploadedDocs.length,
    })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < uploadedDocs.length; i++) {
      try {
        const ok = await handleDownloadDocument(uploadedDocs[i])
        if (ok) {
          successCount++
        } else {
          failCount++
        }

        // Delay antar download untuk menghindari browser blocking
        if (i < uploadedDocs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800))
        }
      } catch (error) {
        failCount++
        console.error(`❌ Failed to download ${uploadedDocs[i].document_name}:`, error)
      }
    }

    if (failCount === 0) {
      toast({
        title: "Unduhan selesai",
        description: `Berhasil mengunduh ${successCount} file`,
      })
      console.log("✅ Batch download completed:", { successCount, failCount })
    } else {
      toast({
        title: "Unduhan selesai dengan error",
        description: `Berhasil: ${successCount}, Gagal: ${failCount}`,
        variant: "destructive",
      })
      console.log("⚠️ Batch download completed with errors:", { successCount, failCount })
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Lokasi Simpan
            </h1>
            <p className="text-gray-600">
              Kelola lokasi penyimpanan dokumen layanan
            </p>
          </div>

          {/* Filters */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Cari</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari klien, layanan, atau lokasi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tahun</Label>
                  <div className="mt-1">
                    <Input
                      type="number"
                      placeholder="Misal: 2025"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Bulan</Label>
                  <div className="mt-1">
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Semua bulan</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card className="bg-white shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FolderOpen className="h-5 w-5" />
                  Daftar Lokasi Simpan
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  Data tidak ditemukan
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Judul Layanan</TableHead>
                      <TableHead>Klien</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Nomor Buku</TableHead>
                      <TableHead>Halaman</TableHead>
                      <TableHead>Lokasi Simpan</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((rec, idx) => (
                      <TableRow key={rec.id}>
                        <TableCell>{idx + 1}.</TableCell>
                        <TableCell className="font-medium">
                          {rec.services?.title}
                        </TableCell>
                        <TableCell>
                          {rec.services?.clients?.full_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rec.services?.layanan || "Notaris"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rec.services?.menu_layanan || "Notaris"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {rec.nomor_buku || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {rec.nomor_lembar || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {rec.storage_location}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full h-8 w-8 p-0 bg-[#0f4c75] hover:bg-[#0a3655] text-white"
                            onClick={() => openDetailDialog(rec)}
                            title="Lihat detail & dokumen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-4xl p-0 bg-white gap-0 max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="px-6 py-4 border-b flex justify-between items-center flex-shrink-0">
              <DialogTitle className="text-xl font-bold underline decoration-slate-400 underline-offset-4">
                Detail Lokasi Simpan
              </DialogTitle>
            </div>

            {/* Content - Scrollable */}
            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-6">
                {selectedRecord && (
                  <>
                    <div className="space-y-1 text-sm text-gray-800">
                      <div className="font-bold text-lg mb-2">
                        {selectedRecord.services?.clients?.company_name ||
                          selectedRecord.services?.clients?.full_name}{" "}
                        – {selectedRecord.services?.title}
                      </div>

                      <div className="grid grid-cols-[140px_10px_1fr] gap-y-1">
                        <span className="font-medium">Layanan</span>
                        <span>:</span>
                        <span>
                          {selectedRecord.services?.layanan || "Umum"}
                        </span>

                        <span className="font-medium">Klien</span>
                        <span>:</span>
                        <span>
                          {selectedRecord.services?.clients?.full_name}
                        </span>

                        <span className="font-medium">Deadline</span>
                        <span>:</span>
                        <span>
                          {formatDate(selectedRecord.services?.deadline)}
                        </span>

                        <span className="font-medium">Nominal</span>
                        <span>:</span>
                        <span>
                          {formatCurrency(
                            selectedRecord.services?.fee_amount ||
                              selectedRecord.services?.service_finances?.[0]?.amount
                          )}
                        </span>

                        <span className="font-medium">Lokasi Simpan</span>
                        <span>:</span>
                        <span className="font-medium">
                          {selectedRecord.storage_location}
                        </span>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-blue-100 sticky top-0 z-10">
                          <TableRow className="hover:bg-blue-100 border-b border-blue-200">
                            <TableHead className="w-12 font-bold text-gray-700 bg-blue-100">
                              No.
                            </TableHead>
                            <TableHead className="font-bold text-gray-700 bg-blue-100">
                              Langkah Layanan
                            </TableHead>
                            <TableHead className="font-bold text-gray-700 bg-blue-100">
                              Dokumen
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-700 pr-6 bg-blue-100">
                              Aksi
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentsLoading ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                              </TableCell>
                            </TableRow>
                          ) : workflowSteps.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-6 text-gray-500"
                              >
                                Tidak ada langkah workflow ditemukan
                              </TableCell>
                            </TableRow>
                          ) : (
                            workflowSteps.map((step, idx) => (
                              <TableRow
                                key={step.id}
                                className="hover:bg-blue-50/50 border-b"
                              >
                                <TableCell className="font-medium text-gray-700 align-top">
                                  {idx + 1}.
                                </TableCell>
                                <TableCell className="text-red-500 font-medium align-top">
                                  {step.step_name}
                                </TableCell>
                                <TableCell className="align-top">
                                  {step.documents.length === 0 ? (
                                    <span className="text-gray-400 text-sm">
                                      Belum ada dokumen
                                    </span>
                                  ) : (
                                    <div className="space-y-1">
                                      {step.documents.map((doc, docIdx) => (
                                        <div
                                          key={doc.id}
                                          className="text-sm text-gray-700"
                                        >
                                          {docIdx + 1}. {doc.document_name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right align-top">
                                  <div className="flex justify-end gap-2 pr-2">
                                    {step.documents.length > 0 && (
                                      <Button
                                        size="sm"
                                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 rounded shadow-sm text-white flex items-center gap-2"
                                        title="Lihat dokumen"
                                        onClick={() => handleViewDocuments(step)}
                                      >
                                        <FileText className="h-4 w-4" />
                                        <span className="text-xs">View</span>
                                      </Button>
                                    )}

                                    {step.documents.length > 0 && (
                                      <Button
                                        size="sm"
                                        className="h-8 px-3 bg-green-600 hover:bg-green-700 rounded shadow-sm text-white flex items-center gap-2"
                                        title={`Download ${step.documents.length} dokumen`}
                                        onClick={() =>
                                          handleDownloadAllStepDocuments(step)
                                        }
                                        disabled={downloadingDocId !== null}
                                      >
                                        {downloadingDocId ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Download className="h-4 w-4" />
                                        )}
                                        <span className="text-xs">
                                          {step.documents.length > 1
                                            ? `${step.documents.length} file`
                                            : "Download"}
                                        </span>
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog open={viewerDialogOpen} onOpenChange={setViewerDialogOpen}>
          <DialogContent className="max-w-3xl p-0 bg-white gap-0 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center flex-shrink-0">
              <DialogTitle className="text-lg font-bold">
                Dokumen: {selectedStepName}
              </DialogTitle>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6">
                {selectedDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada dokumen
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDocuments.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {idx + 1}. {doc.document_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {doc.file_url
                                ? doc.file_url.split("/").pop()
                                : "File tidak tersedia"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenFile(doc)}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="text-xs">Buka</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            disabled={downloadingDocId === doc.id}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                          >
                            {downloadingDocId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="text-xs">Download</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setViewerDialogOpen(false)}
                className="w-full"
              >
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
