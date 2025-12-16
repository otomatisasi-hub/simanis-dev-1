"use client";

import { useState } from "react";
import { Button } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type PaymentType = "fee_payment" | "invoice" | "pnbp";

interface ServicePaymentUploadProps {
  serviceId: string;
  serviceFinanceId?: string;
  paymentType: PaymentType;
  onSuccess?: () => void;
}

export function ServicePaymentUpload({
  serviceId,
  serviceFinanceId,
  paymentType,
  onSuccess,
}: ServicePaymentUploadProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "File belum dipilih",
        description: "Silakan pilih file bukti terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (!paidAt) {
      toast({
        title: "Tanggal bayar kosong",
        description: "Silakan isi tanggal pembayaran.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // 1. upload file ke /api/upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "service-fee-payments");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal upload file");
      }

      const fileUrl: string = json.url;
      const fileMime: string = file.type;
      const fileName: string = file.name;

      // 2. insert ke service_fee_payments
      const { error } = await supabase.from("service_fee_payments").insert({
        service_id: serviceId,
        service_finance_id: serviceFinanceId ?? null,
        payment_type: paymentType,
        amount: amount ? Number(amount) : null,
        paid_at: paidAt,
        file_url: fileUrl,
        file_name: fileName,
        file_mime_type: fileMime,
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pembayaran berhasil dicatat.",
      });

      setAmount("");
      setPaidAt("");
      setFile(null);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Gagal menyimpan pembayaran",
        description: err.message ?? "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-muted/40">
      <div className="text-sm font-semibold">
        Upload {paymentType === "invoice"
          ? "Invoice"
          : paymentType === "pnbp"
          ? "Bukti PNBP"
          : "Bukti Pembayaran"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Jumlah (opsional)</label>
          <Input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Masukkan nominal"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tanggal Bayar</label>
          <Input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">File Bukti</label>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
