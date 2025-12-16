// src/pages/SyariahPage.tsx
"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/custom-button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Users,
  FileText,
  DollarSign,
  Search,
  Plus,
  Edit,
  Loader2,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { AddClientModal } from "@/components/syariah/AddClientModal"
import { AddInvoiceModal } from "@/components/syariah/AddInvoiceModal"
import { WorksheetDetailView } from "@/components/syariah/WorksheetDetailView"
import { WorkflowDetailDialog } from "@/components/syariah/WorkflowDetailDialog"
import { SyariahDetailView } from "@/components/syariah/SyariahDetailView"
import { getWorkflowTemplate } from "@/data/syariahWorkflows"
import { FinanceDetailDialog } from "@/components/syariah/FinanceDetailDialog"
import { useModule } from "@/context/ModuleContext"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { GlobalFilters, FilterValues } from "@/components/shared/GlobalFilters"

const ITEMS_PER_PAGE = 5

export function SyariahPage() {
  const { currentModule } = useModule() // untuk halaman ini, seharusnya "notaris_syariah"
  const { toast } = useToast()
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] =
    useState<"klien" | "lembar-kerja" | "keuangan">("klien")

  const [showClientModal, setShowClientModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [showWorksheetDetail, setShowWorksheetDetail] = useState(false)

  const [selectedWorksheet, setSelectedWorksheet] = useState<any>(null)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedWorksheetDetail, setSelectedWorksheetDetail] = useState<any>(null)

  const [clients, setClients] = useState<any[]>([])
  const [filteredClients, setFilteredClients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [filteredServices, setFilteredServices] = useState<any[]>([])
  const [finances, setFinances] = useState<any[]>([])
  const [filteredFinances, setFilteredFinances] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [currentPageClients, setCurrentPageClients] = useState(1)
  const [currentPageServices, setCurrentPageServices] = useState(1)
  const [currentPageFinances, setCurrentPageFinances] = useState(1)

  const [selectedFinance, setSelectedFinance] = useState<any | null>(null)
  const [showFinanceDialog, setShowFinanceDialog] = useState(false)

  const norm = (v?: string) => (v ?? "").trim().toLowerCase()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setCurrentPageClients(1)
    setCurrentPageServices(1)
    setCurrentPageFinances(1)
  }, [filteredClients.length, filteredServices.length, filteredFinances.length])

  const fetchData = async () => {
    try {
      setLoading(true)
  
      // 1) Ambil user yang sedang login
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
  
      const currentUserId = sessionData.session?.user?.id
      if (!currentUserId) throw new Error("User tidak terautentikasi")
  
      // 2) Cek role user (admin atau bukan)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId)
  
      if (rolesError) throw rolesError
  
      const isAdmin = (rolesData ?? []).some((r) =>
        ["super_admin", "admin"].includes(r.role)
      )
  
      // 3) Ambil requirement khusus notaris_syariah sebagai sumber filter
      const { data: requirementsData, error: reqErr } = await supabase
        .from("service_document_requirements")
        .select("menu, layanan, sub_layanan, jenis_klien, mandatory_documents")
        .eq("menu", "notaris_syariah")
  
      if (reqErr) throw reqErr
      setRequirements(requirementsData || [])
  
      const isSyariahCombo = (srv: {
        layanan?: string
        sub_layanan?: string
        jenis_klien?: string
      }) => {
        const match = (requirementsData ?? []).some((r) =>
          norm(r.layanan) === norm(srv.layanan) &&
          norm(r.sub_layanan) === norm(srv.sub_layanan) &&
          norm(r.jenis_klien) === norm(srv.jenis_klien)
        )
  
        if (!match && srv.layanan) {
          console.log("Service NOT matched:", {
            layanan: srv.layanan,
            sub_layanan: srv.sub_layanan,
            jenis_klien: srv.jenis_klien,
          })
        }
  
        return match
      }
  
      // 4) Clients + services (nested); filter services per client dengan isSyariahCombo
      const { data: clientsData, error: clientsErr } = await supabase
        .from("clients")
        .select(`
          *,
          services (
            id,
            title,
            layanan,
            sub_layanan,
            jenis_klien,
            status,
            estimated_completion_date,
            created_by,
            created_at
          ),
          created_by_profile:profiles!created_by (
            id,
            full_name
          )
        `)
        .order("created_at", { ascending: false })
  
      if (clientsErr) throw clientsErr
  
      const enrichedClients = (clientsData ?? [])
        .map((client) => {
          const onlySyariahServices = (client.services ?? [])
            .filter((s: any) => isSyariahCombo(s))
            .map((s: any) => {
              const req = (requirementsData ?? []).find((r: any) =>
                norm(r.layanan) === norm(s.layanan) &&
                norm(r.sub_layanan) === norm(s.sub_layanan) &&
                norm(r.jenis_klien) === norm(s.jenis_klien)
              )
              return { ...s, mandatory_documents: req?.mandatory_documents ?? [] }
            })
          return { ...client, services: onlySyariahServices }
        })
        .filter((c) => (c.services?.length ?? 0) > 0)
  
      setClients(enrichedClients)
      setFilteredClients(enrichedClients)
  
      // 5) Services list; filter dengan isSyariahCombo dan enrich mandatory_documents
      const { data: servicesData, error: servicesErr } = await supabase
        .from("services")
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            client_type,
            deadline
          ),
          created_by_profile:profiles!created_by (
            id,
            full_name
          )
        `)
        .order("created_at", { ascending: false })
  
      if (servicesErr) throw servicesErr
  
      const enrichedServices = (servicesData ?? [])
        .filter((s: any) => isSyariahCombo(s))
        .map((s: any) => {
          const req = (requirementsData ?? []).find((r: any) =>
            norm(r.layanan) === norm(s.layanan) &&
            norm(r.sub_layanan) === norm(s.sub_layanan) &&
            norm(r.jenis_klien) === norm(s.jenis_klien)
          )
          return { ...s, mandatory_documents: req?.mandatory_documents ?? [] }
        })
  
      setServices(enrichedServices)
      setFilteredServices(enrichedServices)
  
      // 6) KEUANGAN – dari tabel service_finances
      let financeQuery = supabase
        .from("service_finances")
        .select(`
          id,
          service_id,
          follow_up_type,
          due_date,
          amount,
          status,
          invoice_number,
          payment_date,
          notes,
          created_at,
          updated_at,
          created_by,
          updated_by,
          services!inner (
            id,
            title,
            client_id,
            created_by,
            menu_layanan,
            fee_amount,
            fee_status,
            clients (
              id,
              full_name
            )
          )
        `)
        // hanya layanan Syariah
        .eq("services.menu_layanan", "notaris_syariah")
  
      // kalau BUKAN admin → batasi ke layanan yang dibuat oleh user login
      if (!isAdmin) {
        financeQuery = financeQuery.eq("services.created_by", currentUserId)
      }
  
      const { data: financesData, error: financesError } = await financeQuery
        .order("created_at", { ascending: false })
  
      if (financesError) throw financesError
  
      setFinances(financesData ?? [])
      setFilteredFinances(financesData ?? [])
    } catch (error: any) {
      console.error("Fetch Error:", error)
      toast({
        title: "Gagal memuat data",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleViewDocumentChecklist = (service: any) => {
    navigate(`/services/notaris_syariah/document-checklist/${service.id}`)
  }

  const handleViewWorksheetDetail = (service: any) => {
    setSelectedWorksheetDetail(service)
    setShowWorksheetDetail(true)
  }

  const handleViewWorksheet = (worksheet: any) => {
    const template = getWorkflowTemplate("Pendirian", "Pendirian PT")
    if (template) {
      setSelectedWorksheet(worksheet)
      setShowWorkflowDialog(true)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "secondary",
      in_progress: "default",
      review: "secondary",
      completed: "outline",
      cancelled: "destructive",
      pending: "secondary",
      overdue: "destructive",
      paid: "outline",
      unpaid: "destructive",
      partial: "secondary",
    }
    const labels: Record<string, string> = {
      draft: "Draft",
      in_progress: "In Progress",
      review: "Review",
      completed: "Completed",
      cancelled: "Cancelled",
      pending: "Pending",
      overdue: "Overdue",
      paid: "Paid",
      unpaid: "Unpaid",
      partial: "Partial",
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    )
  }

  const handleFiltersChange = (filters: FilterValues) => {
    console.log("Filters applied:", filters)

    // Filter Clients
    let c = [...clients]

    if (filters.layanan && filters.layanan !== "all") {
      c = c.filter((cl) =>
        cl.services?.some(
          (srv: any) =>
            (srv.layanan || "").toLowerCase() ===
            filters.layanan!.toLowerCase()
        )
      )
    }

    if (filters.subLayanan && filters.subLayanan !== "all") {
      c = c.filter((cl) =>
        cl.services?.some(
          (srv: any) =>
            (srv.sub_layanan || "").toLowerCase() ===
            filters.subLayanan!.toLowerCase()
        )
      )
    }

    if (filters.jenisKlien && filters.jenisKlien !== "all") {
      c = c.filter((cl) =>
        cl.services?.some(
          (srv: any) =>
            (srv.jenis_klien || "").toLowerCase() ===
            filters.jenisKlien!.toLowerCase()
        )
      )
    }

    if (filters.status && filters.status !== "all") {
      c = c.filter((cl) =>
        cl.services?.some(
          (srv: any) =>
            (srv.status || "").toLowerCase() ===
            filters.status!.toLowerCase()
        )
      )
    }

    if (filters.search) {
      const s = filters.search.toLowerCase()
      c = c.filter((cl) =>
        (cl.full_name || "").toLowerCase().includes(s) ||
        (cl.company_name || "").toLowerCase().includes(s) ||
        (cl.email || "").toLowerCase().includes(s) ||
        cl.services?.some((srv: any) =>
          (srv.layanan || "").toLowerCase().includes(s) ||
          (srv.sub_layanan || "").toLowerCase().includes(s) ||
          (srv.jenis_klien || "").toLowerCase().includes(s)
        )
      )
    }

    if (filters.tanggalMulai && filters.tanggalAkhir) {
      const endOfDay = new Date(filters.tanggalAkhir)
      endOfDay.setHours(23, 59, 59, 999)
      c = c.filter((cl) => {
        const created = cl.created_at ? new Date(cl.created_at) : null
        return created
          ? created >= filters.tanggalMulai! && created <= endOfDay
          : false
      })
    }

    // Filter Services
    let sArr = [...services]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      sArr = sArr.filter((sv) =>
        (sv.layanan || "").toLowerCase().includes(s) ||
        (sv.sub_layanan || "").toLowerCase().includes(s) ||
        (sv.jenis_klien || "").toLowerCase().includes(s) ||
        (sv.title || "").toLowerCase().includes(s) ||
        (sv.clients?.full_name || "").toLowerCase().includes(s) ||
        (sv.clients?.company_name || "").toLowerCase().includes(s)
      )
    }

    if (filters.layanan && filters.layanan !== "all") {
      sArr = sArr.filter(
        (sv) =>
          (sv.layanan || "").toLowerCase() ===
          filters.layanan!.toLowerCase()
      )
    }

    if (filters.subLayanan && filters.subLayanan !== "all") {
      sArr = sArr.filter(
        (sv) =>
          (sv.sub_layanan || "").toLowerCase() ===
          filters.subLayanan!.toLowerCase()
      )
    }

    if (filters.jenisKlien && filters.jenisKlien !== "all") {
      sArr = sArr.filter(
        (sv) =>
          (sv.jenis_klien || "").toLowerCase() ===
          filters.jenisKlien!.toLowerCase()
      )
    }

    if (filters.status && filters.status !== "all") {
      sArr = sArr.filter(
        (sv) =>
          (sv.status || "").toLowerCase() ===
          filters.status!.toLowerCase()
      )
    }

    if (filters.tanggalMulai && filters.tanggalAkhir) {
      const endOfDay = new Date(filters.tanggalAkhir)
      endOfDay.setHours(23, 59, 59, 999)
      sArr = sArr.filter((sv) => {
        const created = sv.created_at ? new Date(sv.created_at) : null
        return created
          ? created >= filters.tanggalMulai! && created <= endOfDay
          : false
      })
    }

    // Filter Finances (view service_finances)
    let f = [...finances]

    if (filters.search) {
      const s = filters.search.toLowerCase()
      f = f.filter((fn) =>
        (fn.invoice_number || "").toLowerCase().includes(s) ||
        (fn.service_title || "").toLowerCase().includes(s) ||
        (fn.client_name || "").toLowerCase().includes(s)
      )
    }

    if (filters.layanan && filters.layanan !== "all") {
      const lay = filters.layanan.toLowerCase()
      f = f.filter((fn) =>
        (fn.service_title || "").toLowerCase().includes(lay)
      )
    }

    if (filters.subLayanan && filters.subLayanan !== "all") {
      f = f.filter(
        (fn) =>
          (fn.sub_layanan || "").toLowerCase() ===
          filters.subLayanan!.toLowerCase()
      )
    }

    if (filters.status && filters.status !== "all") {
      f = f.filter(
        (fn) =>
          (fn.finance_status || "").toLowerCase() ===
          filters.status!.toLowerCase()
      )
    }

    if (filters.tanggalMulai && filters.tanggalAkhir) {
      const endOfDay = new Date(filters.tanggalAkhir)
      endOfDay.setHours(23, 59, 59, 999)
      f = f.filter((fn) => {
        const baseDate = fn.due_date || fn.deadline
        const created = baseDate ? new Date(baseDate) : null
        return created
          ? created >= filters.tanggalMulai! && created <= endOfDay
          : false
      })
    }

    console.log("Filtered results:", {
      clients: c.length,
      services: sArr.length,
      finances: f.length,
    })

    setFilteredClients(c)
    setFilteredServices(sArr)
    setFilteredFinances(f)
  }

  const getPaginatedData = (data: any[], currentPage: number) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (dataLength: number) =>
    Math.ceil(dataLength / ITEMS_PER_PAGE) || 1

  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }) => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between mt-4 px-2">
        <div className="text-sm text-muted-foreground">
          Halaman {currentPage} dari {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Layanan Notaris Syariah
          </h2>
          <p className="text-muted-foreground">
            Kelola klien, lembar kerja, dan keuangan Notaris Syariah
          </p>
        </div>

        <div className="mb-6">
          <GlobalFilters menu="notaris_syariah" onFiltersChange={handleFiltersChange} />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="klien" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Klien ({filteredClients.length})
            </TabsTrigger>
            <TabsTrigger value="lembar-kerja" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lembar Kerja ({filteredServices.length})
            </TabsTrigger>
            <TabsTrigger value="keuangan" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Keuangan ({filteredFinances.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB KLIEN */}
          <TabsContent value="klien" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Daftar Klien Notaris Syariah</CardTitle>
                  <Button onClick={() => setShowClientModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Klien
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada data klien Notaris Syariah
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No.</TableHead>
                          <TableHead>Nama Klien</TableHead>
                          <TableHead>Layanan</TableHead>
                          <TableHead>Sub Layanan</TableHead>
                          <TableHead>Jenis Klien</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedData(
                          filteredClients,
                          currentPageClients
                        ).map((client, index) => {
                          const globalIndex =
                            (currentPageClients - 1) * ITEMS_PER_PAGE +
                            index +
                            1
                          return (
                            <TableRow key={client.id}>
                              <TableCell>{globalIndex}</TableCell>
                              <TableCell className="font-medium">
                                {client.full_name || client.company_name}
                              </TableCell>
                              <TableCell>
                                {client.services
                                  ?.map((s: any) => s.layanan)
                                  .join(", ") || "-"}
                              </TableCell>
                              <TableCell>
                                {client.services
                                  ?.map((s: any) => s.sub_layanan)
                                  .join(", ") || "-"}
                              </TableCell>
                              <TableCell>
                                {client.services
                                  ?.map((s: any) => s.jenis_klien)
                                  .join(", ") || "-"}
                              </TableCell>
                              <TableCell>
                                {client.created_by_profile?.full_name || "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClient(client)
                                    setShowDetailView(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <PaginationControls
                      currentPage={currentPageClients}
                      totalPages={getTotalPages(filteredClients.length)}
                      onPageChange={setCurrentPageClients}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB LEMBAR KERJA */}
          <TabsContent value="lembar-kerja" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lembar Kerja Notaris Syariah</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada data lembar kerja notaris_syariah
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No.</TableHead>
                          <TableHead>Judul Layanan</TableHead>
                          <TableHead>Klien</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Layanan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedData(
                          filteredServices,
                          currentPageServices
                        ).map((service, index) => {
                          const globalIndex =
                            (currentPageServices - 1) * ITEMS_PER_PAGE +
                            index +
                            1

                          const serviceTitle =
                            service.title ||
                            service.layanan ||
                            service.clients?.company_name ||
                            "-"

                          const deadline =
                            service.estimated_completion_date ||
                            service.clients?.deadline ||
                            null

                          return (
                            <TableRow key={service.id}>
                              <TableCell>{globalIndex}</TableCell>
                              <TableCell className="font-medium">
                                {serviceTitle}
                              </TableCell>
                              <TableCell>
                                {service.clients?.full_name || "-"}
                              </TableCell>
                              <TableCell>
                                {service.created_by_profile?.full_name || "-"}
                              </TableCell>
                              <TableCell>
                                {deadline
                                  ? new Date(
                                      deadline
                                    ).toLocaleDateString("id-ID")
                                  : "-"}
                              </TableCell>
                              <TableCell>{service.layanan || "-"}</TableCell>
                              <TableCell>
                                {getStatusBadge(service.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() =>
                                      handleViewDocumentChecklist(service)
                                    }
                                    className="bg-blue-600 hover:bg-blue-700"
                                    title="Lihat Checklist Dokumen"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() =>
                                      handleViewWorksheetDetail(service)
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                    title="Lihat Detail Lembar Kerja"
                                  >
                                    <Bell className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <PaginationControls
                      currentPage={currentPageServices}
                      totalPages={getTotalPages(filteredServices.length)}
                      onPageChange={setCurrentPageServices}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB KEUANGAN */}
          <TabsContent value="keuangan" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Keuangan Notaris Syariah</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFinances.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada data keuangan Notaris Syariah
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No.</TableHead>
                          <TableHead>Klien</TableHead>
                          <TableHead>Layanan</TableHead>
                          <TableHead>Biaya Layanan</TableHead>
                          <TableHead>Biaya Masuk</TableHead>
                          <TableHead>Sisa Bayar</TableHead>
                          <TableHead>Status Keuangan</TableHead>
                          <TableHead>Status Pembayaran</TableHead>
                          <TableHead>Jatuh Tempo</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedData(
                          filteredFinances.filter((fn: any) => {
                            if (!searchTerm) return true
                            const s = searchTerm.toLowerCase()
                            const clientName = fn.services?.clients?.full_name || ""
                            const serviceTitle = fn.services?.title || ""
                            return (
                              clientName.toLowerCase().includes(s) ||
                              serviceTitle.toLowerCase().includes(s)
                            )
                          }),
                          currentPageFinances
                        ).map((finance, index) => {
                          const globalIndex =
                            (currentPageFinances - 1) * ITEMS_PER_PAGE + index + 1

                          const rowKey = finance.id ?? finance.service_id ?? globalIndex

                          const clientName = finance.services?.clients?.full_name || "-"
                          const serviceTitle = finance.services?.title || "-"

                          const dueDate = finance.due_date || null

                          // Biaya layanan: bisa diambil dari services.fee_amount atau dari finance.amount
                          const feeAmountNumber = Number(
                            finance.services?.fee_amount ?? finance.amount ?? 0
                          )

                          // Saat ini belum ada tabel pembayaran, jadi 0 dulu
                          const totalPaidNumber = 0

                          const remainingNumber = feeAmountNumber - totalPaidNumber

                          return (
                            <TableRow key={rowKey}>
                              <TableCell>{globalIndex}</TableCell>
                              <TableCell className="font-medium">
                                {clientName}
                              </TableCell>
                              <TableCell>{serviceTitle}</TableCell>
                              <TableCell>
                                {feeAmountNumber
                                  ? formatCurrency(feeAmountNumber)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {totalPaidNumber
                                  ? formatCurrency(totalPaidNumber)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(remainingNumber > 0 ? remainingNumber : 0)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(finance.status || "pending")}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(finance.services?.fee_status || "unpaid")}
                              </TableCell>
                              <TableCell>
                                {dueDate
                                  ? new Date(dueDate).toLocaleDateString("id-ID")
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFinance(finance)
                                    setShowFinanceDialog(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <PaginationControls
                      currentPage={currentPageFinances}
                      totalPages={getTotalPages(filteredFinances.length)}
                      onPageChange={setCurrentPageFinances}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Tambah Klien */}
      <AddClientModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        onSuccess={() => {
          setShowClientModal(false)
          fetchData()
        }}
        requirements={requirements}
      />

      {/* Modal Tambah Invoice */}
      <AddInvoiceModal
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        onSuccess={fetchData}
      />

      {/* Dialog Workflow Detail */}
      {selectedWorksheet && (
        <WorkflowDetailDialog
          open={showWorkflowDialog}
          onOpenChange={setShowWorkflowDialog}
          serviceData={selectedWorksheet}
          workflowTemplate={getWorkflowTemplate("Pendirian", "Pendirian PT")!}
        />
      )}

      {/* Dialog Detail Klien */}
      <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              Detail Klien
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedClient && (
              <SyariahDetailView
                data={selectedClient}
                onSuccess={() => {
                  setShowDetailView(false)
                  setSelectedClient(null)
                  fetchData()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Lembar Kerja */}
      <Dialog open={showWorksheetDetail} onOpenChange={setShowWorksheetDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 bg-background border-b px-6 py-4 z-10">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-semibold">
                Detail Lembar Kerja
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWorksheetDetail(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedWorksheetDetail && (
              <WorksheetDetailView
                data={selectedWorksheetDetail}
                onSuccess={() => {
                  setShowWorksheetDetail(false)
                  fetchData()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FinanceDetailDialog
        open={showFinanceDialog}
        onOpenChange={(open) => {
          setShowFinanceDialog(open)
          if (!open) setSelectedFinance(null)
        }}
        finance={selectedFinance}
      />
    </div>
  )
}

export default SyariahPage
