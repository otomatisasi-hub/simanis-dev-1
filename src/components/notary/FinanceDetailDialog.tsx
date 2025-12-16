// src/components/notary/FinanceDetailDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/custom-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FinanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // row dari tabel service_finances + relasi services & clients
  finance: any | null;
}

interface FeePayment {
  id: string;
  payment_type: string;
  amount: number | null;
  paid_at: string | null;
  confirmation_status: string;
  file_url?: string | null;
  file_name?: string | null;
}

const API_BASE_URL = "http://localhost:3001";

export function FinanceDetailDialog({
  open,
  onOpenChange,
  finance,
}: FinanceDetailDialogProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(false);

  // state upload bukti (notaris)
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [paidDateInput, setPaidDateInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  useEffect(() => {
    // finance sekarang adalah row service_finances → pakai finance.id
    if (!open || !finance?.id) {
      setPayments([]);
      return;
    }

    const fetchPayments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("service_fee_payments")
          .select("*")
          .eq("service_finance_id", finance.id)
          .order("paid_at", { ascending: true });

        if (error) throw error;
        setPayments((data || []) as FeePayment[]);
      } catch (err: any) {
        console.error("Error loading payments", err);
        toast({
          title: "Gagal memuat data pembayaran",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [open, finance?.id, toast]);

  const totalPaid = payments
    .filter((p) => p.payment_type === "fee_payment")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Biaya layanan diambil dari services.fee_amount, fallback ke finance.amount
  const serviceFee = Number(
    finance?.services?.fee_amount ?? finance?.amount ?? 0
  );
  const remaining = serviceFee - totalPaid;

  const serviceTitle = finance?.services?.title || "-";
  const clientName = finance?.services?.clients?.full_name || "-";

  // Deadline bisa dari services.deadline, fallback ke due_date finance
  const deadline =
    finance?.services?.deadline || finance?.due_date || null;

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "File belum dipilih",
        description: "Pilih file bukti pembayaran terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (!finance?.id || !finance?.service_id) {
      toast({
        title: "Data tidak lengkap",
        description: "ID layanan atau keuangan tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran file maksimal 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!paidDateInput) {
      toast({
        title: "Tanggal wajib diisi",
        description: "Pilih tanggal pembayaran terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // 1) Upload file ke storage via API
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("docId", `payment-proof-${Date.now()}`);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload gagal");
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Upload gagal");
      }

      const fileUrl = `${API_BASE_URL}${result.fileUrl}`;
      const fileName = result.fileName;
      const fileMimeType = result.fileMimeType || result.mimeType || "";

      // 2) Insert row ke service_fee_payments (tanpa nominal)
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user?.id) {
        throw new Error("User tidak terdeteksi");
      }
      const currentUserId = userRes.user.id;

      const { error: insertErr } = await supabase
        .from("service_fee_payments")
        .insert({
          service_finance_id: finance.id,
          service_id: finance.service_id,
          payment_type: "fee_payment",
          amount: null, // nominal diisi nanti oleh bagian keuangan
          paid_at: paidDateInput,
          confirmation_status: "pending",
          notes: notesInput || null,
          file_url: fileUrl,
          file_name: fileName,
          file_mime_type: fileMimeType || null,
          created_by: currentUserId,
        });

      if (insertErr) throw insertErr;

      toast({
        title: "Bukti pembayaran diupload",
        description: "Bukti bayar berhasil dikirim ke bagian keuangan",
      });

      // 3) Refresh list payments
      const { data, error } = await supabase
        .from("service_fee_payments")
        .select("*")
        .eq("service_finance_id", finance.id)
        .order("paid_at", { ascending: true });

      if (error) throw error;
      setPayments((data || []) as FeePayment[]);

      // Reset form file (supaya bisa upload file berbeda)
      setFileInputKey((prev) => prev + 1);
      setSelectedFile(null);
      setNotesInput("");
      // paidDateInput dibiarkan supaya kalau user upload beberapa bukti di tanggal sama, tidak perlu isi ulang
    } catch (err: any) {
      console.error("Error upload bukti", err);
      toast({
        title: "Gagal upload bukti",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Keuangan Layanan</DialogTitle>
        </DialogHeader>

        {!finance ? (
          <div className="text-sm text-muted-foreground">
            Data keuangan tidak tersedia.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ringkasan utama */}
            <div className="space-y-1">
              <p className="font-semibold text-lg">{serviceTitle}</p>
              <p className="text-sm text-muted-foreground">
                Klien: {clientName}
              </p>
              <p className="text-sm text-muted-foreground">
                Deadline:{" "}
                {deadline
                  ? new Date(deadline).toLocaleDateString("id-ID")
                  : "-"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-md bg-muted/40">
                <p className="text-xs text-muted-foreground">
                  Biaya Layanan
                </p>
                <p className="font-semibold">
                  {formatCurrency(serviceFee)}
                </p>
              </div>
              <div className="p-3 border rounded-md bg-muted/40">
                <p className="text-xs text-muted-foreground">
                  Total Masuk
                </p>
                <p className="font-semibold">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="p-3 border rounded-md bg-muted/40">
                <p className="text-xs text-muted-foreground">
                  Sisa Bayar
                </p>
                <p className="font-semibold">
                  {formatCurrency(remaining > 0 ? remaining : 0)}
                </p>
              </div>
            </div>

            {/* Histori pembayaran */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">
                Histori Pembayaran
              </h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Memuat data...
                </p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada pembayaran yang tercatat.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.paid_at
                            ? new Date(
                                p.paid_at
                              ).toLocaleDateString("id-ID")
                            : "-"}
                        </TableCell>
                        <TableCell>{p.payment_type}</TableCell>
                        <TableCell>
                          {p.amount != null
                            ? formatCurrency(Number(p.amount || 0))
                            : "-"}
                        </TableCell>
                        <TableCell>{p.confirmation_status}</TableCell>
                        <TableCell>
                          {p.file_url ? (
                            <a
                              href={p.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              {p.file_name || "Lihat"}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Form upload bukti bayar (tanpa nominal) */}
            <div className="mt-4 border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">
                Upload Bukti Pembayaran (Notaris)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Tanggal Bayar
                  </p>
                  <Input
                    type="date"
                    value={paidDateInput}
                    onChange={(e) => setPaidDateInput(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Catatan
                  </p>
                  <Input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Opsional (mis. Bank, No. Referensi)"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    File Bukti (PDF/JPG/PNG)
                  </p>
                  <Input
                    key={fileInputKey}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Nominal pembayaran akan diinput dan dikonfirmasi oleh bagian keuangan.
                </p>
                <Button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? "Mengupload..." : "Upload Bukti"}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
