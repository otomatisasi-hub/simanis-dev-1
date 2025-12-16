// src/components/notaris/NotaryDetailView.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, CheckCircle2, X, Loader2 } from "lucide-react";
import { useModule } from "@/context/ModuleContext";

type UploadedDoc = {
  name: string;
  is_required: boolean;
  is_uploaded: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  uploaded_at?: string;
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
  biayaLayanan: string;
};

type NotaryDetailViewProps = {
  // Bentuk data ini mengikuti hasil query klien di NotaryPage (clients + services nested)
  data: any;
  onSuccess?: () => void;
};

const API_BASE_URL = "http://localhost:3001";

export function NotaryDetailView({ data, onSuccess }: NotaryDetailViewProps) {
  const { toast } = useToast();
  const { currentModule } = useModule();

  const menuKey =
    currentModule === "ppat"
      ? "ppat"
      : currentModule === "notaris_syariah"
      ? "notaris_syariah"
      : "notaris";

  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    namaPT: "",
    clientType: "",
    email: "",
    phone: "",
    address: "",
    companyName: "",
    layanan: "",
    subLayanan: "",
    deadline: null,
    biayaLayanan: "",
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Format & parse biaya layanan (Rupiah)
  const formatRupiah = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return Number(numeric).toLocaleString("id-ID");
  };

  const handleBiayaLayananChange = (value: string) => {
    const formatted = formatRupiah(value);
    setField("biayaLayanan", formatted);
  };

  const parseBiayaLayanan = (value: string): number | null => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return null;
    const n = Number(numeric);
    return Number.isNaN(n) ? null : n;
  };

  // Inisialisasi form dari data klien + layanan yang diterima dari NotaryPage
  useEffect(() => {
    if (!data) return;

    const client = data;
    const primaryService =
      Array.isArray(client.services) && client.services.length > 0
        ? client.services[0]
        : client.service || null;

    setServiceId(primaryService?.id ?? null);

    const namaPT = client.full_name || client.fullname || "";
    const companyName = client.company_name || client.companyname || "";
    const email = client.email || "";
    const phone = client.phone || "";
    const address = client.address || "";
    const deadlineRaw =
      primaryService?.deadline ||
      primaryService?.estimated_completion_date ||
      client.deadline ||
      null;

    const layanan =
      primaryService?.layanan || client.layanan || client.jenis_layanan || "";
    const subLayanan =
      primaryService?.sub_layanan ||
      primaryService?.sublayanan ||
      client.jenis_layanan ||
      "";
    const clientType =
      primaryService?.jenis_klien ||
      primaryService?.jenisklien ||
      client.client_type ||
      client.clienttype ||
      "";

    const feeAmount = primaryService?.fee_amount ?? primaryService?.feeamount;

    setForm({
      namaPT,
      clientType,
      email,
      phone,
      address,
      companyName,
      layanan,
      subLayanan,
      deadline: deadlineRaw,
      biayaLayanan: feeAmount ? formatRupiah(String(feeAmount)) : "",
    });

    // Inisialisasi dokumen dari kolom clients.mandatory_documents_uploaded (jika ada)
    let rawDocs =
      client.mandatory_documents_uploaded ||
      client.mandatoryDocumentsUploaded ||
      null;

    try {
      if (typeof rawDocs === "string") {
        rawDocs = JSON.parse(rawDocs);
      }
    } catch {
      // ignore parse error
    }

    if (Array.isArray(rawDocs)) {
      const docs: UploadedDoc[] = rawDocs.map((doc: any) => ({
        name: doc.name,
        is_required: doc.is_required ?? doc.isrequired ?? true,
        is_uploaded:
          doc.is_uploaded ?? doc.isuploaded ?? Boolean(doc.file_url || doc.fileurl),
        file_url: doc.file_url ?? doc.fileurl,
        file_name: doc.file_name ?? doc.filename,
        file_size: doc.file_size ?? doc.filesize,
        uploaded_at: doc.uploaded_at ?? doc.uploadedat,
      }));
      setUploadedDocuments(docs);
    } else {
      setUploadedDocuments([]);
    }
  }, [data]);

  // Validasi sebelum submit update
  const validateBeforeSubmit = () => {
    if (!form.namaPT) {
      return "Nama klien wajib diisi";
    }

    // Biaya Layanan wajib dan > 0
    const fee = parseBiayaLayanan(form.biayaLayanan);
    if (!fee || fee <= 0) {
      return "Biaya Layanan wajib diisi dan harus lebih besar dari 0";
    }

    const isCompany = ["perusahaan", "corporate", "pt"].some((str) =>
      form.clientType.toLowerCase().includes(str)
    );
    if (isCompany && !form.companyName) {
      return "Nama perusahaan wajib diisi untuk jenis klien Perusahaan";
    }

    const missingDocs = uploadedDocuments.filter(
      (doc) => doc.is_required && !doc.is_uploaded
    );
    if (missingDocs.length > 0) {
      return `Masih ada ${missingDocs.length} dokumen wajib yang belum diupload`;
    }

    return null;
  };

  // Upload file dokumen (sama pola dengan AddClientModal, pakai token Supabase + API backend)
  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran file maksimal 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingIndex(index);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("User tidak terautentikasi");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("modul", menuKey);
      formData.append("layanan", form.layanan || "general");
      formData.append("clientName", form.namaPT || "unknown");
      formData.append("category", uploadedDocuments[index].name);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload error response:", errorText);
        throw new Error(`Upload gagal: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Upload gagal");
      }

      setUploadedDocuments((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          is_uploaded: true,
          file_url: result.data?.url || result.fileUrl,
          file_name: result.data?.filename || result.fileName || file.name,
          file_size: result.data?.size || result.fileSize || file.size,
          uploaded_at: new Date().toISOString(),
        };
        return updated;
      });

      toast({
        title: "Berhasil",
        description: `${file.name} berhasil diupload`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Gagal upload",
        description: error.message || "Terjadi kesalahan saat upload",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveFile = async (index: number) => {
    const doc = uploadedDocuments[index];

    if (doc.file_url) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        await fetch(`${API_BASE_URL}/api/delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ filename: doc.file_name }),
        });
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }

    setUploadedDocuments((prev) => {
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validateBeforeSubmit();
    if (msg) {
      toast({
        title: "Validasi Error",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const {
        data: userRes,
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !userRes?.user?.id) {
        throw new Error("User tidak terdeteksi");
      }
      const currentUserId = userRes.user.id;

      const feeAmountNumber = parseBiayaLayanan(form.biayaLayanan);

      // 1. UPDATE CLIENT
      const { error: clientErr } = await supabase
        .from("clients")
        .update({
          client_type: form.clientType,
          full_name: form.namaPT,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          company_name: form.companyName || null,
          jenis_layanan: form.subLayanan || null,
          deadline: form.deadline || null,
          mandatory_documents_uploaded: uploadedDocuments,
        })
        .eq("id", data.id);

      if (clientErr) throw clientErr;

      // 2. UPDATE SERVICE (jika ada)
      if (serviceId) {
        const serviceUpdate: any = {
          title: form.layanan,
          layanan: form.layanan,
          sub_layanan: form.subLayanan,
          jenis_klien: form.clientType,
          estimated_completion_date: form.deadline || null,
          deadline: form.deadline || null,
          menu_layanan: menuKey,
        };

        if (feeAmountNumber !== null) {
          serviceUpdate.fee_amount = feeAmountNumber;
        }

        const { error: serviceErr } = await supabase
          .from("services")
          .update(serviceUpdate)
          .eq("id", serviceId);

        if (serviceErr) throw serviceErr;

        // 3. UPDATE/INSERT SERVICE_FINANCES untuk "Biaya Layanan"
        if (feeAmountNumber && feeAmountNumber > 0) {
          const {
            data: existingFinance,
            error: financeFetchErr,
          } = await supabase
            .from("service_finances")
            .select("id, due_date")
            .eq("service_id", serviceId)
            .eq("follow_up_type", "Biaya Layanan")
            .maybeSingle();

          if (financeFetchErr) {
            console.error("Lookup service_finances error", financeFetchErr);
          } else if (existingFinance) {
            const { error: financeUpdateErr } = await supabase
              .from("service_finances")
              .update({
                amount: feeAmountNumber,
                due_date:
                  form.deadline || existingFinance.due_date || new Date().toISOString().slice(0, 10),
              })
              .eq("id", existingFinance.id);

            if (financeUpdateErr) {
              console.error("Update service_finances error", financeUpdateErr);
            }
          } else {
            const { error: financeInsertErr } = await supabase
              .from("service_finances")
              .insert({
                service_id: serviceId,
                follow_up_type: "Biaya Layanan",
                due_date:
                  form.deadline || new Date().toISOString().slice(0, 10),
                amount: feeAmountNumber,
                status: "pending",
                created_by: currentUserId,
              });

            if (financeInsertErr) {
              console.error("Insert service_finances error", financeInsertErr);
            }
          }
        }
      }

      toast({
        title: "Berhasil",
        description: `Data klien berhasil diperbarui dengan ${
          uploadedDocuments.filter((d) => d.is_uploaded).length
        }/${uploadedDocuments.length} dokumen terupload`,
      });

      onSuccess?.();
    } catch (err: any) {
      console.error("Update client error:", err);
      toast({
        title: "Error",
        description: err.message || "Gagal memperbarui data klien",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-4">
      {/* Informasi Layanan (read-only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Layanan</Label>
          <Input value={form.layanan} disabled className="bg-slate-50" />
        </div>
        <div>
          <Label className="text-sm font-medium">Sub Layanan</Label>
          <Input value={form.subLayanan} disabled className="bg-slate-50" />
        </div>
        <div>
          <Label className="text-sm font-medium">Jenis Klien</Label>
          <Input value={form.clientType} disabled className="bg-slate-50" />
        </div>
      </div>

      {/* Deadline & Biaya Layanan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Deadline</Label>
          <Input
            type="date"
            value={form.deadline || ""}
            onChange={(e) => setField("deadline", e.target.value || null)}
            disabled={loading}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">
            Biaya Layanan Rp <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            value={form.biayaLayanan}
            onChange={(e) => handleBiayaLayananChange(e.target.value)}
            placeholder="Contoh 5.000.000"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Biaya jasa notaris yang dibebankan ke klien. Akan tersinkron ke
            keuangan.
          </p>
        </div>
      </div>

      {/* Upload Dokumen */}
      {uploadedDocuments.length > 0 && (
        <div className="p-4 border rounded-lg bg-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">
              Dokumen Wajib (
              {uploadedDocuments.filter((d) => d.is_uploaded).length}/
              {uploadedDocuments.length})
            </h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadedDocuments.map((doc, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {doc.name}
                      {doc.is_required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </p>

                    {doc.is_uploaded && doc.file_name && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{doc.file_name}</span>
                        <span className="text-gray-500">
                          ({formatFileSize(doc.file_size || 0)})
                        </span>
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
                          onClick={() =>
                            document
                              .getElementById(`file-${idx}`)
                              ?.click()
                          }
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

      {/* Data Klien */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">
            Nama Klien <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Nama lengkap klien"
            value={form.namaPT}
            onChange={(e) => setField("namaPT", e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <Label className="text-sm font-medium">
            Nama Perusahaan{" "}
            {form.clientType.toLowerCase().includes("perusahaan") && (
              <span className="text-red-500">*</span>
            )}
          </Label>
          <Input
            placeholder="Wajib untuk Perusahaan"
            value={form.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
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
            onChange={(e) => setField("email", e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">No. Telepon</Label>
          <Input
            placeholder="08xxxxxxxxxx"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Alamat</Label>
        <Input
          placeholder="Alamat lengkap"
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
        {/* Tombol batal ditangani oleh tombol close di header dialog parent */}
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}

export default NotaryDetailView;
