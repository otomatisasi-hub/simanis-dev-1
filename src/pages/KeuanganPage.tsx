// src/pages/KeuanganPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

type FinanceRow = {
  id: string;
  service_id: string;
  client_name: string | null;
  service_title: string | null;
  menu_layanan: string | null;
  follow_up_type: string;
  nominal: number | null;
  total_bayar: number | null;
  sisa_bayar: number | null;
  status_pembayaran: string | null;
  status_keuangan: string | null;
  due_date: string | null;
  deadline: string | null;
  invoice_number: string | null;
  modul: string | null;
  label: string | null;
  created_at: string | null;
};

type FeePayment = {
  id: string;
  service_finance_id: string;
  service_id: string;
  payment_type: string;
  amount: number | null;
  paid_at: string | null;
  confirmation_status: string;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
};

export function KeuanganPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<FinanceRow[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedRow, setSelectedRow] = useState<FinanceRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Review pembayaran Biaya Layanan
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [amountInput, setAmountInput] = useState<string>("");
  const [statusInput, setStatusInput] = useState<"pending" | "confirmed" | "rejected">("pending");
  const [paidAtInput, setPaidAtInput] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);

  const formatRupiahInput = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return Number(numeric).toLocaleString("id-ID");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="secondary">Unknown</Badge>;
    }

    const key = status.toLowerCase();
    const variants: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
      pending: "secondary",
      in_progress: "default",
      inprogress: "default",
      completed: "outline",
      overdue: "destructive",
      unpaid: "destructive",
      partial: "secondary",
      paid: "outline",
    };
    const labels: Record<string, string> = {
      pending: "Pending",
      in_progress: "In Progress",
      inprogress: "In Progress",
      completed: "Completed",
      overdue: "Overdue",
      unpaid: "Unpaid",
      partial: "Partial",
      paid: "Paid",
    };
    return (
      <Badge variant={variants[key] || "secondary"}>
        {labels[key] || status}
      </Badge>
    );
  };

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      setCheckingAccess(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user?.id) {
        throw new Error("User tidak terautentikasi");
      }
      const userId = userRes.user.id;

      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (roleErr) throw roleErr;

      const roles = (roleRows ?? []).map((r) => String(r.role));
      const isFinance =
        roles.includes("keuangan") ||
        roles.includes("admin") ||
        roles.includes("super_admin");

      setHasAccess(isFinance);

      if (!isFinance) {
        toast({
          title: "Akses ditolak",
          description: "Halaman Keuangan hanya untuk user keuangan atau admin.",
          variant: "destructive",
        });
        return;
      }

      await loadData();
    } catch (err: any) {
      console.error("Access/Load error:", err);
      toast({
        title: "Gagal memuat halaman keuangan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCheckingAccess(false);
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("v_finance_dashboard")
        .select(`
          id,
          service_id,
          client_name,
          service_title,
          menu_layanan,
          follow_up_type,
          nominal,
          total_bayar,
          sisa_bayar,
          status_pembayaran,
          status_keuangan,
          due_date,
          deadline,
          invoice_number,
          modul,
          label,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data ?? []) as FinanceRow[];
      setRows(list);
      setFilteredRows(list);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Load data error:", err);
      toast({
        title: "Gagal memuat data keuangan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!search) {
      setFilteredRows(rows);
      setCurrentPage(1);
      return;
    }
    const s = search.toLowerCase();
    const filtered = rows.filter((r) => {
      const client = r.client_name ?? "";
      const title = r.service_title ?? "";
      const invoice = r.invoice_number ?? "";
      const jenis = r.follow_up_type ?? "";
      const modul = r.menu_layanan ?? "";
      return (
        client.toLowerCase().includes(s) ||
        title.toLowerCase().includes(s) ||
        invoice.toLowerCase().includes(s) ||
        jenis.toLowerCase().includes(s) ||
        modul.toLowerCase().includes(s)
      );
    });
    setFilteredRows(filtered);
    setCurrentPage(1);
  }, [search, rows]);

  const getPaginatedData = (data: FinanceRow[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE) || 1;

  // === Review pembayaran Biaya Layanan ===

  const loadPaymentsForService = async (row: FinanceRow) => {
    try {
      if (!row.service_id) {
        throw new Error("Service ID tidak ditemukan.");
      }
      setReviewLoading(true);

      const { data, error } = await supabase
        .from("service_fee_payments")
        .select(`
          id,
          service_finance_id,
          service_id,
          payment_type,
          amount,
          paid_at,
          confirmation_status,
          file_url,
          file_name,
          notes
        `)
        .eq("service_id", row.service_id)
        .eq("payment_type", "fee_payment")
        .order("paid_at", { ascending: true });

      if (error) throw error;

      const list = (data ?? []) as FeePayment[];
      setPayments(list);

      setSelectedPayment(null);
      setAmountInput("");
      setStatusInput("pending");
      setPaidAtInput("");

      setReviewOpen(true);
    } catch (err: any) {
      console.error("Load payments error:", err);
      toast({
        title: "Gagal memuat pembayaran",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSelectPayment = (p: FeePayment) => {
    setSelectedPayment(p);
    setAmountInput(
      p.amount != null ? Number(p.amount).toLocaleString("id-ID") : ""
    );
    setStatusInput(
      (p.confirmation_status as "pending" | "confirmed" | "rejected") || "pending"
    );
    setPaidAtInput(p.paid_at ? p.paid_at.slice(0, 10) : "");
  };

  const handleSavePayment = async () => {
    if (!selectedPayment) return;

    const rawAmount = amountInput.replace(/\D/g, "");
    const amountNumber = rawAmount ? Number(rawAmount) : 0;

    if (!amountNumber || amountNumber <= 0) {
      toast({
        title: "Nominal tidak valid",
        description: "Masukkan nominal pembayaran lebih dari 0.",
        variant: "destructive",
      });
      return;
    }

    if (!paidAtInput) {
      toast({
        title: "Tanggal wajib diisi",
        description: "Pilih tanggal pembayaran.",
        variant: "destructive",
      });
      return;
    }

    try {
      setReviewLoading(true);

      const { error } = await supabase
        .from("service_fee_payments")
        .update({
          amount: amountNumber,
          paid_at: paidAtInput,
          confirmation_status: statusInput,
        })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      toast({
        title: "Pembayaran diperbarui",
        description: "Nominal dan status pembayaran berhasil disimpan.",
      });

      if (selectedRow?.service_id) {
        await loadPaymentsForService(selectedRow);
        await loadData(); // refresh ringkasan global (total_bayar & sisa_bayar)
      }
    } catch (err: any) {
      console.error("Update payment error:", err);
      toast({
        title: "Gagal menyimpan pembayaran",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setReviewLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">
              Anda tidak memiliki akses ke halaman keuangan global.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Kembali
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-1">
              Keuangan Global
            </h2>
            <p className="text-muted-foreground">
              Ringkasan Biaya Layanan, Invoice, dan transaksi lain lintas modul.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Daftar Transaksi Keuangan</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari klien, layanan, invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Belum ada data keuangan yang tersedia.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Modul</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Klien</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Masuk</TableHead>
                      <TableHead>Sisa</TableHead>
                      <TableHead>Status Bayar</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedData(filteredRows, currentPage).map(
                      (row, index) => {
                        const globalIndex =
                          (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                        const due =
                          row.due_date || row.deadline || row.created_at;

                        return (
                          <TableRow key={row.id}>
                            <TableCell>{globalIndex}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {row.menu_layanan || row.modul || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {row.follow_up_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.client_name || "-"}</TableCell>
                            <TableCell>{row.service_title || "-"}</TableCell>
                            <TableCell>
                              {row.nominal != null
                                ? formatCurrency(Number(row.nominal))
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {row.total_bayar != null
                                ? formatCurrency(Number(row.total_bayar))
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {row.sisa_bayar != null
                                ? formatCurrency(
                                    Number(row.sisa_bayar) > 0
                                      ? Number(row.sisa_bayar)
                                      : 0
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(row.status_pembayaran || "unpaid")}
                            </TableCell>
                            <TableCell>
                              {due
                                ? new Date(due).toLocaleDateString("id-ID")
                                : "-"}
                            </TableCell>
                            <TableCell className="space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRow(row);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {row.follow_up_type === "biaya_layanan" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRow(row);
                                    void loadPaymentsForService(row);
                                  }}
                                >
                                  Review
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-muted-foreground">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog Detail Transaksi */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedRow(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Keuangan</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Jenis Transaksi</p>
                <p className="font-semibold">
                  {selectedRow.label || selectedRow.follow_up_type}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Modul</p>
                  <p>{selectedRow.menu_layanan || selectedRow.modul || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <p>{selectedRow.invoice_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Klien</p>
                  <p>{selectedRow.client_name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Layanan</p>
                  <p>{selectedRow.service_title || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded-md bg-muted/40">
                  <p className="text-xs text-muted-foreground">Nominal</p>
                  <p className="font-semibold">
                    {selectedRow.nominal != null
                      ? formatCurrency(Number(selectedRow.nominal))
                      : "-"}
                  </p>
                </div>
                <div className="p-3 border rounded-md bg-muted/40">
                  <p className="text-xs text-muted-foreground">Total Masuk</p>
                  <p className="font-semibold">
                    {selectedRow.total_bayar != null
                      ? formatCurrency(Number(selectedRow.total_bayar))
                      : "-"}
                  </p>
                </div>
                <div className="p-3 border rounded-md bg-muted/40">
                  <p className="text-xs text-muted-foreground">Sisa Bayar</p>
                  <p className="font-semibold">
                    {selectedRow.sisa_bayar != null
                      ? formatCurrency(
                          Number(selectedRow.sisa_bayar) > 0
                            ? Number(selectedRow.sisa_bayar)
                            : 0
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Status Pembayaran
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(
                      selectedRow.status_pembayaran || "unpaid"
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Status Keuangan
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedRow.status_keuangan || "pending")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
                  <p>
                    {selectedRow.due_date
                      ? new Date(selectedRow.due_date).toLocaleDateString(
                          "id-ID"
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dibuat</p>
                  <p>
                    {selectedRow.created_at
                      ? new Date(selectedRow.created_at).toLocaleString(
                          "id-ID"
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Review Pembayaran Biaya Layanan */}
      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) {
            setSelectedPayment(null);
            setPayments([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Pembayaran Biaya Layanan</DialogTitle>
          </DialogHeader>
          {selectedRow ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">{selectedRow.service_title}</p>
                <p className="text-muted-foreground">
                  Klien: {selectedRow.client_name || "-"}
                </p>
                <p className="text-muted-foreground">
                  Biaya Layanan:{" "}
                  {selectedRow.nominal != null
                    ? formatCurrency(Number(selectedRow.nominal))
                    : "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded-md bg-muted/40">
                  <p className="text-xs text-muted-foreground">Total Masuk</p>
                  <p className="font-semibold">
                    {selectedRow.total_bayar != null
                      ? formatCurrency(Number(selectedRow.total_bayar))
                      : "-"}
                  </p>
                </div>
                <div className="p-3 border rounded-md bg-muted/40">
                  <p className="text-xs text-muted-foreground">Sisa Bayar</p>
                  <p className="font-semibold">
                    {selectedRow.sisa_bayar != null
                      ? formatCurrency(
                          Number(selectedRow.sisa_bayar) > 0
                            ? Number(selectedRow.sisa_bayar)
                            : 0
                        )
                      : "-"}
                  </p>
                </div>
                <div className="p-3 border rounded-md bg-muted/40">
                  <p className="text-xs text-muted-foreground">
                    Status Pembayaran
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedRow.status_pembayaran || "unpaid")}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm">Daftar Pembayaran</h3>
                {reviewLoading && payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Memuat data...</p>
                ) : payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada pembayaran (bukti) untuk layanan ini.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            {p.paid_at
                              ? new Date(p.paid_at).toLocaleDateString("id-ID")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {p.amount != null
                              ? formatCurrency(Number(p.amount))
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
                          <TableCell>
                            <Button
                              variant={
                                selectedPayment?.id === p.id ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handleSelectPayment(p)}
                            >
                              Pilih
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="mt-4 border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm">
                  Isi Nominal & Konfirmasi
                </h3>
                {!selectedPayment ? (
                  <p className="text-sm text-muted-foreground">
                    Pilih salah satu baris pembayaran di atas untuk diisi nominalnya.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Nominal (Rp)
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={amountInput}
                          onChange={(e) =>
                            setAmountInput(formatRupiahInput(e.target.value))
                          }
                          disabled={reviewLoading}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Tanggal Bayar
                        </p>
                        <Input
                          type="date"
                          value={paidAtInput}
                          onChange={(e) => setPaidAtInput(e.target.value)}
                          disabled={reviewLoading}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Status Konfirmasi
                        </p>
                        <select
                          className="w-full border rounded-md px-2 py-1 text-sm bg-background"
                          value={statusInput}
                          onChange={(e) =>
                            setStatusInput(
                              e.target.value as "pending" | "confirmed" | "rejected"
                            )
                          }
                          disabled={reviewLoading}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleSavePayment}
                        disabled={reviewLoading}
                      >
                        {reviewLoading ? "Menyimpan..." : "Simpan Pembayaran"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Data transaksi tidak tersedia.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KeuanganPage;
