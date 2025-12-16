import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
import { useWorkflowData } from "@/hooks/useWorkflowData";
import { useWorkflowProgress } from "@/hooks/useWorkflowProgress";

interface WorkflowDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceData: {
    id: string;
    judul: string;
    klien: string;
    status: string;
    deadline?: string;
  };
}

export function WorkflowDetailDialog({
  open,
  onOpenChange,
  serviceData,
}: WorkflowDetailDialogProps) {
  // WorkflowDetailDialog.tsx
  const {
    workflow,
    loading,
    error,
    updateStepStatus,
    uploadDocument,
    deleteDocument,
    refetch
  } = useWorkflowData(serviceData.id, "notaris");


  // Pass workflow steps untuk calculation
  const { progress, saveProgress, refetch: refetchProgress } = useWorkflowProgress(
    serviceData.id,
    workflow?.steps
  );

  // Refetch progress saat workflow data berubah
  useEffect(() => {
    if (workflow?.steps) {
      refetchProgress();
    }
  }, [workflow?.steps, refetchProgress]);

  // Save progress saat dialog ditutup
  useEffect(() => {
    if (!open && progress.currentStepId) {
      saveProgress(progress.currentStepId);
    }
  }, [open, progress.currentStepId, saveProgress]);

  // Debug log
  useEffect(() => {
    if (workflow?.steps) {
      console.log('📋 Workflow steps:', workflow.steps.map(s => ({
        order: s.step_order,
        name: s.step_name,
        status: s.status
      })));
      console.log('📍 Current step order:', progress.currentStepOrder);
    }
  }, [workflow, progress]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !workflow) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="text-center py-8 text-red-600">
            Error: {error || "Workflow not found"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{serviceData.judul}</DialogTitle>
            <Button
              onClick={() => {
                refetch();
                refetchProgress();
              }}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
            <span>
              Klien: <strong>{serviceData.klien}</strong>
            </span>
            <Badge>{serviceData.status}</Badge>
            {serviceData.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Deadline:{" "}
                {new Date(serviceData.deadline).toLocaleDateString("id-ID")}
              </span>
            )}
            <span className="text-blue-600 font-semibold">
              Step {progress.currentStepOrder} / {workflow.steps.length}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {workflow.template.payment_timing && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 mb-4">
              <p className="text-sm">
                <strong>Info Pembayaran:</strong> {workflow.template.payment_timing}
              </p>
            </div>
          )}

          <WorkflowTimeline
            steps={workflow.steps}
            currentStepOrder={progress.currentStepOrder}
            onStepUpdate={async (stepId, status) => {
              const result = await updateStepStatus(stepId, status);
              if (result.success) {
                // Refresh progress setelah update
                setTimeout(() => refetchProgress(), 500);
              }
              return result;
            }}
            onDocumentUpload={async (stepId, docId, file) => {
              const result = await uploadDocument(stepId, docId, file);
              if (result.success) {
                // Refresh progress setelah upload
                setTimeout(() => refetchProgress(), 500);
              }
              return result;
            }}
            onDocumentDelete={deleteDocument}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
