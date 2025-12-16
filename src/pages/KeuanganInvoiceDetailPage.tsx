"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Download,
  AlertCircle,
  Send,
  DollarSign,
  Calendar,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/integrations/supabase/client";

const API_URL =
  typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_API_URL
    ? (process as any).env.NEXT_PUBLIC_API_URL
    : "http://localhost:3001";

interface Client {
  id: string;
  fullname: string;
  phone?: string;
  email?: string;
}

interface Service {
  id: string;
  title: string;
  deadline?: string | null;
  clients?: Client;
}

type InvoicePayerType = "klien" | "kantornotaris";

interface InvoiceRequestDetail {
  id: string;
  serviceid: string;
  paymenttype: "pnbp" | "invoice" | "pelunasan" | "dp" | "lainnya";
  status: "pending" | "sent" | "awaitingpayment" | "completed" | "hold";
  requestedat: string;
  notes?: string | null;
  amount?: number;
  duedate?: string | null;
  invoicenumber?: string | null;
  sentat?: string | null;
  financefileurl?: string | null;
  financefilename?: string | null;
  paidat?: string | null;
  paymentproofurl?: string | null;
  paymentproofname?: string | null;
  completedat?: string | null;
  validatedby?: string | null;
  holdreason?: string | null;
  invoicepayertype?: InvoicePayerType | null;
  services?: Service;
}

