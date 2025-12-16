import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { CalendarIcon, Filter, RotateCcw } from "lucide-react"
import { format, subDays, startOfYear } from "date-fns"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"

interface GlobalFiltersProps {
  menu: 'notaris' | 'notaris_syariah' | 'ppat'
  onFiltersChange: (filters: FilterValues) => void
  className?: string
}

export interface FilterValues {
  menu: 'notaris' | 'notaris_syariah' | 'ppat'
  layanan: string
  subLayanan: string
  jenisKlien: string
  status: string
  tanggalMulai: Date | null
  tanggalAkhir: Date | null
  search: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'in-progress', label: 'Sedang Proses' },
  { value: 'pending-payment', label: 'Menunggu Pembayaran' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' }
]

const DATE_PRESETS = [
  { label: 'Hari ini', getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: '7 hari', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: '30 hari', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Tahun berjalan', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) }
]

export function GlobalFilters({ menu, onFiltersChange, className }: GlobalFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    menu,
    layanan: 'all',
    subLayanan: 'all',
    jenisKlien: 'all',
    status: 'all',
    tanggalMulai: null,
    tanggalAkhir: null,
    search: ''
  })

  const [showFilters, setShowFilters] = useState(false)
  const [layananOptions, setLayananOptions] = useState<Array<{ value: string; label: string }>>([])
  const [subLayananOptions, setSubLayananOptions] = useState<Array<{ value: string; label: string }>>([])
  const [jenisKlienOptions, setJenisKlienOptions] = useState<Array<{ value: string; label: string }>>([])

  // Load layanan options berdasarkan menu
  useEffect(() => {
    async function loadLayanan() {
      const { data, error } = await supabase
        .from('service_document_requirements')
        .select('layanan')
        .eq('menu', menu)

      if (error) {
        console.error('Error loading layanan:', error)
        return
      }

      const distinct = Array.from(new Set((data || []).map(r => r.layanan)))
      const options = [
        { value: 'all', label: 'Semua Layanan' },
        ...distinct.map(l => ({ value: l, label: l }))
      ]
      setLayananOptions(options)
    }

    loadLayanan()
    // Reset filters saat menu berubah
    setFilters(prev => ({
      ...prev,
      menu,
      layanan: 'all',
      subLayanan: 'all',
      jenisKlien: 'all'
    }))
  }, [menu])

  // Load sub layanan berdasarkan layanan terpilih (FLEKSIBEL - tidak harus pilih layanan dulu)
  useEffect(() => {
    async function loadSubLayanan() {
      let query = supabase
        .from('service_document_requirements')
        .select('sub_layanan')
        .eq('menu', menu)

      // Hanya filter berdasarkan layanan jika layanan dipilih
      if (filters.layanan !== 'all') {
        query = query.eq('layanan', filters.layanan)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading sub layanan:', error)
        return
      }

      const distinct = Array.from(new Set((data || []).map(r => r.sub_layanan)))
      const options = [
        { value: 'all', label: 'Semua Sub Layanan' },
        ...distinct.map(s => ({ value: s, label: s }))
      ]
      setSubLayananOptions(options)
    }

    loadSubLayanan()
  }, [menu, filters.layanan])

  // Load jenis klien berdasarkan layanan dan sub layanan (FLEKSIBEL)
  useEffect(() => {
    async function loadJenisKlien() {
      let query = supabase
        .from('service_document_requirements')
        .select('jenis_klien')
        .eq('menu', menu)

      // Filter berdasarkan layanan jika dipilih
      if (filters.layanan !== 'all') {
        query = query.eq('layanan', filters.layanan)
      }

      // Filter berdasarkan sub_layanan jika dipilih
      if (filters.subLayanan !== 'all') {
        query = query.eq('sub_layanan', filters.subLayanan)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading jenis klien:', error)
        return
      }

      const distinct = Array.from(new Set((data || []).map(r => r.jenis_klien)))
      const options = [
        { value: 'all', label: 'Semua Jenis Klien' },
        ...distinct.map(j => ({ value: j, label: j }))
      ]
      setJenisKlienOptions(options)
    }

    loadJenisKlien()
  }, [menu, filters.layanan, filters.subLayanan])

  const updateFilters = (newFilters: Partial<FilterValues>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const resetFilters = () => {
    const defaultFilters: FilterValues = {
      menu,
      layanan: 'all',
      subLayanan: 'all',
      jenisKlien: 'all',
      status: 'all',
      tanggalMulai: null,
      tanggalAkhir: null,
      search: ''
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const applyDatePreset = (preset: typeof DATE_PRESETS) => {
    const dates = preset.getValue()
    updateFilters({
      tanggalMulai: dates.start,
      tanggalAkhir: dates.end
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Toggle */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Cari layanan, klien, atau nomor..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Layanan Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Layanan</label>
              <Select 
                value={filters.layanan} 
                onValueChange={(value) => {
                  // Reset child filters saat ganti layanan
                  updateFilters({ 
                    layanan: value, 
                    subLayanan: 'all', 
                    jenisKlien: 'all' 
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {layananOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub Layanan Filter - TIDAK DISABLED */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Layanan</label>
              <Select 
                value={filters.subLayanan} 
                onValueChange={(value) => {
                  // Reset jenis klien saat ganti sub layanan
                  updateFilters({ 
                    subLayanan: value, 
                    jenisKlien: 'all' 
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {subLayananOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jenis Klien Filter - TIDAK DISABLED */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Klien</label>
              <Select 
                value={filters.jenisKlien} 
                onValueChange={(value) => updateFilters({ jenisKlien: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {jenisKlienOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => updateFilters({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Dibuat</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.tanggalMulai && filters.tanggalAkhir ? (
                      `${format(filters.tanggalMulai, "dd/MM/yy")} - ${format(filters.tanggalAkhir, "dd/MM/yy")}`
                    ) : (
                      "Tanggal"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border border-border" align="start">
                  <div className="p-3 space-y-3">
                    {/* Date Presets */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Preset:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {DATE_PRESETS.map((preset) => (
                          <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            onClick={() => applyDatePreset(preset)}
                            className="text-xs"
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Custom Date Range */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Kustom:</p>
                      <div className="flex space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              {filters.tanggalMulai ? format(filters.tanggalMulai, "dd/MM") : "Mulai"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-background border border-border">
                            <Calendar
                              mode="single"
                              selected={filters.tanggalMulai || undefined}
                              onSelect={(date) => updateFilters({ tanggalMulai: date || null })}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              {filters.tanggalAkhir ? format(filters.tanggalAkhir, "dd/MM") : "Akhir"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-background border border-border">
                            <Calendar
                              mode="single"
                              selected={filters.tanggalAkhir || undefined}
                              onSelect={(date) => updateFilters({ tanggalAkhir: date || null })}
                              disabled={(date) => filters.tanggalMulai ? date < filters.tanggalMulai : false}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
