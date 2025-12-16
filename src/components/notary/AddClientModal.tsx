// src/components/notaris/AddClientModal.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, CheckCircle2, X, FileText, Loader2 } from "lucide-react";
import { useModule } from "@/context/ModuleContext";

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
  biayaLayanan: string;
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

const API_BASE_URL = "http://localhost:3001";

export function AddClientModal({ open, onOpenChange, onSuccess }: Props) {
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
  const [layananOptions, setLayananOptions] = useState<string[]>([]);
  const [subLayananOptions, setSubLayananOptions] = useState<string[]>([]);
  const [jenisKlienOptions, setJenisKlienOptions] = useState<string[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);

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

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Load daftar layanan berdasarkan modul (menu)
  useEffect(() => {
    if (!open) return;

    async function loadLayanan() {
      const { data, error } = await supabase
        .from("service_document_requirements")
        .select("layanan")
        .eq("menu", menuKey);

      if (error) {
        toast({
          title: "Gagal memuat layanan",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const distinct = Array.from(new Set((data || []).map((r) => r.layanan)));
      setLayananOptions(distinct);
    }

    loadLayanan();

    setForm({
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
    setSubLayananOptions([]);
    setJenisKlienOptions([]);
    setUploadedDocuments([]);
  }, [open, menuKey, toast]);

  // Load sub layanan ketika layanan berubah
  useEffect(() => {
    if (!form.layanan) {
      setSubLayananOptions([]);
      setJenisKlienOptions([]);
      setUploadedDocuments([]);
      return;
    }

    async function loadSubLayanan() {
      const { data, error } = await supabase
        .from("service_document_requirements")
        .select("sub_layanan")
        .eq("menu", menuKey)
        .eq("layanan", form.layanan);

      if (error) {
        toast({
          title: "Gagal memuat sub layanan",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const distinct = Array.from(new Set((data || []).map((r) => r.sub_layanan)));
      setSubLayananOptions(distinct);
      setField("subLayanan", "");
      setField("clientType", "");
      setJenisKlienOptions([]);
      setUploadedDocuments([]);
    }

    loadSubLayanan();
  }, [form.layanan, menuKey, toast]);

  // Load jenis klien ketika layanan + sub layanan berubah
  useEffect(() => {
    if (!form.layanan || !form.subLayanan) {
      setJenisKlienOptions([]);
      setUploadedDocuments([]);
      return;
    }

    async function loadJenisKlien() {
      const { data, error } = await supabase
        .from("service_document_requirements")
        .select("jenis_klien")
        .eq("menu", menuKey)
        .eq("layanan", form.layanan)
        .eq("sub_layanan", form.subLayanan);

      if (error) {
        console.error(error);
        return;
      }

      const distinct = Array.from(
        new Set((data || []).map((r) => r.jenis_klien.trim()))
      );
      setJenisKlienOptions(distinct);
      setField("clientType", "");
      setUploadedDocuments([]);
      if (distinct.length === 1) setField("clientType", distinct[0]);
    }

    loadJenisKlien();
  }, [form.layanan, form.subLayanan, menuKey]);

  // Load daftar dokumen wajib ketika layanan + sub layanan + jenis klien lengkap
  useEffect(() => {
    if (!form.layanan || !form.subLayanan || !form.clientType) {
      setUploadedDocuments([]);
      return;
    }

    async function loadDocuments() {
      const { data, error } = await supabase
        .from("service_document_requirements")
        .select("mandatory_documents")
        .eq("menu", menuKey)
        .eq("layanan", form.layanan)
        .eq("sub_layanan", form.subLayanan)
        .eq("jenis_klien", form.clientType)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      let docs: string[] = [];
      if (data?.mandatory_documents) {
        docs = Array.isArray(data.mandatory_documents)
          ? data.mandatory_documents
          : JSON.parse(data.mandatory_documents);
      }

      setUploadedDocuments(
        docs.map((name) => ({
          name,
          is_required: true,
          is_uploaded: false,
        }))
      );
    }

    loadDocuments();
  }, [form.layanan, form.subLayanan, form.clientType, menuKey]);

  const resetForm = () => {
    setForm({
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
    setLayananOptions([]);
    setSubLayananOptions([]);
    setJenisKlienOptions([]);
    setUploadedDocuments([]);
  };

  const handleClose = (state: boolean) => {
    onOpenChange(state);
    if (!state) resetForm();
  };

  // VALIDASI SEBELUM SUBMIT
  const validateBeforeSubmit = () => {
    if (!form.namaPT) {
      return "Nama klien wajib diisi";
    }

    if (!form.layanan) {
      return "Layanan harus dipilih";
    }

    if (!form.subLayanan) {
      return "Sub Layanan harus dipilih";
    }

    if (!form.clientType) {
      return "Jenis Klien harus dipilih";
    }

    // Biaya Layanan (wajib, > 0)
    // Di validateBeforeSubmit(), ganti bagian validasi biaya dengan:
    const rawFee = form.biayaLayanan.replace(/[^0-9]/g, "");
    const feeNumber = rawFee ? Number(rawFee) : 0;

    if (!rawFee || feeNumber <= 0) {
      return "Biaya Layanan wajib diisi dan harus lebih besar dari 0";
    }

console.log("✅ Fee validation passed:", { raw: rawFee, number: feeNumber });


    // Jika jenis klien perusahaan, wajib isi nama perusahaan
    const isCompany = ["perusahaan", "corporate", "pt"].some((str) =>
      form.clientType.toLowerCase().includes(str)
    );
    if (isCompany && !form.companyName) {
      return "Nama perusahaan wajib diisi untuk jenis klien Perusahaan";
    }

    // Dokumen wajib
    const missingDocs = uploadedDocuments.filter(
      (doc) => doc.is_required && !doc.is_uploaded
    );
    if (missingDocs.length > 0) {
      return `Masih ada ${missingDocs.length} dokumen wajib yang belum diupload`;
    }

    return null;
  };

  // ✅ PERBAIKAN UTAMA: handleFileUpload dengan field lengkap
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

      console.log("📤 Preparing upload for client document:", {
        fileName: file.name,
        documentName: uploadedDocuments[index].name,
        modul: menuKey,
        layanan: form.layanan,
        clientName: form.namaPT || "unknown",
      });

      // Get auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error("User tidak terautentikasi");
      }

      // ✅ Buat FormData dengan field lengkap
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modul", menuKey); // notaris/ppat/notaris_syariah
      formData.append("layanan", form.layanan || "general");
      formData.append("clientName", form.namaPT || "unknown");
      formData.append("category", uploadedDocuments[index].name);

      // Debug: Log FormData contents
      console.log("📋 FormData contents:");
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? value.name : value);
      }

      // ✅ Gunakan fetch langsung dengan token (jangan pakai authFetch untuk FormData)
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          // ⚠️ JANGAN tambahkan Content-Type! Browser akan set otomatis dengan boundary
        },
        body: formData,
      });

      console.log("📡 Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Upload error response:", errorText);
        throw new Error(`Upload gagal: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload gagal");
      }

      console.log("✅ Upload success:", result);

      // Update state dengan hasil upload
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
      console.error("❌ Upload error:", error);
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
        const { data: { session } } = await supabase.auth.getSession();

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

  const formatRupiah = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return Number(numeric).toLocaleString("id-ID");
  };

  const handleBiayaLayananChange = (value: string) => {
    const formatted = formatRupiah(value);
    setField("biayaLayanan", formatted);
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
      if (userErr || !userRes?.user?.id)
        throw new Error("User tidak terdeteksi");
      const currentUserId = userRes.user.id;

      // 1. INSERT CLIENT
      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
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

      // 2. LOOKUP CATEGORY
      const { data: srvReqData, error: srvReqError } = await supabase
        .from("service_document_requirements")
        .select("category_id")
        .eq("menu", menuKey)
        .eq("layanan", form.layanan)
        .eq("sub_layanan", form.subLayanan)
        .eq("jenis_klien", form.clientType)
        .limit(1)
        .single();

      if (srvReqError || !srvReqData?.category_id)
        throw new Error("Kategori layanan tidak ditemukan");
      const categoryId = srvReqData.category_id;

      // 3. PARSE BIAYA LAYANAN
      // Setelah parse biaya layanan (sekitar baris 330-337)
      const rawFeeString = form.biayaLayanan.replace(/\D/g, "");
      const feeAmountNumber = rawFeeString && !Number.isNaN(Number(rawFeeString))
        ? Number(rawFeeString)
        : null;

      console.log("💵 Fee amount parsed:", {
        input: form.biayaLayanan,
        raw: rawFeeString,
        parsed: feeAmountNumber,
        isValid: feeAmountNumber !== null && feeAmountNumber > 0,
      });

      // Tambahkan validasi extra
      if (!feeAmountNumber || feeAmountNumber <= 0) {
        throw new Error("Biaya layanan tidak valid atau 0");
      }


      // 4. INSERT SERVICE
      const { data: serviceRow, error: serviceErr } = await supabase
        .from("services")
        .insert({
          title: form.layanan,
          client_id: clientRow.id,
          layanan: form.layanan,
          sub_layanan: form.subLayanan,
          jenis_klien: form.clientType,
          status: "draft",
          created_by: currentUserId,
          assigned_to: currentUserId,
          estimated_completion_date: form.deadline || null,
          deadline: form.deadline || null,
          category_id: categoryId,
          fee_amount: feeAmountNumber,
          fee_status: feeAmountNumber ? "unpaid" : "unpaid",
          menu_layanan: menuKey,
        })
        .select()
        .single();

      if (serviceErr) throw serviceErr;


      // 6. CREATE WORKFLOW INSTANCE
      if (serviceRow) {
        try {
          const { data: existingWorkflow, error: checkErr } = await supabase
            .from("workflow_instances")
            .select("id")
            .eq("service_id", serviceRow.id)
            .maybeSingle();

          if (checkErr) {
            console.error("Error checking existing workflow:", checkErr);
          }

          if (!existingWorkflow) {
            const { data: mappingData, error: mappingErr } = await supabase
              .from("workflow_template_mappings")
              .select("workflow_template_id")
              .eq("menu", menuKey)
              .eq("layanan", form.layanan.trim())
              .eq("sub_layanan", form.subLayanan.trim())
              .eq("jenis_klien", form.clientType.trim())
              .eq("is_active", true)
              .maybeSingle();

            if (mappingErr) {
              console.error("Lookup workflow mapping error", mappingErr);
            } else if (mappingData?.workflow_template_id) {
              const {
                data: workflowInstance,
                error: workflowErr,
              } = await supabase
                .from("workflow_instances")
                .insert({
                  service_id: serviceRow.id,
                  workflow_template_id:
                    mappingData.workflow_template_id,
                  status: "not_started",
                })
                .select()
                .single();

              if (workflowErr) {
                console.error("Insert workflow_instances error", workflowErr);
              } else if (workflowInstance) {
                const { data: stepsData, error: stepsErr } = await supabase
                  .from("workflow_template_steps")
                  .select("id, step_order, step_name")
                  .eq(
                    "workflow_template_id",
                    mappingData.workflow_template_id
                  )
                  .order("step_order", { ascending: true });

                if (stepsErr) {
                  console.error("Lookup workflow steps error", stepsErr);
                } else if (stepsData && stepsData.length > 0) {
                  const stepInstances = stepsData.map((step) => ({
                    workflow_instance_id: workflowInstance.id,
                    workflow_template_step_id: step.id,
                    step_order: step.step_order,
                    status: "pending",
                  }));

                  const { error: stepInstancesErr } = await supabase
                    .from("workflow_step_instances")
                    .insert(stepInstances);

                  if (stepInstancesErr) {
                    console.error(
                      "Insert workflow_step_instances error",
                      stepInstancesErr
                    );
                  }
                }
              }
            } else {
              console.warn(
                `Workflow template mapping tidak ditemukan untuk: ${menuKey} > ${form.layanan} > ${form.subLayanan} > ${form.clientType}`
              );
            }
          } else {
            console.log(
              "Workflow instance sudah ada untuk service ini:",
              serviceRow.id
            );
          }
        } catch (workflowError) {
          console.error("Error creating workflow:", workflowError);
        }
      }

      toast({
        title: "Berhasil",
        description: `Klien berhasil dibuat dengan ${
          uploadedDocuments.filter((d) => d.is_uploaded).length
        }/${uploadedDocuments.length} dokumen terupload`,
      });

      onSuccess?.();
      handleClose(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Klien Notaris</DialogTitle>
          <DialogDescription>
            Lengkapi data klien dan upload dokumen yang diperlukan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Layanan, Sub Layanan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Layanan <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.layanan}
                onValueChange={(v) => setField("layanan", v)}
                disabled={loading}
              >
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
              <Select
                value={form.subLayanan}
                onValueChange={(v) => setField("subLayanan", v)}
                disabled={!form.layanan || loading}
              >
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

          {/* Jenis Klien, Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Jenis Klien <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.clientType}
                onValueChange={(v) => setField("clientType", v)}
                disabled={
                  !form.subLayanan || loading || jenisKlienOptions.length === 0
                }
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
                value={form.deadline || ""}
                onChange={(e) => setField("deadline", e.target.value || null)}
                disabled={loading}
              />
            </div>
          </div>

          {/* BIAYA LAYANAN */}
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
              Biaya jasa notaris yang dibebankan ke klien. Wajib diisi dan akan
              otomatis tercatat di keuangan.
            </p>
          </div>

          {/* Upload Dokumen */}
          {uploadedDocuments.length > 0 && (
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900">
                  Upload Dokumen (
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
                          <span className="text-red-500 ml-1">*</span>
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
                                document.getElementById(`file-${idx}`)?.click()
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

          {/* Nama Klien, Nama Perusahaan */}
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

          {/* Email, Telepon */}
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

          {/* Alamat */}
          <div>
            <Label className="text-sm font-medium">Alamat</Label>
            <Input
              placeholder="Alamat lengkap"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Tombol Batal & Simpan */}
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
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddClientModal;