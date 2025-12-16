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
  amount: number;
  paid_at: string;
  confirmation_status: string;
  file_url?: string | null;
  file_name?: string | null;
}

export function FinanceDetailDialog({
  open,
  onOpenChange,
  finance,
}: FinanceDetailDialogProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(false);

  // state form pembayaran
  const [amountInput, setAmountInput] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const formatRupiah = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return Number(numeric).toLocaleString("id-ID");
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatRupiah(value);
    setAmountInput(formatted);
  };

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
          .eq("service_finance_id", finance.id) // relasi ke service_finances.id
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

  const handleAddPayment = async () => {
    if (!finance?.id || !finance?.service_id) {
      toast({
        title: "Data tidak lengkap",
        description: "ID keuangan atau layanan tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    const rawAmount = amountInput.replace(/\D/g, "");
    const amountNumber = rawAmount ? Number(rawAmount) : 0;

    if (!amountNumber || amountNumber <= 0) {
      toast({
        title: "Nominal tidak valid",
        description: "Masukkan nominal pembayaran yang lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    if (!dateInput) {
      toast({
        title: "Tanggal wajib diisi",
        description: "Isikan tanggal pembayaran",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Ambil user untuk created_by
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
          amount: amountNumber,
          paid_at: dateInput,
          confirmation_status: "pending",
          notes: notesInput || null,
          created_by: currentUserId,
        });

      if (insertErr) throw insertErr;

      toast({
        title: "Pembayaran ditambahkan",
        description: "Pembayaran cicilan berhasil direkam",
      });

      // Refresh list payments
      const { data, error } = await supabase
        .from("service_fee_payments")
        .select("*")
        .eq("service_finance_id", finance.id)
        .order("paid_at", { ascending: true });

      if (error) throw error;
      setPayments((data || []) as FeePayment[]);

      // Reset form
      setAmountInput("");
      setDateInput("");
      setNotesInput("");
    } catch (err: any) {
      console.error("Error adding payment", err);
      toast({
        title: "Gagal menambah pembayaran",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

            {/* Daftar pembayaran */}
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
                          {formatCurrency(Number(p.amount || 0))}
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

            {/* Form tambah pembayaran */}
            <div className="mt-4 border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Tambah Pembayaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Nominal (Rp)
                  </p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Contoh: 2.500.000"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Tanggal Bayar
                  </p>
                  <Input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    disabled={submitting}
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
                    placeholder="Opsional"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={submitting}
                >
                  {submitting ? "Menyimpan..." : "Tambah Pembayaran"}
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
