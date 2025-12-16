import { useState } from "react"
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

interface AddInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddInvoiceModal({ open, onOpenChange }: AddInvoiceModalProps) {
  const [formData, setFormData] = useState({
    invoice: '',
    klien: '',
    layanan: '',
    jumlah: '',
    deskripsi: '',
    tanggalJatuhTempo: undefined as Date | undefined
  })
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.invoice || !formData.klien || !formData.layanan || !formData.jumlah) {
      toast({
        title: "Error",
        description: "Invoice, klien, layanan, dan jumlah wajib diisi",
        variant: "destructive"
      })
      return
    }

    // Validate amount is a number
    const amount = parseFloat(formData.jumlah.replace(/[^\d]/g, ''))
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Jumlah harus berupa angka yang valid",
        variant: "destructive"
      })
      return
    }

    // Simulate API call
    console.log('Adding invoice:', {
      ...formData,
      jumlah: amount
    })
    
    toast({
      title: "Berhasil",
      description: "Invoice berhasil dibuat",
    })
    
    // Reset form and close modal
    setFormData({
      invoice: '',
      klien: '',
      layanan: '',
      jumlah: '',
      deskripsi: '',
      tanggalJatuhTempo: undefined
    })
    onOpenChange(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatCurrency = (value: string) => {
    const number = value.replace(/[^\d]/g, '')
    return new Intl.NumberFormat('id-ID').format(parseInt(number) || 0)
  }

  const handleAmountChange = (value: string) => {
    const formatted = formatCurrency(value)
    setFormData(prev => ({
      ...prev,
      jumlah: formatted
    }))
  }

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const invoiceNum = `INV-${year}${month}-${randomNum}`
    setFormData(prev => ({
      ...prev,
      invoice: invoiceNum
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tambah Invoice Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice">Nomor Invoice *</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice"
                  value={formData.invoice}
                  onChange={(e) => handleInputChange('invoice', e.target.value)}
                  placeholder="INV-202X-XXX"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateInvoiceNumber}
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="klien">Klien *</Label>
              <Select value={formData.klien} onValueChange={(value) => handleInputChange('klien', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih klien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT. Maju Jaya">PT. Maju Jaya</SelectItem>
                  <SelectItem value="John Doe">John Doe</SelectItem>
                  <SelectItem value="CV. Berkah Abadi">CV. Berkah Abadi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="layanan">Layanan *</Label>
              <Select value={formData.layanan} onValueChange={(value) => handleInputChange('layanan', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih layanan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Akta Pendirian PT">Akta Pendirian PT</SelectItem>
                  <SelectItem value="Akta Jual Beli">Akta Jual Beli</SelectItem>
                  <SelectItem value="Surat Kuasa">Surat Kuasa</SelectItem>
                  <SelectItem value="Akta Hibah">Akta Hibah</SelectItem>
                  <SelectItem value="Kontrak Kerja">Kontrak Kerja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah (IDR) *</Label>
              <Input
                id="jumlah"
                value={formData.jumlah}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tanggal Jatuh Tempo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.tanggalJatuhTempo ? (
                    format(formData.tanggalJatuhTempo, "PPP", { locale: id })
                  ) : (
                    <span>Pilih tanggal jatuh tempo</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.tanggalJatuhTempo}
                  onSelect={(date) => setFormData(prev => ({ ...prev, tanggalJatuhTempo: date }))}
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
              placeholder="Masukkan deskripsi atau catatan tambahan"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              Buat Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}