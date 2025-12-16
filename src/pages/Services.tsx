import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/custom-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, User, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Service {
  id: string
  reference_number: string
  title: string
  description?: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  category: {
    name: string
    type: 'notaris' | 'ppat'
  }
  client: {
    full_name: string
    client_type: 'individual' | 'corporate'
  }
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, icon: FileText, color: 'text-muted-foreground' },
  in_progress: { label: 'Dalam Proses', variant: 'default' as const, icon: Clock, color: 'text-primary' },
  review: { label: 'Review', variant: 'outline' as const, icon: AlertCircle, color: 'text-warning' },
  completed: { label: 'Selesai', variant: 'outline' as const, icon: CheckCircle, color: 'text-success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' as const, icon: AlertCircle, color: 'text-destructive' }
}

export function ServicesPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(name, type),
          client:clients(full_name, client_type)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setServices(data as Service[] || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      toast({
        variant: "destructive",
        title: "Gagal memuat data layanan",
        description: "Terjadi kesalahan saat memuat data layanan"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.client.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || service.status === filterStatus
    const matchesType = filterType === 'all' || service.category.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusCounts = () => {
    return {
      total: services.length,
      draft: services.filter(s => s.status === 'draft').length,
      in_progress: services.filter(s => s.status === 'in_progress').length,
      review: services.filter(s => s.status === 'review').length,
      completed: services.filter(s => s.status === 'completed').length,
      cancelled: services.filter(s => s.status === 'cancelled').length
    }
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Manajemen Layanan
            </h2>
            <p className="text-muted-foreground">
              Kelola semua layanan notaris dan PPAT
            </p>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Layanan
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{statusCounts.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = statusCounts[status as keyof typeof statusCounts] as number
            const Icon = config.icon
            return (
              <Card key={status}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan judul, nomor referensi, atau nama klien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_progress">Dalam Proses</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="notaris">Notaris</SelectItem>
              <SelectItem value="ppat">PPAT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data layanan...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service) => {
              const statusInfo = statusConfig[service.status]
              const StatusIcon = statusInfo.icon
              
              return (
                <Card 
                  key={service.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/services/${service.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={statusInfo.variant}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          <Badge variant={service.category.type === 'notaris' ? 'default' : 'secondary'}>
                            {service.category.type.toUpperCase()}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{service.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {service.category.name} • {service.client.full_name}
                        </CardDescription>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-mono text-muted-foreground">
                          {service.reference_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(service.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {service.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {!loading && filteredServices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tidak ada layanan ditemukan
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Coba ubah kata kunci pencarian' : 'Belum ada layanan yang terdaftar'}
            </p>
            {!searchTerm && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Layanan Pertama
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}