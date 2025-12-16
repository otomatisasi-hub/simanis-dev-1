import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface AddWorksheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddWorksheetModal({ open, onOpenChange, onSuccess }: AddWorksheetModalProps) {
  const [formData, setFormData] = useState({
    judul: '',
    klien: '',
    deskripsi: '',
    deadline: undefined as Date | undefined
  })
  const [clients, setClients] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchClients()
    }
  }, [open])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name')
      
      if (error) throw error
      setClients(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data klien",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.judul || !formData.klien) {
      toast({
        title: "Error",
        description: "Judul dan klien wajib diisi",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get Notaris category
      const { data: categories, error: categoryError } = await supabase
        .from('service_categories')
        .select('id')
        .eq('type', 'notaris')
        .limit(1)

      if (categoryError) {
        throw new Error("Error fetching category: " + categoryError.message)
      }

      const category = categories && categories.length > 0 ? categories[0] : null

      if (!category) {
        throw new Error("Category 'notaris' tidak ditemukan. Silakan hubungi administrator.")
      }

      // Generate reference number
      const now = new Date()
      const refNumber = `NT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`

      const { error } = await supabase
        .from('services')
        .insert({
          title: formData.judul,
          client_id: formData.klien,
          description: formData.deskripsi || null,
          priority: 'normal',
          estimated_completion_date: formData.deadline?.toISOString().split('T')[0] || null,
          category_id: category.id,
          reference_number: refNumber,
          created_by: user.id,
          status: 'draft'
        })

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Lembar kerja berhasil dibuat",
      })
      
      // Reset form and close modal
      setFormData({
        judul: '',
        klien: '',
        deskripsi: '',
        deadline: undefined
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat lembar kerja",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Buat Lembar Kerja Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="judul">Judul Lembar Kerja *</Label>
            <Input
              id="judul"
              value={formData.judul}
              onChange={(e) => handleInputChange('judul', e.target.value)}
              placeholder="Masukkan judul lembar kerja"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="klien">Klien *</Label>
            <Select value={formData.klien} onValueChange={(value) => handleInputChange('klien', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih klien" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.deadline ? (
                    format(formData.deadline, "PPP", { locale: id })
                  ) : (
                    <span>Pilih tanggal deadline</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Textarea
              id="deskripsi"
              value={formData.deskripsi}
              onChange={(e) => handleInputChange('deskripsi', e.target.value)}
              placeholder="Masukkan deskripsi tugas atau catatan"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Buat Lembar Kerja"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
