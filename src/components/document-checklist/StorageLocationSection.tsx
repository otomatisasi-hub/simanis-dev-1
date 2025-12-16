'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { StorageLocationCard } from './StorageLocationCard'
import type { ServiceData } from './useDocumentChecklist'

interface StorageLocationSectionProps {
  allStepsCompleted: boolean
  storageLocation: any
  serviceData: ServiceData | null
  storageDialogOpen: boolean
  onOpenChange: (open: boolean) => void
  storageRack: string
  storageYear: string
  storageMonth: string
  storageNomorBuku: string        // ✅ TAMBAH PROP INI
  storageNomorLembar: string
  storageNotes: string
  onChangeRack: (v: string) => void
  onChangeYear: (v: string) => void
  onChangeMonth: (v: string) => void
  onChangeNomorBuku: (v: string) => void    // ✅ TAMBAH PROP INI
  onChangeNomorLembar: (v: string) => void
  onChangeNotes: (v: string) => void
  generateStorageLocationPreview: () => string
  onSubmit: () => void
}

export function StorageLocationSection({
  allStepsCompleted,
  storageLocation,
  serviceData,
  storageDialogOpen,
  onOpenChange,
  storageRack,
  storageYear,
  storageMonth,
  storageNomorBuku,        // ✅ DESTRUCTURE PROP BARU
  storageNomorLembar,
  storageNotes,
  onChangeRack,
  onChangeYear,
  onChangeMonth,
  onChangeNomorBuku,       // ✅ DESTRUCTURE HANDLER BARU
  onChangeNomorLembar,
  onChangeNotes,
  generateStorageLocationPreview,
  onSubmit,
}: StorageLocationSectionProps) {
  // ✅ UPDATE VALIDASI: TAMBAH storageNomorBuku
  const isIncomplete =
    !storageRack || !storageYear || !storageMonth || !storageNomorBuku || !storageNomorLembar

  return (
    <>
      <StorageLocationCard
        allStepsCompleted={allStepsCompleted}
        storageLocation={storageLocation}
        serviceTitle={serviceData?.title}
        onOpenDialog={() => onOpenChange(true)}
      />

      <Dialog open={storageDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {storageLocation ? 'Edit' : 'Tambah'} Lokasi Simpan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Info layanan */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Judul Layanan</p>
                  <p className="font-semibold">{serviceData?.title || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Klien</p>
                  <p className="font-semibold">
                    {serviceData?.clients?.full_name || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* No. Rak */}
            <div>
              <Label className="text-sm font-semibold">No. Rak *</Label>
              <Input
                value={storageRack}
                onChange={(e) => onChangeRack(e.target.value)}
                placeholder="001"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contoh: 001, 002, A-01
              </p>
            </div>

            {/* Tanggal Dokumen: Tahun & Bulan saja */}
            <div>
              <p className="text-sm font-semibold mb-3">Tanggal Dokumen *</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Tahun</Label>
                  <Input
                    type="number"
                    value={storageYear}
                    onChange={(e) => onChangeYear(e.target.value)}
                    placeholder="2025"
                    min={2000}
                    max={2099}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Bulan</Label>
                  <select
                    value={storageMonth}
                    onChange={(e) => onChangeMonth(e.target.value)}
                    className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih</option>
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

            {/* ✅ NOMOR BUKU - INPUT BARU */}
            <div>
              <Label className="text-sm font-semibold">Nomor Buku *</Label>
              <Input
                type="number"
                value={storageNomorBuku}
                onChange={(e) => onChangeNomorBuku(e.target.value)}  // Harus onChangeNomorBuku fungsi yg valid
                placeholder="1"
                min={1}
                className="mt-1"
              />

              <p className="text-xs text-gray-500 mt-1">
                Contoh: 1, 2, 3
              </p>
            </div>

            {/* Akta */}
            <div>
              <Label className="text-sm font-semibold">Halaman *</Label>
              <Input
                value={storageNomorLembar}
                onChange={(e) => onChangeNomorLembar(e.target.value)}
                placeholder="26"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contoh: 1, 2, 3, ..., n.
              </p>
            </div>

            {/* ✅ Preview - UPDATE KONDISI */}
            {(storageRack || storageYear || storageMonth || storageNomorBuku || storageNomorLembar) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-semibold mb-1">
                  Preview Lokasi Simpan:
                </p>
                <p className="text-sm text-green-900 font-mono">
                  {generateStorageLocationPreview()}
                </p>
              </div>
            )}

            {/* Catatan */}
            <div>
              <Label className="text-sm font-semibold">
                Catatan (Opsional)
              </Label>
              <Textarea
                value={storageNotes}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder="Tambahkan catatan tambahan..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Tombol aksi */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                onClick={onSubmit}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isIncomplete}
              >
                Simpan Lokasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
