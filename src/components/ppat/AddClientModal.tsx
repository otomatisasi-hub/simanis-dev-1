'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, CheckCircle2, X, FileText, Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type FormState = {
  namaPT: string;
  clientType: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  layanan: string;
  subLayanan: string;
  deadline: string | null;
};

type UploadedDoc = {
  name: string;
  is_required: boolean;
  is_uploaded: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  uploaded_at?: string;
};

const API_BASE_URL = 'http://localhost:3001';

export function AddClientModal({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [layananOptions, setLayananOptions] = useState<string[]>([]);
  const [subLayananOptions, setSubLayananOptions] = useState<string[]>([]);
  const [jenisKlienOptions, setJenisKlienOptions] = useState<string[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);

  const [form, setForm] = useState<FormState>({
    namaPT: '',
    clientType: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
    layanan: '',
    subLayanan: '',
    deadline: null,
  });

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!open) return;

    async function loadLayanan() {
      const { data, error } = await supabase
        .from('service_document_requirements')
        .select('layanan')
        .eq('menu', 'ppat');
      if (error) {
        toast({
          title: 'Gagal memuat layanan',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      const distinct = Array.from(new Set((data || []).map((r) => r.layanan)));
      setLayananOptions(distinct);
    }

    loadLayanan();

    setForm({
      namaPT: '',
      clientType: '',
      email: '',
      phone: '',
      address: '',
      companyName: '',
      layanan: '',
      subLayanan: '',
      deadline: null,
    });
    setSubLayananOptions([]);
    setJenisKlienOptions([]);
    setUploadedDocuments([]);
  }, [open]);

  useEffect(() => {
    if (!form.layanan) {
      setSubLayananOptions([]);
      setJenisKlienOptions([]);
      setUploadedDocuments([]);
      return;
    }
    async function loadSubLayanan() {
      const { data, error } = await supabase
        .from('service_document_requirements')
        .select('sub_layanan')
        .eq('menu', 'ppat')
        .eq('layanan', form.layanan);
      if (error) {
        toast({
          title: 'Gagal memuat sub layanan',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      const distinct = Array.from(new Set((data || []).map((r) => r.sub_layanan)));
      setSubLayananOptions(distinct);
      setField('subLayanan', '');
      setField('clientType', '');
      setJenisKlienOptions([]);
      setUploadedDocuments([]);
    }
    loadSubLayanan();
  }, [form.layanan]);

  useEffect(() => {
    if (!form.layanan || !form.subLayanan) {
      setJenisKlienOptions([]);
      setUploadedDocuments([]);
      return;
    }
    async function loadJenisKlien() {
      const { data, error } = await supabase
        .from('service_document_requirements')
        .select('jenis_klien')
        .eq('menu', 'ppat')
        .eq('layanan', form.layanan)
        .eq('sub_layanan', form.subLayanan);
      if (error) {
        console.error(error);
        return;
      }
      const distinct = Array.from(new Set((data || []).map((r) => r.jenis_klien.trim())));
      setJenisKlienOptions(distinct);
      setField('clientType', '');
      setUploadedDocuments([]);
      if (distinct.length === 1) setField('clientType', distinct[0]);
    }
    loadJenisKlien();
  }, [form.layanan, form.subLayanan]);

  useEffect(() => {
    if (!form.layanan || !form.subLayanan || !form.clientType) {
      setUploadedDocuments([]);
      return;
    }
    async function loadDocuments() {
      const { data, error } = await supabase
        .from('service_document_requirements')
        .select('mandatory_documents')
        .eq('menu', 'ppat')
        .eq('layanan', form.layanan)
        .eq('sub_layanan', form.subLayanan)
        .eq('jenis_klien', form.clientType)
        .maybeSingle();
      if (error) {
        console.error(error);
        return;
      }
      let docs: string[] = [];
      if (data?.mandatory_documents) {
        docs = Array.isArray(data.mandatory_documents) ? data.mandatory_documents : JSON.parse(data.mandatory_documents);
      }
      setUploadedDocuments(docs.map(name => ({
        name,
        is_required: true,
        is_uploaded: false,
      })));
    }
    loadDocuments();
  }, [form.layanan, form.subLayanan, form.clientType]);

  const resetForm = () => {
    setForm({
      namaPT: '',
      clientType: '',
      email: '',
      phone: '',
      address: '',
      companyName: '',
      layanan: '',
      subLayanan: '',
      deadline: null,
    });
    setLayananOptions([]);
    setSubLayananOptions([]);
    setJenisKlienOptions([]);
    setUploadedDocuments([]);
  };

  const handleClose = (state: boolean) => {
    onOpenChange(state);
    if (!state) resetForm();
  };

  const validateBeforeSubmit = () => {
    if (!form.namaPT) return 'Nama klien wajib diisi';
    if (!form.layanan) return 'Layanan harus dipilih';
    if (!form.subLayanan) return 'Sub Layanan harus dipilih';
    if (!form.clientType) return 'Jenis Klien harus dipilih';

    const isCompany = ['perusahaan', 'corporate', 'pt'].some(str => form.clientType.toLowerCase().includes(str));
    if (isCompany && !form.companyName) {
      return 'Nama perusahaan wajib diisi untuk jenis klien Perusahaan';
    }

    const missingDocs = uploadedDocuments.filter(doc => doc.is_required && !doc.is_uploaded);
    if (missingDocs.length > 0) {
      return `Masih ada ${missingDocs.length} dokumen wajib yang belum diupload`;
    }

    return null;
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Ukuran file maksimal 10MB',
        variant: 'destructive',
      });
      return;
    }
    try {
      setUploadingIndex(index);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docId', `client-doc-${Date.now()}`);
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload gagal');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Upload gagal');

      setUploadedDocuments(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          is_uploaded: true,
          file_url: `${API_BASE_URL}${result.fileUrl}`,
          file_name: result.fileName,
          file_size: result.fileSize,
          uploaded_at: result.uploadedAt,
        };
        return updated;
      });

      toast({
        title: 'Berhasil',
        description: `${file.name} berhasil diupload`,
      });
    } catch (error: any) {
      toast({
        title: 'Gagal upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveFile = async (index: number) => {
    const doc = uploadedDocuments[index];
    if (doc.file_url) {
      try {
        await fetch(`${API_BASE_URL}/api/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: doc.file_url }),
        });
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    setUploadedDocuments(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        is_uploaded: false,
        file_url: undefined,
        file_name: undefined,
        file_size: undefined,
        uploaded_at: undefined,
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validateBeforeSubmit();
    if (msg) {
      toast({ title: 'Validasi Error', description: msg, variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user?.id) throw new Error('User tidak terdeteksi');
      const currentUserId = userRes.user.id;

      const { data: clientRow, error: clientErr } = await supabase
        .from('clients')
        .insert({
          client_type: form.clientType,
          full_name: form.namaPT,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          company_name: form.companyName || null,
          created_by: currentUserId,
          jenis_layanan: form.subLayanan || null,
          deadline: form.deadline || null,
          mandatory_documents_uploaded: uploadedDocuments,
        })
        .select()
        .single();
      if (clientErr) throw clientErr;

      const { data: srvReqData, error: srvReqError } = await supabase
        .from('service_document_requirements')
        .select('category_id')
        .eq('menu', 'ppat')
        .eq('layanan', form.layanan)
        .eq('sub_layanan', form.subLayanan)
        .eq('jenis_klien', form.clientType)
        .limit(1)
        .single();
      if (srvReqError || !srvReqData?.category_id) throw new Error('Kategori layanan tidak ditemukan');
      const categoryId = srvReqData.category_id;

      const { error: serviceErr } = await supabase
        .from('services')
        .insert({
          title: form.layanan,
          client_id: clientRow.id,
          layanan: form.layanan,
          sub_layanan: form.subLayanan,
          jenis_klien: form.clientType,
          status: 'draft',
          created_by: currentUserId,
          assigned_to: currentUserId,
          estimated_completion_date: form.deadline || null,
          deadline: form.deadline || null,
        });
      if (serviceErr) throw serviceErr;


      toast({
        title: 'Berhasil',
        description: `Klien berhasil dibuat dengan ${uploadedDocuments.filter(d => d.is_uploaded).length}/${uploadedDocuments.length} dokumen terupload`,
      });

      onSuccess?.();
      handleClose(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Klien PPAT</DialogTitle>
          <DialogDescription>Lengkapi data klien dan upload dokumen yang diperlukan.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form for layanan, sub layanan, jenis klien */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Layanan <span className="text-red-500">*</span>
              </Label>
              <Select value={form.layanan} onValueChange={(v) => setField('layanan', v)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih layanan" />
                </SelectTrigger>
                <SelectContent>
                  {layananOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                Sub Layanan <span className="text-red-500">*</span>
              </Label>
              <Select value={form.subLayanan} onValueChange={(v) => setField('subLayanan', v)} disabled={!form.layanan || loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sub layanan" />
                </SelectTrigger>
                <SelectContent>
                  {subLayananOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Jenis Klien <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.clientType}
                onValueChange={(v) => setField('clientType', v)}
                disabled={!form.subLayanan || loading || jenisKlienOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis klien" />
                </SelectTrigger>
                <SelectContent>
                  {jenisKlienOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Deadline</Label>
              <Input
                type="date"
                value={form.deadline || ''}
                onChange={(e) => setField('deadline', e.target.value || null)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Upload Dokumen */}
          {uploadedDocuments.length > 0 && (
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900">
                  Upload Dokumen ({uploadedDocuments.filter((d) => d.is_uploaded).length}/{uploadedDocuments.length})
                </h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {uploadedDocuments.map((doc, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {doc.name}
                          <span className="text-red-500 ml-1">*</span>
                        </p>

                        {doc.is_uploaded && doc.file_name && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{doc.file_name}</span>
                            <span className="text-gray-500">({formatFileSize(doc.file_size || 0)})</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.is_uploaded ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(idx)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Input
                              id={`file-${idx}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(idx, file);
                              }}
                              disabled={loading || uploadingIndex === idx}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`file-${idx}`)?.click()}
                              disabled={loading || uploadingIndex === idx}
                            >
                              {uploadingIndex === idx ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Format: PDF, JPG, PNG, DOC, DOCX (Max 10MB per file)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Nama Klien <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Nama lengkap klien"
                value={form.namaPT}
                onChange={(e) => setField('namaPT', e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">
                Nama Perusahaan {form.clientType.toLowerCase().includes('perusahaan') && <span className="text-red-500">*</span>}
              </Label>
              <Input
                placeholder="Wajib untuk Perusahaan"
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">No. Telepon</Label>
              <Input
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Alamat</Label>
            <Input
              placeholder="Alamat lengkap"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleClose(false)} 
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddClientModal;
