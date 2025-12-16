import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Building, User, Phone, Mail, MapPin, FileText, Eye } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClientForm } from '@/components/client/ClientForm';

interface Client {
  id: string
  client_type: 'individual' | 'corporate'
  full_name: string
  nik?: string
  npwp?: string
  email?: string
  phone?: string
  address?: string
  company_name?: string
  company_npwp?: string
  company_address?: string
  company_phone?: string
  created_at: string
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data as Client[] || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        variant: "destructive",
        title: "Gagal memuat data klien",
        description: "Terjadi kesalahan saat memuat data klien"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || client.client_type === filterType

    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Manajemen Klien
            </h2>
            <p className="text-muted-foreground">
              Kelola data klien individu dan perusahaan
            </p>
          </div>
          
          <Dialog open={showAddClientModal} onOpenChange={setShowAddClientModal}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Klien
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Klien Baru</DialogTitle>
              </DialogHeader>
              <ClientForm 
                onSuccess={() => {
                  setShowAddClientModal(false);
                  fetchClients();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari klien berdasarkan nama, email, atau perusahaan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter jenis klien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Klien</SelectItem>
              <SelectItem value="individual">Individu</SelectItem>
              <SelectItem value="corporate">Perusahaan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data klien...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {client.client_type === 'individual' ? (
                        <User className="h-5 w-5 text-primary" />
                      ) : (
                        <Building className="h-5 w-5 text-teal" />
                      )}
                      <Badge variant={client.client_type === 'individual' ? 'default' : 'secondary'}>
                        {client.client_type === 'individual' ? 'Individu' : 'Perusahaan'}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg">{client.full_name}</CardTitle>
                  {client.company_name && (
                    <CardDescription className="font-medium">
                      {client.company_name}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-2">
                  {client.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  
                  {client.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  )}
                  
                  {(client.nik || client.npwp) && (
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {client.nik ? `NIK: ${client.nik}` : ''}
                        {client.nik && client.npwp ? ' • ' : ''}
                        {client.npwp ? `NPWP: ${client.npwp}` : ''}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-2 text-xs text-muted-foreground">
                    Terdaftar: {new Date(client.created_at).toLocaleDateString('id-ID')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredClients.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tidak ada klien ditemukan
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Coba ubah kata kunci pencarian' : 'Belum ada klien yang terdaftar'}
            </p>
            {!searchTerm && (
              <Dialog open={showAddClientModal} onOpenChange={setShowAddClientModal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Klien Pertama
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Klien Baru</DialogTitle>
                  </DialogHeader>
                  <ClientForm 
                    onSuccess={() => {
                      setShowAddClientModal(false);
                      fetchClients();
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </main>
    </div>
  )
}