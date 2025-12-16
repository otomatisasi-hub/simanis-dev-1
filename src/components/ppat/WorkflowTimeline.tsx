"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Upload, X, FileIcon, Loader2 } from "lucide-react";
import type { WorkflowStep } from "@/data/notaryWorkflows";

const API_URL = "http://localhost:3001"; // Backend URL

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  onStepUpdate: (stepId: string, updates: Partial<WorkflowStep>) => void;
}

export function WorkflowTimeline({ steps, onStepUpdate }: WorkflowTimelineProps) {
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});

  const handleCheckboxChange = (stepId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    onStepUpdate(stepId, {
      status: newStatus as 'pending' | 'in-progress' | 'completed',
      completedAt: newStatus === 'completed' ? new Date() : undefined,
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    stepId: string,
    docId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDocs(prev => ({ ...prev, [docId]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("stepId", stepId);
      formData.append("docId", docId);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.fileUrl) {
        // Update document status
        onStepUpdate(stepId, {
          documents: steps
            .find(s => s.id === stepId)
            ?.documents?.map(doc =>
              doc.id === docId
                ? {
                    ...doc,
                    isUploaded: true,
                    fileUrl: `${API_URL}${result.fileUrl}`,
                    uploadedAt: new Date(result.uploadedAt),
                  }
                : doc
            ),
        });
        
        alert("File berhasil diupload!");
      } else {
        alert(`Upload gagal: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Upload error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docId]: false }));
      event.target.value = "";
    }
  };

  const handleFileRemove = async (stepId: string, docId: string, fileUrl?: string) => {
    if (!fileUrl) return;

    try {
      const response = await fetch(`${API_URL}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: fileUrl.replace(API_URL, '') }),
      });

      const result = await response.json();

      if (result.success) {
        // Update document status
        onStepUpdate(stepId, {
          documents: steps
            .find(s => s.id === stepId)
            ?.documents?.map(doc =>
              doc.id === docId
                ? {
                    ...doc,
                    isUploaded: false,
                    fileUrl: undefined,
                    uploadedAt: undefined,
                  }
                : doc
            ),
        });
      } else {
        alert("Gagal menghapus file");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Gagal menghapus file");
    }
  };


  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-start gap-0 min-w-max">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isInProgress = step.status === 'in-progress';
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start">
              {/* Step Card */}
              <div className="flex flex-col items-center min-w-[320px] max-w-[320px]">
                {/* Dot/Circle */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center
                    w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-green-500 border-green-500"
                        : isInProgress
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : isInProgress ? (
                    <Clock className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">{step.order}</span>
                  )}
                </div>

                {/* Content Card */}
                <div className="mt-4 w-full">
                  <div
                    className={`
                      p-4 rounded-lg border transition-all duration-300 h-full
                      ${
                        isCompleted
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                          : isInProgress
                          ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }
                    `}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleCheckboxChange(step.id, step.status)}
                        className="mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`
                            font-semibold text-sm transition-all
                            ${isCompleted ? "text-green-700 dark:text-green-400" : ""}
                          `}
                        >
                          {step.stepName}
                        </h4>
                        <Badge 
                          variant={
                            isCompleted ? "default" : 
                            isInProgress ? "secondary" : 
                            "outline"
                          }
                          className={`
                            mt-1 text-xs
                            ${isCompleted ? "bg-green-500" : ""}
                            ${isInProgress ? "bg-blue-500" : ""}
                          `}
                        >
                          {step.status === 'completed' ? 'Selesai' :
                           step.status === 'in-progress' ? 'Dikerjakan' :
                           'Menunggu'}
                        </Badge>
                      </div>
                    </div>

                    {step.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {step.description}
                      </p>
                    )}

                    {/* Completed Info */}
                    {isCompleted && step.completedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {new Date(step.completedAt).toLocaleDateString("id-ID", {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </p>
                    )}

                    {/* Documents Upload Section */}
                    {step.documents && step.documents.length > 0 && (
                      <div className="mt-2 p-3 bg-muted/50 rounded border space-y-2">
                        <p className="text-xs font-semibold mb-2">📄 Dokumen:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {step.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-2 p-2 bg-background rounded border"
                            >
                              <Checkbox 
                                checked={doc.isUploaded} 
                                disabled 
                                className="h-3 w-3 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs truncate ${doc.isUploaded ? "line-through text-muted-foreground" : ""}`}>
                                  {doc.documentName}
                                  {doc.isRequired && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                {doc.isUploaded && doc.uploadedAt && (
                                  <p className="text-xs text-green-600 mt-0.5">
                                    ✓ {new Date(doc.uploadedAt).toLocaleDateString("id-ID")}
                                  </p>
                                )}
                              </div>
                              
                              {!doc.isUploaded ? (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                    onChange={(e) => handleFileUpload(e, step.id, doc.id)}
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
                                  {doc.fileUrl && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => window.open(doc.fileUrl, '_blank')}
                                    >
                                      <FileIcon className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                    onClick={() => handleFileRemove(step.id, doc.id, doc.fileUrl)}
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
                <div className="flex items-center" style={{ marginTop: "20px" }}>
                  <div
                    className={`
                      h-0.5 w-8 transition-all duration-500
                      ${
                        isCompleted
                          ? "bg-green-500"
                          : isInProgress
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
