"use server";

import fs from "node:fs/promises";
import path from "node:path";

// Helper function untuk get file extension (pure JS)
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot);
}

// Helper function untuk get basename (pure JS)
function getBasename(filepath: string): string {
  return filepath.split('/').pop() || filepath.split('\\').pop() || filepath;
}

// Pastikan folder uploads ada
async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

export async function uploadDocument(formData: FormData) {
  try {
    console.log("=== Upload Document Started ===");
    
    const file = formData.get("file") as File;
    const stepId = formData.get("stepId") as string;
    const docId = formData.get("docId") as string;

    console.log("File:", file?.name, file?.type, file?.size);
    console.log("StepId:", stepId);
    console.log("DocId:", docId);

    if (!file || file.size === 0) {
      console.error("No file provided");
      return { success: false, error: "No file provided" };
    }

    // Validasi tipe file
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return { 
        success: false, 
        error: `Tipe file tidak diizinkan: ${file.type}. Hanya PDF, JPG, PNG, WEBP, atau DOC yang diperbolehkan.` 
      };
    }

    // Validasi ukuran file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error("File too large:", file.size);
      return { success: false, error: "Ukuran file melebihi 10MB" };
    }

    // Buat nama file unik
    const fileExt = getFileExtension(file.name);
    const fileName = `${stepId}-${docId}-${Date.now()}${fileExt}`;
    
    console.log("Generated filename:", fileName);

    // Ensure upload directory exists
    const uploadDir = await ensureUploadDir();
    console.log("Upload directory:", uploadDir);
    
    const filePath = path.join(uploadDir, fileName);
    console.log("Full file path:", filePath);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Buffer size:", buffer.length);

    // Save file to disk
    await fs.writeFile(filePath, buffer);
    console.log("File written successfully");

    // Return public URL
    const fileUrl = `/uploads/documents/${fileName}`;
    
    console.log("=== Upload Successful ===");
    console.log("File URL:", fileUrl);

    return {
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("=== Upload Error ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Upload failed" 
    };
  }
}

export async function deleteDocument(fileUrl: string) {
  try {
    console.log("=== Delete Document Started ===");
    console.log("File URL to delete:", fileUrl);
    
    // Extract filename from URL
    const fileName = getBasename(fileUrl);
    console.log("Filename:", fileName);
    
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "documents",
      fileName
    );
    
    console.log("Full file path:", filePath);

    // Check if file exists
    try {
      await fs.access(filePath);
      console.log("File exists, proceeding with deletion");
    } catch {
      console.warn("File does not exist:", filePath);
      return { success: true }; // Consider it success if file doesn't exist
    }

    // Delete file
    await fs.unlink(filePath);
    console.log("=== Delete Successful ===");

    return { success: true };
  } catch (error) {
    console.error("=== Delete Error ===");
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Delete failed" 
    };
  }
}