export function KeuanganInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = id ?? "";

  const navigate = useNavigate();
  const { toast } = useToast();

  const [detail, setDetail] = useState<InvoiceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [validateAction, setValidateAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [validateNotes, setValidateNotes] = useState("");
  const [validateLoading, setValidateLoading] = useState(false);

  const [payerType, setPayerType] = useState<InvoicePayerType>("klien");

  const isPending = detail?.status === "pending";
  const isSent = detail?.status === "sent";
  const isAwaitingPayment = detail?.status === "awaitingpayment";
  const isCompleted = detail?.status === "completed";
  const isHold = detail?.status === "hold";
  const isPNBP = detail?.paymenttype === "pnbp";

  const serviceTitle = detail?.services?.title ?? "";
  const clientName =
  detail?.services?.clients?.fullname ||
  detail?.clients?.fullname ||
  "-";

  const isClientAlreadyPaid =
    detail?.paymenttype === "pnbp" || detail?.paymenttype === "pelunasan";

  const isClientOwes =
    detail?.paymenttype === "invoice" ||
    detail?.paymenttype === "dp" ||
    detail?.paymenttype === "lainnya";

  useEffect(() => {
    if (!requestId) {
      console.warn("KeuanganInvoiceDetailPage: requestId kosong dari params");
      return;
    }
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      console.log("Fetching detail for requestId", requestId);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error("User tidak terautentikasi");
      }

      const response = await fetch(
        `${API_URL}/api/finance/detail/${requestId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();
      console.log("Detail JSON result", result);

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const data: InvoiceRequestDetail = result.data;
      setDetail(data);

      // Prefill form
      setInvoiceNumber(data.invoicenumber ?? "");
      setUploadNotes("");
      setPayerType(
        data.invoicepayertype === "kantornotaris" ? "kantornotaris" : "klien",
      );

      console.log("Detail in state AFTER setDetail", data);
    } catch (error: any) {
      console.error("Fetch detail error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(
      4,
      "0",
    );
    const generated = `INV/${year}${month}${day}/${sequence}`;
    setInvoiceNumber(generated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Ukuran file maksimal 10MB",
          variant: "destructive",
        });
        return;
      }
      setUploadFile(file);
    }
  };

  // Kirim dokumen keuangan (invoice / PNBP) ke notaris
  const handleSendDocument = async () => {
    if (!uploadFile || !detail) return;

    const requiresInvoiceNumber = !isPNBP;
    if (requiresInvoiceNumber && !invoiceNumber.trim()) {
      toast({
        title: "Error",
        description: "Nomor invoice harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error("User tidak terautentikasi");
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("requestId", detail.id);
      formData.append("notes", uploadNotes);

      if (requiresInvoiceNumber) {
        formData.append("invoiceNumber", invoiceNumber);
        formData.append("invoicePayerType", payerType);
      }

      const endpoint = isPNBP
        ? "/api/pnbp/send-document"
        : "/api/invoice/send-document";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal mengirim dokumen");
      }

      toast({
        title: "Berhasil",
        description: `Dokumen ${
          isPNBP ? "PNBP" : "Invoice"
        } berhasil dikirim ke notaris`,
      });

      setSendDialogOpen(false);
      setUploadFile(null);
      setUploadNotes("");
      await fetchDetail();
    } catch (error: any) {
      console.error("Send document error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // Validasi pembayaran (approve / reject)
  const handleValidatePayment = async () => {
    if (!detail) return;

    const isApproved = validateAction === "approve";

    if (!isApproved && !validateNotes.trim()) {
      toast({
        title: "Error",
        description: "Alasan penolakan wajib diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setValidateLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error("User tidak terautentikasi");
      }

      const response = await fetch(
        `${API_URL}/api/finance/validate-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: detail.id,
            isApproved,
            notes: validateNotes || null,
          }),
        },
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal memvalidasi pembayaran");
      }

      toast({
        title: "Berhasil",
        description:
          result.message ||
          (isApproved
            ? "Pembayaran berhasil divalidasi"
            : "Pembayaran ditahan"),
      });

      setValidateDialogOpen(false);
      setValidateNotes("");
      await fetchDetail();
    } catch (error: any) {
      console.error("Validate payment error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setValidateLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = () => {
    if (!detail) return null;

    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Menunggu" },
      sent: { color: "bg-blue-100 text-blue-800", label: "Terkirim" },
      awaitingpayment: {
        color: "bg-purple-100 text-purple-800",
        label: "Menunggu Validasi",
      },
      completed: { color: "bg-green-100 text-green-800", label: "Selesai" },
      hold: { color: "bg-orange-100 text-orange-800", label: "Ditahan" },
    };

    const config = statusConfig[detail.status] || statusConfig.pending;

    return (
      <Badge className={`${config.color} text-sm px-3 py-1`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Data tidak ditemukan</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold">
            Detail {isPNBP ? "PNBP" : "Invoice"}
          </h1>
          {isClientAlreadyPaid && (
            <p className="text-xs text-gray-500">
              Tipe: dibayar klien (notaris sudah menerima pembayaran, keuangan
              mengarsip &amp; validasi).
            </p>
          )}
          {isClientOwes && (
            <p className="text-xs text-gray-500">
              Tipe: klien masih hutang (keuangan menerbitkan dan menagih
              invoice).
            </p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Informasi {isPNBP ? "PNBP" : "Invoice"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Layanan</p>
              <p className="font-semibold">{serviceTitle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Klien</p>
              <p className="font-semibold">{clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Request Pada</p>
              <p className="font-semibold">
                {new Date(detail.requestedat).toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              {getStatusBadge()}
            </div>

            {detail.amount && (
              <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-blue-700 mb-1 font-semibold">
                  {isClientAlreadyPaid
                    ? "Nominal yang Sudah Dibayar Klien"
                    : "Nominal yang Harus Dibayar Klien"}
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {formatCurrency(detail.amount)}
                </p>
              </div>
            )}

            {detail.invoicenumber && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Nomor Invoice</p>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <p className="font-mono font-semibold text-lg">
                    {detail.invoicenumber}
                  </p>
                </div>
              </div>
            )}

            {detail.duedate && (
              <div>
                <p className="text-sm text-gray-600">Jatuh Tempo</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <p className="font-semibold">{formatDate(detail.duedate)}</p>
                </div>
              </div>
            )}

            {detail.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Catatan:</p>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded mt-1">
                  <p className="text-sm text-gray-700">{detail.notes}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Sections */}
      <Card>
        <CardContent className="p-6">
          {/* 1️⃣ PENDING */}
          {isPending && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-lg text-yellow-900">
                    Request Baru dari Notaris
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {isClientAlreadyPaid
                    ? "Klien sudah membayar ke notaris. Silakan upload dokumen dan nomor invoice sebagai arsip keuangan."
                    : "Klien belum membayar. Silakan upload invoice resmi dan nomor invoice untuk ditagihkan ke klien."}
                </p>
              </div>

              {!isPNBP && (
                <>
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Nomor Invoice <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Contoh: INV/20251202/0001"
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateInvoiceNumber}
                        className="whitespace-nowrap"
                      >
                        Generate Otomatis
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isClientAlreadyPaid
                        ? "Dipakai sebagai nomor invoice arsip setelah pembayaran diterima di notaris."
                        : "Dipakai sebagai nomor invoice resmi untuk penagihan kepada klien."}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">
                      Status Pembayaran
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant={payerType === "klien" ? "default" : "outline"}
                        className="px-4"
                        onClick={() => setPayerType("klien")}
                      >
                        Dibayarkan Klien
                      </Button>
                      <Button
                        type="button"
                        variant={
                          payerType === "kantornotaris" ? "default" : "outline"
                        }
                        className="px-4"
                        onClick={() => setPayerType("kantornotaris")}
                      >
                        Dibayarkan Kantor Notaris
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pilihan ini dipakai untuk laporan keuangan: jika
                      dibayarkan klien, masuk ke statistik pembayaran klien; jika
                      dibayarkan kantor notaris, masuk ke statistik tagihan
                      internal kantor.
                    </p>
                  </div>
                </>
              )}

              <div>
                <Label className="text-sm font-semibold">
                  Upload {isPNBP ? "Bukti PNBP" : "Invoice"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-1 border-2 border-dashed border-blue-300 rounded p-4 bg-blue-50 flex flex-col items-center cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  {uploadFile ? (
                    <>
                      <FileText className="h-8 w-8 text-blue-600 mb-1" />
                      <p className="text-sm font-medium text-blue-600">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-gray-500">Klik untuk ganti</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-blue-500 mb-1" />
                      <p className="text-sm text-gray-600">
                        Klik untuk upload
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, JPG, PNG (Max 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>

              <div>
                <Label className="text-sm font-semibold">
                  Catatan (Opsional)
                </Label>
                <Textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Tambahkan catatan untuk notaris..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={() => setSendDialogOpen(true)}
                disabled={
                  !uploadFile || uploadLoading || (!isPNBP && !invoiceNumber.trim())
                }
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim ke Notaris
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 2️⃣ SENT */}
          {isSent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg text-blue-700">
                  Menunggu Upload Bukti dari Notaris
                </h3>
              </div>

              {detail.invoicenumber && (
                <div className="bg-white border border-blue-200 p-3 rounded mb-3">
                  <p className="text-xs text-gray-600">Nomor Invoice:</p>
                  <p className="font-mono font-semibold text-blue-900">
                    {detail.invoicenumber}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-3">
                Dokumen telah dikirim pada{" "}
                <span className="font-semibold">
                  {detail.sentat
                    ? new Date(detail.sentat).toLocaleString("id-ID")
                    : "-"}
                </span>
                .
              </p>

              {detail.financefileurl && (
                <div className="bg-white border border-blue-200 p-3 rounded flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">
                      {detail.financefilename || "Dokumen"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(`${API_URL}${detail.financefileurl}`, "_blank")
                    }
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Lihat
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                💡 Notaris sedang memproses pembayaran dari klien dan akan
                mengupload bukti transfer.
              </p>
            </div>
          )}

          {/* 3️⃣ AWAITING_PAYMENT */}
          {isAwaitingPayment && (
            <div className="bg-white p-6 rounded-lg border-2 border-purple-300 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                <h3 className="font-semibold text-lg text-purple-700">
                  Menunggu Validasi Anda
                </h3>
              </div>

              {detail.invoicenumber && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded">
                  <p className="text-xs text-purple-700 mb-1">Nomor Invoice:</p>
                  <p className="font-mono font-semibold text-purple-900 text-lg">
                    {detail.invoicenumber}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                Notaris telah mengupload bukti pembayaran pada{" "}
                <span className="font-semibold">
                  {detail.paidat
                    ? new Date(detail.paidat).toLocaleString("id-ID")
                    : "-"}
                </span>
                . Pastikan nominal dan tanggal bayar sesuai dengan{" "}
                {isClientOwes
                  ? "invoice yang ditagihkan ke klien."
                  : "pembayaran yang diterima notaris."}
              </p>

              {detail.paymentproofurl && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-semibold text-purple-900">
                          Bukti Pembayaran
                        </p>
                        <p className="text-xs text-gray-600">
                          {detail.paymentproofname || "Bukti Bayar"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `${API_URL}${detail.paymentproofurl}`,
                          "_blank",
                        )
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Lihat Bukti
                    </Button>
                  </div>

                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Tanggal Bayar:</p>
                    <p className="text-sm font-semibold">
                      {formatDate(detail.paidat)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setValidateAction("approve");
                    setValidateDialogOpen(true);
                  }}
                  disabled={validateLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Validasi Pembayaran
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setValidateAction("reject");
                    setValidateDialogOpen(true);
                  }}
                  disabled={validateLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Tolak
                </Button>
              </div>
            </div>
          )}

          {/* 4️⃣ COMPLETED */}
          {isCompleted && (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-xl text-gray-900 mb-2">
                Pembayaran Tervalidasi
              </h3>

              {detail.invoicenumber && (
                <div className="bg-white border border-green-300 p-3 rounded mb-3 max-w-md mx-auto">
                  <p className="text-xs text-gray-600 mb-1">Nomor Invoice:</p>
                  <p className="font-mono font-semibold text-green-900">
                    {detail.invoicenumber}
                  </p>
                </div>
              )}

              {detail.amount && (
                <p className="text-2xl font-bold text-green-700 mb-2">
                  {formatCurrency(detail.amount)}
                </p>
              )}

              <p className="text-sm text-gray-600">
                Divalidasi pada {formatDate(detail.completedat)}.
              </p>

              {detail.paymentproofurl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    window.open(`${API_URL}${detail.paymentproofurl}`, "_blank")
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Lihat Bukti Pembayaran
                </Button>
              )}
            </div>
          )}

          {/* 5️⃣ HOLD */}
          {isHold && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-lg text-orange-700">
                  Pembayaran Ditahan
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Request ini ditahan dan dikembalikan ke notaris untuk perbaikan.
              </p>

              {detail.holdreason && (
                <div className="bg-white border border-orange-300 p-3 rounded">
                  <p className="text-xs text-gray-600 mb-1">Alasan:</p>
                  <p className="text-sm font-semibold text-orange-900">
                    {detail.holdreason}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Konfirmasi Kirim */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Send className="h-5 w-5" />
              Konfirmasi Kirim Dokumen
            </DialogTitle>
            <DialogDescription>
              Dokumen akan dikirim ke notaris dan status akan berubah menjadi
              &quot;Terkirim&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {detail.amount && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <p className="text-xs text-blue-700 mb-1">Nominal:</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(detail.amount)}
                </p>
              </div>
            )}

            {!isPNBP && invoiceNumber && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  Nomor Invoice:
                </p>
                <p className="font-mono text-sm text-gray-900">
                  {invoiceNumber}
                </p>
              </div>
            )}

            {!isPNBP && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  Status Pembayaran:
                </p>
                <p className="text-sm text-gray-800">
                  {payerType === "klien"
                    ? "Dibayarkan Klien"
                    : "Dibayarkan Kantor Notaris"}
                </p>
              </div>
            )}

            {uploadFile && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  File yang akan dikirim:
                </p>
                <p className="text-sm text-gray-600">{uploadFile.name}</p>
              </div>
            )}

            {uploadNotes && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">Catatan:</p>
                <p className="text-sm text-gray-600">{uploadNotes}</p>
              </div>
            )}

            <p className="text-sm text-gray-700">
              Setelah dikirim, notaris akan dapat melihat dan mengunduh dokumen
              ini.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendDialogOpen(false)}
              disabled={uploadLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSendDocument}
              disabled={uploadLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ya, Kirim
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Validasi */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 ${
                validateAction === "approve"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {validateAction === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Validasi Pembayaran
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  Tolak Pembayaran
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {validateAction === "approve"
                ? "Pembayaran akan divalidasi dan workflow akan dilanjutkan."
                : "Pembayaran akan ditahan. Berikan alasan penolakan:"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {detail.invoicenumber && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  Nomor Invoice:
                </p>
                <p className="font-mono text-sm text-gray-900">
                  {detail.invoicenumber}
                </p>
              </div>
            )}

            {detail.amount && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">Nominal:</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(detail.amount)}
                </p>
              </div>
            )}

            {detail.paymentproofname && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  Bukti Bayar:
                </p>
                <p className="text-sm text-gray-600">
                  {detail.paymentproofname}
                </p>
              </div>
            )}

            {detail.paidat && (
              <div className="bg-gray-50 border p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  Tanggal Bayar:
                </p>
                <p className="text-sm text-gray-600">
                  {formatDate(detail.paidat)}
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold">
                {validateAction === "approve"
                  ? "Catatan (Opsional)"
                  : "Alasan Penolakan *"}
              </Label>
              <Textarea
                value={validateNotes}
                onChange={(e) => setValidateNotes(e.target.value)}
                placeholder={
                  validateAction === "approve"
                    ? "Tambahkan catatan validasi..."
                    : "Jelaskan alasan penolakan..."
                }
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setValidateDialogOpen(false);
                setValidateNotes("");
              }}
              disabled={validateLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleValidatePayment}
              disabled={validateLoading}
              className={
                validateAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {validateLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : validateAction === "approve" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Ya, Validasi
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Ya, Tolak
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
