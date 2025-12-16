import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { Calendar } from "lucide-react";
import type { WorkflowTemplate } from "@/data/notaryWorkflows";

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
  workflowTemplate: WorkflowTemplate;
}

export function WorkflowDetailDialog({
  open,
  onOpenChange,
  serviceData,
  workflowTemplate,
}: WorkflowDetailDialogProps) {
  const [workflow, setWorkflow] = useState(workflowTemplate);

  const handleStepUpdate = (stepId: string, updates: any) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{serviceData.judul}</DialogTitle>
          {/* FIX: Gunakan div instead of DialogDescription untuk menghindari p > div nesting */}
          <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
            <span>Klien: <strong>{serviceData.klien}</strong></span>
            <Badge>{serviceData.status}</Badge>
            {serviceData.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Deadline: {new Date(serviceData.deadline).toLocaleDateString('id-ID')}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {workflow.paymentTiming && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 mb-4">
              <p className="text-sm">
                <strong>Info Pembayaran:</strong> {workflow.paymentTiming}
              </p>
            </div>
          )}
          
          <WorkflowTimeline
            steps={workflow.steps}
            onStepUpdate={handleStepUpdate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
