"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Upload,
  X,
  FileIcon,
  Loader2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { WorkflowStep } from "@/hooks/useWorkflowData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type StepKind = "normal" | "pnbp" | "invoice";

interface WorkflowTimelineStep extends WorkflowStep {
  kind?: StepKind;
}

interface WorkflowTimelineProps {
  steps: WorkflowTimelineStep[];
  currentStepOrder?: number;
  onStepUpdate: (
    stepId: string,
    status: "pending" | "in-progress" | "completed"
  ) => Promise<any>;
  onDocumentUpload: (stepId: string, docId: string, file: File) => Promise<any>;
  onDocumentDelete: (stepId: string, docId: string) => Promise<any>;
  serviceId: string;
  apiBaseUrl?: string; // default ke http://localhost:3001
}

export function WorkflowTimeline({
  steps,
  currentStepOrder = 1,
  onStepUpdate,
  onDocumentUpload,
  onDocumentDelete,
  serviceId,
  apiBaseUrl = "http://localhost:3001",
}: WorkflowTimelineProps) {
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [pnbpStatus, setPnbpStatus] = useState<Record<string, string>>({});
  const [pnbpLoading, setPnbpLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const timelineRef = useRef<HTMLDivElement>(null);

  // DEBUG
  useEffect(() => {
    console.log("📊 WorkflowTimeline received steps:", steps.length);
    steps.forEach((step, idx) => {
      console.log(
        `   Step ${idx + 1}: ${step.step_name} - Status: ${step.status} - Kind: ${
          step.kind || "normal"
        }`
      );
    });
  }, [steps]);

  // Auto-scroll ke current step saat dialog dibuka
  useEffect(() => {
    if (currentStepOrder && stepRefs.current[currentStepOrder]) {
      setTimeout(() => {
        stepRefs.current[currentStepOrder]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 300);
    }
  }, [currentStepOrder]);

  // Ambil status PNBP awal untuk semua step.kind === "pnbp"
  useEffect(() => {
    const fetchStatuses = async () => {
      const pnbpSteps = steps.filter((s) => s.kind === "pnbp");
      if (pnbpSteps.length === 0) return;

      try {
        const entries: Record<string, string> = {};
        for (const step of pnbpSteps) {
          if (!step.id) continue;
          const res = await fetch(
            `${apiBaseUrl}/api/pnbp/status/${step.id}`
          );
          const json = await res.json();
          if (json.success && json.data) {
            entries[step.id] = json.data.status || "pending";
          }
        }
        setPnbpStatus(entries);
      } catch (error) {
        console.error("Failed to fetch PNBP statuses", error);
      }
    };

    fetchStatuses();
  }, [steps, apiBaseUrl]);

  // Check if all required documents uploaded
  const isAllRequiredDocsUploaded = (documents: any[]) => {
    const requiredDocs = documents.filter((doc) => doc.is_required);
    if (requiredDocs.length === 0) return false;
    return requiredDocs.every((doc) => doc.is_uploaded);
  };

  // Auto-complete step if all required docs uploaded
  const handleDocumentUploadComplete = async (
    stepId: string,
    documents: any[]
  ) => {
    console.log("🔍 Checking auto-complete for step:", stepId);
    console.log("   Documents:", documents);

    if (isAllRequiredDocsUploaded(documents)) {
      const step = steps.find((s) => s.id === stepId);
      console.log("   Found step:", step?.step_name, "Current status:", step?.status);

      if (step && step.status !== "completed") {
        console.log("✅ Auto-completing step:", step.step_name);

        await onStepUpdate(stepId, "completed");

        toast({
          title: "Step Selesai! 🎉",
          description: `${step.step_name} telah diselesaikan otomatis`,
        });
      } else {
        console.log("⏭️ Step already completed or not found");
      }
    } else {
      console.log("⚠️ Not all required docs uploaded yet");
    }
  };

  const handleCheckboxChange = async (
    stepId: string,
    currentStatus: string
  ) => {
    const newStatus =
      currentStatus === "completed" ? "pending" : "completed";

    console.log(`🔄 Manual status change: ${currentStatus} → ${newStatus}`);

    const result = await onStepUpdate(
      stepId,
      newStatus as "pending" | "in-progress" | "completed"
    );

    if (result.success) {
      toast({
        title: "Status diperbarui",
        description: `Step berhasil diubah ke ${newStatus}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Gagal memperbarui status",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    stepId: string,
    docId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran file maksimal 10MB",
        variant: "destructive",
      });
      return;
    }

    console.log(`📤 Uploading file: ${file.name} for step: ${stepId}`);
    setUploadingDocs((prev) => ({ ...prev, [docId]: true }));

    try {
      const result = await onDocumentUpload(stepId, docId, file);
      console.log("📤 Upload result:", result);

      if (result.success) {
        toast({
          title: "Upload berhasil",
          description: `${file.name} telah diupload`,
        });

        const step = steps.find((s) => s.id === stepId);
        if (step) {
          const updatedDocs = step.documents.map((doc) =>
            doc.id === docId ? { ...doc, is_uploaded: true } : doc
          );

          console.log("📋 Updated documents:", updatedDocs);
          await handleDocumentUploadComplete(stepId, updatedDocs);
        }
      } else {
        toast({
          title: "Upload gagal",
          description: result.error || "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast({
        title: "Upload error",
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploadingDocs((prev) => ({ ...prev, [docId]: false }));
      event.target.value = "";
    }
  };

  const handleFileRemove = async (
    stepId: string,
    docId: string,
    fileName?: string
  ) => {
    if (!confirm(`Hapus dokumen ${fileName || "ini"}?`)) return;

    console.log(`🗑️ Removing document: ${fileName}`);

    try {
      const result = await onDocumentDelete(stepId, docId);

      if (result.success) {
        toast({
          title: "Dokumen dihapus",
          description: "Dokumen berhasil dihapus",
        });
      } else {
        toast({
          title: "Gagal menghapus",
          description: "Terjadi kesalahan saat menghapus dokumen",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus dokumen",
        variant: "destructive",
      });
    }
  };

  const handlePnbpRequest = async (step: WorkflowTimelineStep) => {
    if (!step.id) {
      toast({
        title: "Step belum siap",
        description: "ID step workflow tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    try {
      setPnbpLoading((prev) => ({ ...prev, [step.id]: true }));

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user?.id) {
        throw new Error("User tidak terdeteksi, silakan login ulang");
      }

      const requestedBy = userRes.user.id;

      const res = await fetch(`${apiBaseUrl}/api/pnbp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          workflow_step_instance_id: step.id,
          requested_by: requestedBy,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal membuat request PNBP");
      }

      const status = json.data?.status || "pending";
      setPnbpStatus((prev) => ({ ...prev, [step.id]: status }));

      toast({
        title: "Request PNBP dikirim",
        description: "Permintaan telah dikirim ke bagian keuangan",
      });
    } catch (error: any) {
      console.error("PNBP request failed:", error);
      toast({
        title: "Gagal kirim request",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setPnbpLoading((prev) => ({ ...prev, [step.id!]: false }));
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4" ref={timelineRef}>
      <div className="flex items-start gap-0 min-w-max">
        {steps.map((step, index) => {
          const kind: StepKind = step.kind || "normal";
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in-progress";
          const isCurrent = step.step_order === currentStepOrder;
          const isLast = index === steps.length - 1;
          const allRequiredUploaded =
            step.documents && step.documents.length > 0
              ? isAllRequiredDocsUploaded(step.documents)
              : false;

          return (
            <div key={step.id} className="flex items-start">
              {/* Step Card */}
              <div
                ref={(el) => (stepRefs.current[step.step_order] = el)}
                className="flex flex-col items-center min-w-[320px] max-w-[320px]"
              >
                {/* Dot/Circle */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center
                    w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-green-500 border-green-500"
                        : isInProgress || isCurrent
                        ? "bg-blue-500 border-blue-500 ring-4 ring-blue-200 animate-pulse"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : isInProgress || isCurrent ? (
                    <Clock className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">
                      {step.step_order}
                    </span>
                  )}
                </div>

                {/* Current Step Indicator */}
                {isCurrent && !isCompleted && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-blue-600 font-semibold">
                    <ArrowRight className="h-3 w-3" />
                    <span>Step Aktif</span>
                  </div>
                )}

                {/* Content Card */}
                <div className="mt-4 w-full">
                  <div
                    className={`
                      p-4 rounded-lg border transition-all duration-300 h-full
                      ${
                        isCompleted
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                          : isInProgress || isCurrent
                          ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 shadow-lg"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }
                    `}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() =>
                          handleCheckboxChange(step.id, step.status)
                        }
                        className="mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`
                            font-semibold text-sm transition-all
                            ${
                              isCompleted
                                ? "text-green-700 dark:text-green-400"
                                : ""
                            }
                          `}
                        >
                          {step.step_name}
                        </h4>
                        <Badge
                          variant={
                            isCompleted
                              ? "default"
                              : isInProgress || isCurrent
                              ? "secondary"
                              : "outline"
                          }
                          className={`
                            mt-1 text-xs
                            ${isCompleted ? "bg-green-500" : ""}
                            ${isInProgress || isCurrent ? "bg-blue-500" : ""}
                          `}
                        >
                          {step.status === "completed"
                            ? "Selesai"
                            : step.status === "in-progress" || isCurrent
                            ? "Dikerjakan"
                            : "Menunggu"}
                        </Badge>
                      </div>
                    </div>

                    {step.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {step.description}
                      </p>
                    )}

                    {/* Completed Info */}
                    {isCompleted && step.completed_at && (
                      <p className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {new Date(step.completed_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                      </p>
                    )}

                    {/* Progress indicator untuk dokumen (hanya untuk kind normal) */}
                    {kind === "normal" &&
                      step.documents &&
                      step.documents.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {
                                step.documents.filter(
                                  (d) => d.is_uploaded
                                ).length
                              }{" "}
                              / {step.documents.length} dokumen
                            </span>
                            {allRequiredUploaded && !isCompleted && (
                              <span className="text-green-600 font-semibold">
                                ✓ Lengkap
                              </span>
                            )}
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  (step.documents.filter(
                                    (d) => d.is_uploaded
                                  ).length /
                                    step.documents.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                    {/* Section khusus PNBP */}
                    {kind === "pnbp" && (
                      <div className="mt-2 p-3 bg-muted/50 rounded border space-y-2">
                        <p className="text-xs font-semibold">
                          PNBP akan diproses oleh bagian Keuangan.
                        </p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Status PNBP:{" "}
                            <span className="font-semibold">
                              {pnbpStatus[step.id] || "Belum ada request"}
                            </span>
                          </span>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => handlePnbpRequest(step)}
                            disabled={pnbpLoading[step.id]}
                          >
                            {pnbpLoading[step.id] ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Mengirim...
                              </>
                            ) : (
                              <>Request ke Keuangan</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Section khusus Invoice */}
                    {kind === "invoice" && (
                      <div className="mt-2 p-3 bg-muted/50 rounded border space-y-2">
                        <p className="text-xs font-semibold">
                          Invoice akan dibuat oleh bagian Keuangan.
                        </p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Gunakan tab Keuangan untuk membuat dan mengelola
                            invoice.
                          </span>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              window.open(
                                `/keuangan/notaris?serviceId=${serviceId}`,
                                "_blank"
                              );
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Buka Keuangan
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Documents Upload Section (hanya untuk kind normal) */}
                    {kind === "normal" &&
                      step.documents &&
                      step.documents.length > 0 && (
                        <div className="mt-2 p-3 bg-muted/50 rounded border space-y-2">
                          <p className="text-xs font-semibold mb-2">
                            📄 Dokumen:
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {step.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center gap-2 p-2 bg-background rounded border"
                              >
                                <Checkbox
                                  checked={doc.is_uploaded}
                                  disabled
                                  className="h-3 w-3 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-xs truncate ${
                                      doc.is_uploaded
                                        ? "line-through text-muted-foreground"
                                        : ""
                                    }`}
                                  >
                                    {doc.document_name}
                                    {doc.is_required && (
                                      <span className="text-red-500 ml-1">
                                        *
                                      </span>
                                    )}
                                  </p>
                                  {doc.is_uploaded && doc.uploaded_at && (
                                    <p className="text-xs text-green-600 mt-0.5">
                                      ✓{" "}
                                      {new Date(
                                        doc.uploaded_at
                                      ).toLocaleDateString("id-ID")}
                                    </p>
                                  )}
                                </div>

                                {!doc.is_uploaded ? (
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                      onChange={(e) =>
                                        handleFileUpload(e, step.id, doc.id)
                                      }
                                      disabled={uploadingDocs[doc.id]}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      disabled={uploadingDocs[doc.id]}
                                      asChild
                                    >
                                      <span>
                                        {uploadingDocs[doc.id] ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Upload...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="h-3 w-3 mr-1" />
                                            Upload
                                          </>
                                        )}
                                      </span>
                                    </Button>
                                  </label>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {doc.file_url && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          window.open(doc.file_url, "_blank")
                                        }
                                      >
                                        <FileIcon className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                      onClick={() =>
                                        handleFileRemove(
                                          step.id,
                                          doc.id,
                                          doc.document_name
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div
                  className="flex items-center"
                  style={{ marginTop: "20px" }}
                >
                  <div
                    className={`
                      h-0.5 w-8 transition-all duration-500
                      ${
                        isCompleted
                          ? "bg-green-500"
                          : isInProgress || isCurrent
                          ? "bg-blue-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}