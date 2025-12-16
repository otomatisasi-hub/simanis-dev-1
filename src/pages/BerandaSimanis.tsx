import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, Clock, Search, Filter, Eye, Edit, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

type ServiceTypeCategory = "Notaril" | "PPAT" | "Syariah"

interface ServiceSummary {
  category: ServiceTypeCategory
  active: number
  completed: number
  pending: number
  total: number
}

interface WorkStatus {
  id: string
  serviceName: string
  serviceType: ServiceTypeCategory
  currentStatus: string
  pic: string
  itemCount: number
  serviceTypeId?: string
  categoryId?: string
  assignedTo?: string
}

// Interface untuk billing
interface BillingPaymentSummary {
  totalTagihan: number
  totalPembayaran: number
}

export function BerandaSimanis() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterJenis, setFilterJenis] = useState<ServiceTypeCategory | "all">("all")
  const [filterLayanan, setFilterLayanan] = useState<string>("all")
  const [filterUser, setFilterUser] = useState<string>("all")
  const [serviceSummary, setServiceSummary] = useState<ServiceSummary[]>([])
  const [workRows, setWorkRows] = useState<WorkStatus[]>([])
  const [loading, setLoading] = useState(false)
  
  const [billingData, setBillingData] = useState<BillingPaymentSummary>({
    totalTagihan: 0,
    totalPembayaran: 0
  })

  const [layananOptions, setLayananOptions] = useState<{ id: string; name: string; category: ServiceTypeCategory }[]>([])
  const [userOptions, setUserOptions] = useState<{ id: string; fullname: string }[]>([])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Penyusunan Draf": return "bg-warning/20 text-warning-foreground"
      case "Pengumpulan Dokumen": return "bg-info/20 text-info-foreground"
      case "Ditandatangani": return "bg-success/20 text-success-foreground"
      case "Diajukan ke Kemenkumham": return "bg-primary/20 text-primary-foreground"
      case "Diajukan ke BPN": return "bg-primary/20 text-primary-foreground"
      case "Selesai": return "bg-success/20 text-success-foreground"
      default: return "bg-muted/20 text-muted-foreground"
    }
  }

  // ✅ FIXED: Fetch billing data dari service_finances
  const fetchBillingData = async () => {
    try {
      // Ambil semua data dari service_finances
      const { data: finances, error: financeError } = await supabase
        .from("service_finances")
        .select("amount, status, follow_up_type")
      
      if (financeError) {
        console.error("Error fetching billing data:", financeError)
        return
      }

      // Hitung total tagihan (semua yang bukan completed)
      const totalTagihan = finances
        ?.filter(f => f.status !== 'completed')
        ?.reduce((sum, f) => sum + (Number(f.amount) || 0), 0) || 0

      // Hitung total pembayaran (yang sudah completed)
      const totalPembayaran = finances
        ?.filter(f => f.status === 'completed')
        ?.reduce((sum, f) => sum + (Number(f.amount) || 0), 0) || 0

      setBillingData({
        totalTagihan,
        totalPembayaran
      })
    } catch (error) {
      console.error("Error fetching billing data:", error)
    }
  }

  useEffect(() => {
    const loadDropdowns = async () => {
      const { data: st, error: stErr } = await supabase
        .from("service_types")
        .select("id, name, category, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })
      
      if (stErr) console.error(stErr)
      
      const stMapped = (st || []).map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        category: (row.category?.toLowerCase() === "ppat" ? "PPAT" : "Notaril") as ServiceTypeCategory,
      }))
      setLayananOptions(stMapped)

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name", { ascending: true })
      
      if (profErr) console.error(profErr)
      
      setUserOptions((prof || []).map((p: any) => ({ 
        id: p.user_id as string, 
        fullname: p.full_name as string 
      })))
    }
    loadDropdowns()
  }, [])

  function mapDbStatusToUi(dbStatus?: string): string {
    switch (dbStatus) {
      case "draft": return "Penyusunan Draf"
      case "in-progress": return "Pengumpulan Dokumen"
      case "review": return "Ditandatangani"
      case "completed": return "Selesai"
      default: return "Pengumpulan Dokumen"
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: services }, { data: types }, { data: users }] = await Promise.all([
        supabase
          .from("services")
          .select("id, title, status, assigned_to, service_type_id, category_id, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("service_types")
          .select("id, name, category"),
        supabase
          .from("profiles")
          .select("user_id, full_name"),
      ])

      const typesMap = new Map(types?.map((t: any) => [t.id, t]) ?? [])
      const usersMap = new Map(users?.map((u: any) => [u.user_id, u]) ?? [])

      let mapped = (services || []).map((s: any) => {
        const serviceType = typesMap.get(s.service_type_id)
        const jenis: ServiceTypeCategory = 
          serviceType?.category?.toLowerCase() === "ppat" ? "PPAT" : "Notaril"
        
        return {
          id: s.id,
          serviceName: s.title,
          serviceType: jenis,
          currentStatus: mapDbStatusToUi(s.status),
          pic: usersMap.get(s.assigned_to)?.full_name || "-",
          itemCount: 1,
          serviceTypeId: s.service_type_id,
          categoryId: s.category_id,
          assignedTo: s.assigned_to,
        }
      })

      if (filterJenis !== "all") {
        mapped = mapped.filter(m => m.serviceType === filterJenis)
      }

      if (filterLayanan !== "all") {
        mapped = mapped.filter(m => m.serviceTypeId === filterLayanan)
      }

      if (filterUser !== "all") {
        mapped = mapped.filter(m => m.assignedTo === filterUser)
      }

      const q = searchQuery.toLowerCase()
      const filtered = mapped.filter(w => 
        w.serviceName.toLowerCase().includes(q) || 
        w.pic.toLowerCase().includes(q)
      )
      
      setWorkRows(filtered)

      const { data: allServices } = await supabase
        .from("services")
        .select("id, status, service_type_id")

      const bucket = {
        Notaril: { active: 0, completed: 0, pending: 0, total: 0 },
        PPAT: { active: 0, completed: 0, pending: 0, total: 0 },
        Syariah: { active: 0, completed: 0, pending: 0, total: 0 },
      } as Record<ServiceTypeCategory, Omit<ServiceSummary, "category">>

      for (const s of allServices || []) {
        const serviceType = typesMap.get((s as any).service_type_id)
        const cat: ServiceTypeCategory = 
          serviceType?.category?.toLowerCase() === "ppat" ? "PPAT" : "Notaril"
        
        bucket[cat].total += 1
        const uiStatus = mapDbStatusToUi((s as any).status)
        
        if (uiStatus === "Selesai") bucket[cat].completed += 1
        else if (uiStatus === "Pengumpulan Dokumen" || uiStatus === "Penyusunan Draf") 
          bucket[cat].pending += 1
        else bucket[cat].active += 1
      }

      const summary: ServiceSummary[] = (["Notaril", "PPAT", "Syariah"] as ServiceTypeCategory[]).map(c => ({
        category: c,
        active: bucket[c].active,
        completed: bucket[c].completed,
        pending: bucket[c].pending,
        total: bucket[c].total,
      }))
      
      setServiceSummary(summary)
      
      // Fetch billing data
      await fetchBillingData()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterJenis, filterLayanan, filterUser, searchQuery])

  const filteredWork = useMemo(() => workRows, [workRows])

  // Format currency Rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Beranda SIMANIS</h1>
          <p className="text-muted-foreground">Ringkasan layanan dan pekerjaan sistem notaris</p>
        </div>
      </div>

      {/* Layanan Aktif Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Layanan Aktif</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {serviceSummary.map((service) => (
            <Card key={service.category} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{service.category}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{service.active}</div>
                <p className="text-xs text-muted-foreground">Aktif dari {service.total} total layanan</p>
                <div className="mt-3 flex justify-between text-xs">
                  <div className="flex items-center">
                    <CheckCircle className="mr-1 h-3 w-3 text-success" />
                    <span>Selesai: {service.completed}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3 text-warning" />
                    <span>Pending: {service.pending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bagian Billing dan Pembayaran - VERTIKAL FULL WIDTH */}
      <Card className="w-full">
        <CardContent className="pt-6 space-y-4">
          {/* Tagihan */}
          <div className="flex items-center p-4 border rounded-lg bg-muted/30">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">Tagihan :</span>
                <ArrowUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {formatRupiah(billingData.totalTagihan)}
              </p>
            </div>
          </div>

          {/* Pembayaran */}
          <div className="flex items-center p-4 border rounded-lg bg-muted/30">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">Pembayaran :</span>
                <ArrowDown className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatRupiah(billingData.totalPembayaran)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Pekerjaan per Layanan Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Status Pekerjaan per Layanan</h2>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            Lihat Semua
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari layanan atau PIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="Notaril">Notaril</SelectItem>
                  <SelectItem value="PPAT">PPAT</SelectItem>
                  <SelectItem value="Syariah">Syariah</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLayanan} onValueChange={(v) => setFilterLayanan(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Layanan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan</SelectItem>
                  {layananOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name} ({opt.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterUser} onValueChange={(v) => setFilterUser(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="User (PIC)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua User</SelectItem>
                  {userOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Layanan</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Jumlah Item</TableHead>
                  <TableHead className="w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredWork.map((work) => (
                  <TableRow key={work.id}>
                    <TableCell className="font-medium">{work.serviceName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {work.serviceType}
                      </Badge>
                    </TableCell>
                    <TableCell>{work.pic}</TableCell>
                    <TableCell className="text-center">{work.itemCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Memuat data...</TableCell>
                  </TableRow>
                )}
                {!loading && filteredWork.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
