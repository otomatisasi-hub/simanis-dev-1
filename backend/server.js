// ============================================
// 1. LOAD .ENV PERTAMA
// ============================================
require('dotenv').config();  // ✅ TAMBAH INI DI ATAS SEMUA!

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ============================================
// 1️⃣ CORS - POSISI #1
// ============================================
app.use((req, res, next) => {
  console.log(`🛡️ CORS: ${req.method} ${req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ============================================
// 2️⃣ BODY PARSER
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 3️⃣ STATIC FILES - SEKARANG BISA GUNAKAN path
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ============================================
// 4️⃣ SUPABASE & LOGGING - POSISI #4
// ============================================
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// ============================================
// AUTHENTICATE MIDDLEWARE
// ============================================
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    req.user = data.user;
    req.userId = data.user.id;
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// ============================================
// UPLOAD HANDLER
// ============================================
async function uploadHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}


// ============================================
// MULTER DYNAMIC STORAGE
// ============================================
const dynamicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const modul = req.body.modul || 'unknown';
    const layanan = req.body.layanan || 'unknown';
    const subLayanan = req.body.subLayanan || 'umum';
    const clientName = req.body.clientName || 'unknown';

    const uploadPath = path.join(__dirname, 'uploads', modul, layanan, subLayanan, clientName);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const documentName = req.body.documentName || 'document';
    const clientName = req.body.clientName || 'unknown';
    const serviceName = req.body.serviceName || 'service';
    
    const filename = `${documentName}_${clientName}_${serviceName}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const uploadDynamic = multer({
  storage: dynamicStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and DOC files are allowed'));
    }
  }
});

// ============================================
// MIDDLEWARE: ROLE VALIDATION (DARI KODE ASLI KAMU)
// ============================================
function validateRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      console.log('🛡️ validateRole middleware');
      console.log('  Path:', req.path);
      console.log('  User ID:', req.userId);
      console.log('  Allowed roles:', allowedRoles);

      if (!req.userId) {
        console.error('❌ No userId in request');
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.userId);

      console.log('📊 Query result from user_roles:', {
        found: userRoles?.length || 0,
        roles: userRoles?.map(r => r.role) || [],
        error: error?.message || null,
      });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      const roles = userRoles?.map((r) => r.role) || [];
      console.log('🔍 User roles:', roles);

      const hasAccess =
        roles.some((r) => allowedRoles.includes(r)) ||
        roles.includes('super_admin') ||
        roles.includes('admin');

      console.log('🎯 Access check result:', {
        hasAccess,
        userRoles: roles,
        allowedRoles,
      });

      if (!hasAccess) {
        console.error('❌ Access denied!');
        return res.status(403).json({
          success: false,
          error: `Access denied. Your roles: [${roles.join(', ')}]. Required: [${allowedRoles.join(', ')}]`,
        });
      }

      console.log(`✅ Access granted to: ${req.user.email} with roles: ${roles.join(', ')}`);
      next();
    } catch (err) {
      console.error('❌ Role validation error:', err);
      return res.status(500).json({
        success: false,
        error: 'Role validation failed',
      });
    }
  };
}

// ============================================
// MULTER UPLOAD (DARI KODE ASLI - UNTUK PNBP/INVOICE)
// ============================================
const uploadDir = path.join(__dirname, 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });  // ✅ INI YANG HILANG!



// ============================================
// 6️⃣ ROUTES - POSISI TERAKHIR
// ============================================
app.post('/api/upload', authenticate, uploadDynamic.single('file'), uploadHandler);

// ============================================
// BASIC ROUTES
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Notaris Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// ============================================
// FILE UPLOAD/DELETE ENDPOINTS
// ============================================

/**
 * POST /api/upload
 * Upload dengan auto-create document record jika belum ada
 */
app.post('/api/upload',
  authenticate,
  uploadDynamic.single('file'),
  async (req, res) => {
    try {
      console.log('📍 Incoming upload request')
      console.log('📋 req.body:', req.body)

      if (!req.file) {
        console.error('❌ No file in request')
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        })
      }

      const {
        modul,
        layanan,
        clientName,
        category,
        stepId,
        serviceId,
        documentName
      } = req.body

      console.log('📁 Upload context:', {
        modul, layanan, clientName, category,
        stepId, serviceId, documentName
      })

      // ✅ Construct RELATIVE file URL
      let fileUrl = req.file.path
      fileUrl = fileUrl.replace(/\\/g, '/')
      
      const uploadsIndex = fileUrl.indexOf('/uploads')
      if (uploadsIndex !== -1) {
        fileUrl = fileUrl.substring(uploadsIndex)
      } else {
        fileUrl = '/uploads/' + req.file.filename
      }

      console.log('✅ File URL (relative):', fileUrl)

      // ✅ CASE 1: WORKFLOW DOCUMENT UPLOAD
      if (stepId && serviceId) {
        console.log('📋 Processing WORKFLOW document upload...')

        let documentId = req.body.docId
        const isValidUUID = documentId &&
          !documentId.startsWith('temp-') &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)

        if (!isValidUUID) {
          console.log('📝 Creating workflow document record...')

          const { data: stepData } = await supabase
            .from('workflow_step_instances')
            .select(`
              step_order,
              workflow_template_steps (
                step_name
              )
            `)
            .eq('id', stepId)
            .single()

          const docName = documentName
            || stepData?.workflow_template_steps?.step_name
            || `Step ${stepData?.step_order || ''}`

          const { data: newDoc, error: docError } = await supabase
            .from('service_documents_unified')
            .insert({
              service_id: serviceId,
              workflow_step_instance_id: stepId,
              document_name: docName,
              category: 'workflow_step',
              is_required: true,
              is_uploaded: true,
              file_url: fileUrl,
              uploaded_at: new Date().toISOString(),
              uploaded_by: req.userId,
            })
            .select()
            .single()

          if (docError) {
            console.error('Error creating workflow document:', docError)
            throw docError
          }

          documentId = newDoc.id
          console.log('✅ Workflow document created:', documentId)
        } else {
          console.log('📝 Updating existing workflow document:', documentId)

          const { error: updateError } = await supabase
            .from('service_documents_unified')
            .update({
              is_uploaded: true,
              file_url: fileUrl,
              uploaded_at: new Date().toISOString(),
              uploaded_by: req.userId,
            })
            .eq('id', documentId)

          if (updateError) {
            console.error('Error updating workflow document:', updateError)
            throw updateError
          }

          console.log('✅ Workflow document updated')
        }

        // Check if all required docs uploaded
        const { data: allStepDocs } = await supabase
          .from('service_documents_unified')
          .select('id, is_required, is_uploaded')
          .eq('workflow_step_instance_id', stepId)

        if (allStepDocs) {
          const requiredDocs = allStepDocs.filter(d => d.is_required)
          const allRequiredUploaded = requiredDocs.every(d => d.is_uploaded)

          if (allRequiredUploaded && requiredDocs.length > 0) {
            await supabase
              .from('workflow_step_instances')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', stepId)

            console.log('✅ Step auto-completed')
          }
        }

        return res.json({
          success: true,
          message: 'Workflow document uploaded successfully',
          data: {
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            documentId,
            stepId,
          },
        })
      }

      // ✅ CASE 2: CLIENT/GENERAL DOCUMENT UPLOAD
      else if (modul && layanan) {
        console.log('👤 Processing CLIENT/GENERAL document upload...')

        return res.json({
          success: true,
          message: 'Client document uploaded successfully',
          data: {
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
          },
        })
      }

      // ✅ CASE 3: FALLBACK - Generic upload
      else {
        console.log('📄 Processing generic upload...')

        return res.json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
          },
        })
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed',
      })
    }
  }
)

/**
 * DELETE /api/delete
 * Delete uploaded file - support nested folder structure
 */
app.delete('/api/delete',
  authenticate,
  async (req, res) => {
    try {
      const { filename, filePath, url } = req.body

      if (!filename && !filePath && !url) {
        return res.status(400).json({
          success: false,
          error: 'filename, filePath, or url is required',
        })
      }

      let fullPath

      if (url) {
        const urlPath = url.replace(/^https?:\/\/[^/]+/, '')
        fullPath = path.join(__dirname, '../public', urlPath)
      } else if (filePath) {
        fullPath = path.join(__dirname, '../public', filePath)
      } else {
        fullPath = path.join(__dirname, '../public/uploads/documents', filename)
      }

      console.log('🗑️ Attempting to delete:', fullPath)

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        cleanupEmptyFolders(path.dirname(fullPath))

        res.json({
          success: true,
          message: 'File deleted successfully',
        })
      } else {
        console.warn('⚠️ File not found:', fullPath)
        res.status(404).json({
          success: false,
          error: 'File not found',
        })
      }
    } catch (error) {
      console.error('❌ Error deleting file:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete file',
      })
    }
  }
)

// ============================================
// AUTH ENDPOINTS
// ============================================

app.post('/api/auth/verify', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.userId)
      .single()

    if (error) throw error

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)

    if (rolesError) throw rolesError

    res.json({
      success: true,
      user: req.user,
      profile,
      roles: roles?.map((r) => r.role) || [],
    })
  } catch (error) {
    console.error('❌ Verify error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// ============================================
// STORAGE LOCATION ENDPOINTS
// ============================================

app.put('/api/services/:serviceId/storage-location', async (req, res) => {
  try {
    const { serviceId } = req.params
    const {
      location,
      storage_rack,
      storage_year,
      storage_month,
      storage_nomor_buku,
      storage_nomor_lembar,
      notes
    } = req.body

    console.log('📦 Updating storage location for service:', serviceId)

    if (!serviceId || !location || !storage_rack || !storage_year || !storage_month || !storage_nomor_buku || !storage_nomor_lembar) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    const { data, error } = await supabase
      .from('services')
      .update({
        storage_location: location,
        storage_rack,
        storage_year,
        storage_month,
        storage_nomor_buku,
        storage_nomor_lembar,
        storage_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase error:', error)
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }

    console.log('✅ Storage location updated successfully')

    return res.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('❌ Server error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    })
  }
})

app.post('/api/services/:serviceId/storage-location', async (req, res) => {
  try {
    const { serviceId } = req.params
    const {
      location,
      storage_rack,
      storage_year,
      storage_month,
      storage_nomor_buku,
      storage_nomor_lembar,
      notes
    } = req.body

    console.log('📦 Creating storage location for service:', serviceId)

    if (!serviceId || !location || !storage_rack || !storage_year || !storage_month || !storage_nomor_buku || !storage_nomor_lembar) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    const { data, error } = await supabase
      .from('services')
      .update({
        storage_location: location,
        storage_rack,
        storage_year,
        storage_month,
        storage_nomor_buku,
        storage_nomor_lembar,
        storage_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase error:', error)
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }

    console.log('✅ Storage location created successfully')

    return res.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('❌ Server error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    })
  }
})

// ============================================
// WORKFLOW ENDPOINTS
// ============================================

/**
 * GET /api/workflow/:workflowInstanceId/steps
 * Mengambil semua steps dalam workflow beserta dokumen yang terkait
 */
app.get('/api/workflow/:workflowInstanceId/steps',
  authenticate,
  async (req, res) => {
    try {
      const { workflowInstanceId } = req.params
      console.log('📋 Fetching workflow steps for:', workflowInstanceId)

      if (!workflowInstanceId) {
        return res.status(400).json({
          success: false,
          error: 'workflowInstanceId is required'
        })
      }

      const { data: steps, error: stepsError } = await supabase
        .from('workflow_step_instances')
        .select(`
          id,
          step_order,
          status,
          started_at,
          completed_at,
          notes,
          workflow_template_steps (
            step_name,
            description
          )
        `)
        .eq('workflow_instance_id', workflowInstanceId)
        .order('step_order', { ascending: true })

      if (stepsError) {
        console.error('Error fetching workflow steps:', stepsError)
        throw stepsError
      }

      if (!steps || steps.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'No workflow steps found'
        })
      }

      console.log(`✅ Found ${steps.length} workflow steps`)

      const { data: workflowInstance, error: instanceError } = await supabase
        .from('workflow_instances')
        .select('service_id')
        .eq('id', workflowInstanceId)
        .single()

      if (instanceError) {
        console.error('Error fetching workflow instance:', instanceError)
        throw instanceError
      }

      const { data: documents, error: docsError } = await supabase
        .from('service_documents_unified')
        .select('*')
        .eq('service_id', workflowInstance.service_id)
        .order('created_at', { ascending: true })

      if (docsError) {
        console.error('Error fetching documents:', docsError)
        throw docsError
      }

      console.log(`📄 Found ${documents?.length || 0} documents`)

      const stepsWithDocuments = steps.map(step => {
        const stepDocuments = (documents || []).filter(
          doc => doc.workflow_step_instance_id === step.id
        )

        return {
          id: step.id,
          step_order: step.step_order,
          step_name: step.workflow_template_steps?.step_name || `Step ${step.step_order}`,
          description: step.workflow_template_steps?.description || null,
          status: step.status,
          started_at: step.started_at,
          completed_at: step.completed_at,
          notes: step.notes,
          requires_document: true,
          documents: stepDocuments.map(doc => ({
            id: doc.id,
            document_name: doc.document_name,
            category: doc.category,
            is_required: doc.is_required,
            is_uploaded: doc.is_uploaded,
            file_url: doc.file_url,
            uploaded_at: doc.uploaded_at,
            uploaded_by: doc.uploaded_by,
            notes: doc.notes
          }))
        }
      })

      res.json({
        success: true,
        data: stepsWithDocuments,
        total: stepsWithDocuments.length
      })
    } catch (error) {
      console.error('GET /api/workflow/:workflowInstanceId/steps error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch workflow steps'
      })
    }
  }
)

/**
 * POST /api/workflow/init-documents
 * Auto-generate dokumen untuk setiap workflow step
 */
app.post('/api/workflow/init-documents',
  authenticate,
  async (req, res) => {
    try {
      const { workflowInstanceId, serviceId } = req.body
      console.log('📋 Init documents request:', { workflowInstanceId, serviceId })

      if (!workflowInstanceId || !serviceId) {
        return res.status(400).json({
          success: false,
          error: 'workflowInstanceId dan serviceId wajib diisi'
        })
      }

      const { data: steps, error: stepsError } = await supabase
        .from('workflow_step_instances')
        .select(`
          id,
          step_order,
          workflow_template_steps (
            step_name
          )
        `)
        .eq('workflow_instance_id', workflowInstanceId)
        .order('step_order', { ascending: true })

      if (stepsError) {
        console.error('Error fetching steps:', stepsError)
        throw stepsError
      }

      if (!steps || steps.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tidak ada steps dalam workflow'
        })
      }

      console.log(`📌 Found ${steps.length} workflow steps`)

      const { data: existingDocs, error: existingError } = await supabase
        .from('service_documents_unified')
        .select('workflow_step_instance_id')
        .eq('service_id', serviceId)
        .in('workflow_step_instance_id', steps.map(s => s.id))

      if (existingError) {
        console.error('Error checking existing docs:', existingError)
        throw existingError
      }

      const existingStepIds = new Set(
        (existingDocs || []).map(doc => doc.workflow_step_instance_id)
      )

      console.log(`📌 ${existingStepIds.size} steps already have documents`)

      const stepsNeedingDocs = steps.filter(step => !existingStepIds.has(step.id))

      if (stepsNeedingDocs.length === 0) {
        console.log('✅ All steps already have documents')
        return res.json({
          success: true,
          message: 'Semua step sudah memiliki dokumen',
          data: []
        })
      }

      console.log(`📝 Creating documents for ${stepsNeedingDocs.length} steps`)

      const documentInserts = stepsNeedingDocs.map(step => ({
        service_id: serviceId,
        workflow_step_instance_id: step.id,
        document_name: step.workflow_template_steps?.step_name || `Step ${step.step_order}`,
        category: 'workflow_step',
        is_required: true,
        is_uploaded: false,
        uploaded_by: null,
        uploaded_at: null,
        file_url: null,
        notes: null
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('service_documents_unified')
        .insert(documentInserts)
        .select()

      if (insertError) {
        console.error('Error inserting documents:', insertError)
        throw insertError
      }

      console.log(`✅ Successfully created ${inserted?.length || 0} document records`)

      res.json({
        success: true,
        message: `${inserted?.length || 0} dokumen per step berhasil dibuat`,
        data: inserted
      })
    } catch (error) {
      console.error('POST /api/workflow/init-documents error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Gagal membuat dokumen per step'
      })
    }
  }
)

app.get('/api/workflows/:serviceId', authenticate, async (req, res) => {
  try {
    const { serviceId } = req.params

    const { data: workflowInstance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('service_id', serviceId)
      .single()

    if (instanceError) throw instanceError

    const { data: steps, error: stepsError } = await supabase
      .from('workflow_step_instances')
      .select(`
        *,
        workflow_template_steps (*)
      `)
      .eq('workflow_instance_id', workflowInstance.id)
      .order('step_order', { ascending: true })

    if (stepsError) throw stepsError

    res.json({
      success: true,
      data: {
        instance: workflowInstance,
        steps: steps || [],
      },
    })
  } catch (error) {
    console.error('Error fetching workflow:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.post('/api/workflows/step/:stepId/start', authenticate, async (req, res) => {
  try {
    const { stepId } = req.params

    const { data, error } = await supabase
      .from('workflow_step_instances')
      .update({
        status: 'in-progress',
        started_at: new Date().toISOString(),
        started_by: req.userId,
      })
      .eq('id', stepId)
      .select()
      .single()

    if (error) throw error

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error starting workflow step:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.post('/api/workflows/step/:stepId/complete', authenticate, async (req, res) => {
  try {
    const { stepId } = req.params
    const { notes } = req.body

    const { data, error } = await supabase
      .from('workflow_step_instances')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: req.userId,
        notes: notes || null,
      })
      .eq('id', stepId)
      .select()
      .single()

    if (error) throw error

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error completing workflow step:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})



app.post('/api/services', authenticate, async (req, res) => {
  try {
    const { 
      clientId, 
      title, 
      menuLayanan, 
      layanan, 
      subLayanan, 
      feeAmount, 
      deadline, 
      notes 
    } = req.body;
    const userId = req.userId;

    if (!clientId || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId dan title wajib diisi' 
      });
    }

    // 1. Insert layanan baru ke tabel services
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        client_id: clientId,
        title,
        menu_layanan: menuLayanan,
        layanan,
        sub_layanan: subLayanan,
        fee_amount: feeAmount ?? 0,
        deadline: deadline ?? null,
        created_by: userId,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (serviceError) {
      console.error('Insert service error:', serviceError);
      throw serviceError;
    }

    // 2. 🔥 PENTING: Otomatis buat baris "Biaya Layanan" di service_finances
    const dueDate = deadline ?? new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10);
    
    const { error: financeError } = await supabase
      .from('service_finances')
      .insert({
        service_id: service.id,
        follow_up_type: 'Biaya Layanan',
        amount: feeAmount ?? 0,
        due_date: dueDate,
        status: 'pending',
        created_by: userId,
        claimed_by: null,  // belum di-claim, nanti user keuangan claim
        notes: `Biaya Layanan untuk ${title}`,
      });

    if (financeError) {
      console.error('Insert Biaya Layanan error:', financeError);
      throw financeError;
    }

    console.log('✅ Service created:', service.id, '+ Biaya Layanan inserted');

    return res.status(201).json({
      success: true,
      message: 'Layanan berhasil dibuat',
      data: service,
    });
  } catch (error) {
    console.error('POST /api/services error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// PNBP ENDPOINTS
// ============================================

/**
 * POST /api/pnbp/request
 * Notaris request PNBP
 */
 app.post(
  '/api/pnbp/request',
  authenticate,
  validateRole('notaris', 'ppat', 'syariah', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { serviceId, amount, notes, workflowStepInstanceId } = req.body; // ← Tambah ini
      const userId = req.userId;

      if (!serviceId) {
        return res.status(400).json({ 
          success: false, 
          error: 'serviceId wajib diisi' 
        });
      }

      // 1. Insert ke invoice_requests
      const { data: pnbpRequest, error: reqError } = await supabase
        .from('invoice_requests')
        .insert({
          service_id: serviceId,
          payment_type: 'pnbp',
          amount: amount || 0,
          status: 'pending',
          requested_by: userId,
          requested_at: new Date().toISOString(),
          notes: notes || null,
          workflow_step_instance_id: workflowStepInstanceId || null, // ← TAMBAH INI
        })
        .select()
        .single();

      if (reqError) throw reqError;
      // 2. Ambil Biaya Layanan untuk tarik due_date (dan PIC kalau mau)
      const { data: biayaFinance, error: blError } = await supabase
        .from('service_finances')
        .select('claimed_by, due_date, amount')
        .eq('service_id', serviceId)
        .eq('follow_up_type', 'Biaya Layanan')
        .maybeSingle()

      if (blError && blError.code !== 'PGRST116') {
        // PGRST116 = no rows, masih aman
        throw blError
      }

      const picId = biayaFinance?.claimed_by ?? null

      // Pastikan due_date tidak null (fallback kalau Biaya Layanan belum punya due_date)
      const fallbackDueDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const dueDate = biayaFinance?.due_date || fallbackDueDate

      // Nominal bisa pakai amount dari request, atau fallback ke Biaya Layanan
      const nominal =
        typeof amount === 'number'
          ? amount
          : biayaFinance?.amount ?? 0

      // 3. Auto-create row di service_finances (task keuangan)
      const { error: financeError } = await supabase
        .from('service_finances')
        .insert({
          service_id: serviceId,
          follow_up_type: 'Invoice',
          payment_request_id: pnbpRequest.id,
          due_date: dueDate,      // <-- WAJIB
          amount: nominal,
          status: 'pending',
          claimed_by: picId,
          claimed_at: picId ? new Date().toISOString() : null,
          created_by: userId,
        })

      if (financeError) throw financeError

      return res.json({ success: true, data: pnbpRequest })
    } catch (err) {
      console.error('POST /api/pnbp/request error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  }
)


// /**
//  * POST /api/pnbp/upload-document
//  * Upload dokumen PNBP dengan folder & naming dinamis
//  */
// app.post('/api/pnbp/upload-document',
//   authenticate,
//   validateRole('keuangan', 'admin', 'super_admin'),
//   uploadDynamic.single('file'),
//   async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: 'No file uploaded'
//         })
//       }

//       const {
//         pnbpRequestId,
//         modul,
//         layanan,
//         subLayanan,
//         clientName,
//         serviceName,
//         documentName
//       } = req.body

//       if (!pnbpRequestId) {
//         if (req.file && fs.existsSync(req.file.path)) {
//           fs.unlinkSync(req.file.path)
//         }
//         return res.status(400).json({
//           success: false,
//           error: 'pnbpRequestId is required'
//         })
//       }

//       if (!modul || !layanan || !clientName) {
//         if (req.file && fs.existsSync(req.file.path)) {
//           fs.unlinkSync(req.file.path)
//         }
//         return res.status(400).json({
//           success: false,
//           error: 'Missing required context: modul, layanan, clientName'
//         })
//       }

//       console.log('📄 PNBP document uploaded:', req.file.filename)

//       const relativePath = req.file.path
//         .replace(path.join(__dirname, '../public'), '')
//         .replace(/\\/g, '/')

//       return res.json({
//         success: true,
//         message: 'PNBP document uploaded successfully',
//         fileUrl: relativePath,
//         fileName: req.file.originalname,
//         savedAs: req.file.filename,
//         filePath: req.file.path,
//         fileMimeType: req.file.mimetype,
//         fileSize: req.file.size
//       })
//     } catch (error) {
//       console.error('❌ /api/pnbp/upload-document error', error)
//       if (req.file && fs.existsSync(req.file.path)) {
//         fs.unlinkSync(req.file.path)
//       }
//       return res.status(500).json({
//         success: false,
//         error: error.message || 'Failed to upload PNBP document'
//       })
//     }
//   }
// )

/**
 * GET /api/pnbp/status/:serviceId
 * Get PNBP status for a service (for polling in workflow)
 */
app.get('/api/pnbp/status/:serviceId', authenticate, async (req, res) => {
  try {
    const { serviceId } = req.params

    const { data: pnbpRequest, error: pnbpError } = await supabase
      .from('invoice_requests')
      .select('*')
      .eq('service_id', serviceId)
      .eq('payment_type', 'pnbp')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pnbpError) {
      console.error('❌ Error fetching PNBP request:', pnbpError)
      throw pnbpError
    }

    res.json({
      success: true,
      data: pnbpRequest
    })
  } catch (error) {
    console.error('💥 /api/pnbp/status/:serviceId error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch PNBP status'
    })
  }
})

// PNBP – notaris upload bukti bayar
// ==================== PAYMENT PROOF UPLOAD ====================

// POST /api/pnbp/upload-payment-proof - Upload bukti bayar PNBP (sudah ada)
app.post(
  '/api/pnbp/upload-payment-proof',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    try {
      const { requestId, paidAt, notes } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'File bukti bayar wajib diupload' 
        });
      }

      const fileUrl = `/uploads/documents/${req.file.filename}`;

      const { data, error } = await supabase
        .from('invoice_requests')
        .update({
          status: 'awaitingpayment',
          paid_at: paidAt || new Date().toISOString(),
          payment_proof_url: fileUrl,
          payment_proof_name: req.file.originalname,
          notes: notes || null,
        })
        .eq('id', requestId)
        .eq('payment_type', 'pnbp')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ 
          success: false, 
          error: 'Payment request tidak ditemukan' 
        });
      }

      return res.json({ success: true, data });
    } catch (err) {
      console.error('[api/pnbp/upload-payment-proof] error:', err);
      return res.status(500).json({ 
        success: false, 
        error: err.message || 'Failed to upload PNBP payment proof' 
      });
    }
  }
);

// 🆕 POST /api/invoice/upload-payment-proof - Upload bukti bayar Invoice
app.post(
  '/api/invoice/upload-payment-proof',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    try {
      const { requestId, paidAt, notes } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'File bukti bayar wajib diupload' 
        });
      }

      const fileUrl = `/uploads/documents/${req.file.filename}`;

      const { data, error } = await supabase
        .from('invoice_requests')
        .update({
          status: 'awaitingpayment',
          paid_at: paidAt || new Date().toISOString(),
          payment_proof_url: fileUrl,
          payment_proof_name: req.file.originalname,
          notes: notes || null,
        })
        .eq('id', requestId)
        .eq('payment_type', 'invoice')  // ← Beda di sini
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ 
          success: false, 
          error: 'Invoice request tidak ditemukan' 
        });
      }

      return res.json({ success: true, data });
    } catch (err) {
      console.error('[api/invoice/upload-payment-proof] error:', err);
      return res.status(500).json({ 
        success: false, 
        error: err.message || 'Failed to upload invoice payment proof' 
      });
    }
  }
);




/**
 * POST /api/pnbp/complete
 * Mark PNBP request as completed (without file upload)
 */
// app.post(
//   '/api/pnbp/complete',
//   authenticate,
//   validateRole('keuangan', 'admin', 'super_admin'),
//   async (req, res) => {
//     try {
//       const { requestId } = req.body

//       if (!requestId) {
//         return res.status(400).json({
//           success: false,
//           error: 'requestId is required',
//         })
//       }

//       const userId = req.userId

//       const { data, error } = await supabase
//         .from('invoice_requests')
//         .update({
//           status: 'completed',
//           completed_at: new Date().toISOString(),
//         })
//         .eq('id', requestId)
//         .select()
//         .single()

//       if (error) throw error

//       res.json({
//         success: true,
//         message: 'PNBP request marked as completed',
//         data,
//       })
//     } catch (error) {
//       console.error('Error completing PNBP:', error)
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       })
//     }
//   }
// )

/**
 * POST /api/pnbp/hold
 * Put PNBP request on hold
 */
// app.post(
//   '/api/pnbp/hold',
//   authenticate,
//   validateRole('keuangan', 'admin', 'super_admin'),
//   async (req, res) => {
//     try {
//       const { requestId, reason } = req.body

//       if (!requestId || !reason) {
//         return res.status(400).json({
//           success: false,
//           error: 'requestId and reason are required',
//         })
//       }

//       const { data, error } = await supabase
//         .from('invoice_requests')
//         .update({
//           status: 'hold',
//           hold_reason: reason,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', requestId)
//         .select()
//         .single()

//       if (error) throw error

//       res.json({
//         success: true,
//         message: 'PNBP request put on hold',
//         data,
//       })
//     } catch (error) {
//       console.error('Error holding PNBP:', error)
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       })
//     }
//   }
// )



app.post(
  '/api/invoice/send-document',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { requestId, notes, invoiceNumber, invoicePayerType } = req.body

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'File wajib diupload',
        })
      }

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: 'requestId wajib diisi',
        })
      }

      // Ambil request dulu untuk tahu payment_type
      const { data: existing, error: fetchError } = await supabase
        .from('invoice_requests')
        .select('id, payment_type')
        .eq('id', requestId)
        .maybeSingle()

      if (fetchError) {
        throw fetchError
      }

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Invoice/PNBP request tidak ditemukan',
        })
      }

      const isPnbp = existing.payment_type === 'pnbp'

      // Validasi nomor invoice hanya untuk non‑PNBP
      if (!isPnbp && (!invoiceNumber || !invoiceNumber.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Nomor invoice wajib diisi untuk tipe non‑PNBP',
        })
      }

      const userId = req.userId
      const fileUrl = `/uploads/documents/${req.file.filename}`
      const now = new Date().toISOString()

      const updatePayload = {
        status: 'sent',
        sent_at: now,
        finance_file_url: fileUrl,
        finance_file_name: req.file.originalname,
        notes: notes || null,
      }

      // Field khusus invoice (non‑PNBP)
      if (!isPnbp) {
        updatePayload.invoice_number = invoiceNumber.trim()
        updatePayload.invoice_sent_at = now
        updatePayload.invoice_sent_by = userId
        updatePayload.invoice_payer_type = invoicePayerType || null
      }

      const { data, error } = await supabase
        .from('invoice_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .select('*')
        .maybeSingle()

      if (error) {
        console.error('/api/invoice/send-document error:', error)
        throw error
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Invoice/PNBP request tidak ditemukan setelah update',
        })
      }

      return res.json({
        success: true,
        data,
      })
    } catch (err) {
      console.error('/api/invoice/send-document error:', err)
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to send invoice document',
      })
    }
  }
)



// ============================================
// INVOICE ENDPOINTS
// ============================================

/**
 * POST /api/invoice/request
 * Notaris request Invoice/Pelunasan/DP
 */
app.post('/api/invoice/request', authenticate, validateRole('notaris', 'ppat', 'syariah', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { service_id, payment_type, amount, due_date, notes, workflowStepInstanceId } = req.body
    const userId = req.userId

    if (!service_id || !payment_type) {
      return res.status(400).json({
        success: false,
        error: 'service_id dan payment_type wajib diisi'
      })
    }

    // 1. ✅ Insert ke invoice_requests
    const { data: paymentRequest, error: reqError } = await supabase
      .from('invoice_requests')
      .insert({
        service_id,
        payment_type,
        amount: amount || 0,
        due_date,
        status: 'pending',
        requested_by: userId,
        requested_at: new Date().toISOString(),
        notes: notes || null,
        workflow_step_instance_id: workflowStepInstanceId || null, // ⬅️ ini kunci
      })
      .select()
      .single()

    if (reqError) {
      console.error('Error insert invoice_requests:', reqError)
      throw reqError
    }

    console.log('✅ Invoice request created:', paymentRequest.id)

    // 2. ✅ AUTO-CREATE row di service_finances
    const { error: financeError } = await supabase
      .from('service_finances')
      .insert({
        service_id,
        follow_up_type: 'Invoice',
        payment_request_id: paymentRequest.id, // link ke invoice_requests
        due_date: due_date || null,
        amount: amount || 0,
        status: 'pending',
        claimed_by: null,
        claimed_at: null,
        created_by: userId,
      })

    if (financeError) {
      console.error('Error create service_finances:', financeError)
      throw financeError
    }

    console.log('✅ Service finance task created for payment_request_id:', paymentRequest.id)

    return res.json({
      success: true,
      message: `Request ${payment_type} berhasil dibuat`,
      data: paymentRequest
    })
  } catch (err) {
    console.error('POST /api/invoice/request error:', err)
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal membuat payment request'
    })
  }
})

/**
 * GET /api/invoice/request/:serviceId
 * Get invoice request for a service
 */
// GET /api/invoice/request/:serviceId
app.get('/api/invoice/request/:serviceId', authenticate, async (req, res) => {
  try {
    const { serviceId } = req.params

    const { data, error } = await supabase
      .from('invoice_requests')
      .select('*')
      .eq('service_id', serviceId)
      // ⬇️ pilih salah satu sesuai kolom yang memang ada di DB
      .order('requested_at', { ascending: false }) // atau 'createdat'
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return res.json({ success: true, data: data || null })
  } catch (err) {
    console.error('❌ GET /api/invoice/request/:serviceId error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})



/**
 * GET /api/invoice/status/:serviceId
 * Get invoice status for service (for polling in workflow)
 */
app.get('/api/invoice/status/:serviceId', authenticate, async (req, res) => {
  try {
    const { serviceId } = req.params

    const { data, error } = await supabase
      .from('invoice_requests')
      .select('*')
      .eq('service_id', serviceId)
      .in('payment_type', ['invoice', 'dp', 'pelunasan'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    res.json({ success: true, data: data || null })
  } catch (error) {
    console.error('/api/invoice/status/:serviceId error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/invoice/upload-document
 * Upload dokumen Invoice
 */
app.post('/api/invoice/upload-document',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  uploadDynamic.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        })
      }

      const { invoiceRequestId } = req.body

      if (!invoiceRequestId) {
        fs.unlinkSync(req.file.path)
        return res.status(400).json({
          success: false,
          error: 'invoiceRequestId is required'
        })
      }

      console.log('📄 Invoice document uploaded:', req.file.filename)

      const relativePath = req.file.path
        .replace(path.join(__dirname, '../public'), '')
        .replace(/\\/g, '/')

      return res.json({
        success: true,
        message: 'Invoice document uploaded successfully',
        fileUrl: relativePath,
        fileName: req.file.originalname,
        savedAs: req.file.filename,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size
      })
    } catch (error) {
      console.error('❌ /api/invoice/upload-document error', error)
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload invoice document'
      })
    }
  }
)




// ============================================
// FINANCE ENDPOINTS
// ============================================


/**
 * GET /api/finance/statistics
 * Get finance statistics for dashboard
 */
 app.get('/api/finance/statistics', authenticate, async (req, res) => {
  try {
    console.log('📊 [GET /api/finance/statistics] Request received');

    const { data, error } = await supabase
      .from('service_finances')
      .select('status, amount');

    if (error) throw error;

    const stats = {
      pending_count: data?.filter(d => d.status === 'pending').length ?? 0,
      in_progress_count: data?.filter(d => d.status === 'in_progress').length ?? 0,
      completed_today: 0,
      completed_this_week: 0,
      completed_this_month: 0,
      total_amount: data?.reduce((sum, d) => sum + (d.amount || 0), 0) ?? 0,
      paid_amount: 0,
      outstanding_amount: 0,
    };

    return res.json({
      success: true,
      data: [stats],
    });
  } catch (error) {
    console.error('❌ /api/finance/statistics error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


/**
 * GET /api/finance/dashboard
 * Finance dashboard view
 */
 app.get(
  '/api/finance/dashboard',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('v_finance_dashboard')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('apifinancedashboard error:', error);
        throw error;
      }

      const rows =
        data?.map((row) => ({
          id: row.id,
          serviceid: row.service_id,
          jenistransaksi: row.jenist_ransaksi,        // dari jenist_ransaksi
          nominal: row.nominal != null ? Number(row.nominal) : null,

          duedate: row.due_date,
          statuspembayaran: row.status_pembayaran,
          invoicenumber: row.invoice_number,

          claimedby: row.claimed_by,
          claimedat: row.claimed_at,
          createdat: row.created_at,
          notes: row.notes,

          servicetitle: row.service_title,
          modul: row.modul,
          layanan: row.layanan,
          sublayanan: row.sub_layanan,

          clientname: row.client_name,
          clientphone: row.client_phone,
          clientemail: row.client_email,

          createdbyname: row.created_by_name,
          claimedbyname: row.claimed_by_name,

          totalbayar: row.totalbayar != null ? Number(row.totalbayar) : 0,
          sisabayar: row.sisabayar != null ? Number(row.sisabayar) : 0,

          canclaim: !!row.can_claim,
          canprocesspayment: !!row.can_process_payment,
          claimstatus: row.claim_status,
        })) ?? [];

      return res.status(200).json({
        success: true,
        data: rows,
        total: rows.length,
      });
    } catch (err) {
      console.error('apifinancedashboard error:', err);
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);






/**
 * GET /api/finance/workload
 * ✅ FIXED: Finance Workload dengan RPC function yang benar
 */
app.get(
  '/api/finance/workload',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      console.log('📥 GET /api/finance/workload - User ID:', req.userId)

      // ✅ PERBAIKAN: Gunakan nama function dan parameter yang benar
      const { data, error } = await supabase
        .rpc('get_finance_user_workload', { p_user_id: req.userId })

      if (error) {
        console.error('❌ RPC error:', error)
        throw error
      }

      console.log('✅ Workload fetched:', data?.length || 0, 'records')

      return res.json({
        success: true,
        data: data || [],
        total: data?.length || 0,
      })
    } catch (error) {
      console.error('❌ /api/finance/workload error:', error)
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch workload',
      })
    }
  }
)

/**
 * GET /api/finance/detail/:id
 * Get payment request detail
 */
 app.get(
  '/api/finance/detail/:id',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Cek di invoice_requests dulu
      const { data: inv, error: invErr } = await supabase
        .from('invoice_requests')
        .select(`
          id, service_id, payment_type, status, requested_at, notes, amount, due_date, invoice_number,
          sent_at, finance_file_url, finance_file_name,
          paid_at, payment_proof_url, payment_proof_name,
          completed_at, validated_by, hold_reason,
          services:services (
            id, title, deadline,
            clients:clients ( id, full_name, phone, email )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (invErr) throw invErr;

      if (inv) {
        const svc = inv.services;
        const cli = svc?.clients;

        return res.json({
          success: true,
          data: {
            // ID request
            id: inv.id,

            // FIELD UTAMA (camelCase sesuai frontend)
            serviceid: inv.service_id,
            paymenttype: inv.payment_type || 'invoice',
            status: inv.status,
            requestedat: inv.requested_at,
            notes: inv.notes || null,
            amount: inv.amount ?? null,
            duedate: inv.due_date ?? null,

            // INFO INVOICE DARI KEUANGAN
            invoicenumber: inv.invoice_number ?? null,
            sentat: inv.sent_at ?? null,
            financefileurl: inv.finance_file_url ?? null,
            financefilename: inv.finance_file_name ?? null,

            // INFO BUKTI BAYAR DARI NOTARIS
            paidat: inv.paid_at ?? null,
            paymentproofurl: inv.payment_proof_url ?? null,
            paymentproofname: inv.payment_proof_name ?? null,

            // STATUS VALIDASI
            completedat: inv.completed_at ?? null,
            validatedby: inv.validated_by ?? null,
            holdreason: inv.hold_reason ?? null,

            // RELASI LAYANAN & KLIEN (camelCase)
            services: svc
              ? {
                  id: svc.id,
                  title: svc.title,
                  deadline: svc.deadline,
                }
              : null,
            clients: cli
              ? {
                  id: cli.id,
                  fullname: cli.full_name, // map dari full_name -> fullname
                  phone: cli.phone ?? null,
                  email: cli.email ?? null,
                }
              : null,
          },
        });
      }

      // Fallback: PNBP (pnbp_requests)
      const { data: pnbp, error: pnbpErr } = await supabase
        .from('pnbp_requests')
        .select(`
          id, service_id, status, requested_at, notes, completed_at, hold_reason,
          sent_at, finance_file_url, finance_file_name,
          paid_at, payment_proof_url, payment_proof_name,
          services:services (
            id, title, deadline,
            clients:clients ( id, full_name, phone, email )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (pnbpErr) throw pnbpErr;
      if (!pnbp) {
        return res
          .status(404)
          .json({ success: false, error: 'Payment request tidak ditemukan' });
      }

      const svc = pnbp.services;
      const cli = svc?.clients;

      return res.json({
        success: true,
        data: {
          id: pnbp.id,

          // PNBP pakai shape yang sama supaya frontend tidak perlu beda-beda
          serviceid: pnbp.service_id,
          paymenttype: 'pnbp',
          status: pnbp.status,
          requestedat: pnbp.requested_at,
          notes: pnbp.notes || null,
          amount: null,
          duedate: null,
          invoicenumber: null,

          sentat: pnbp.sent_at ?? null,
          financefileurl: pnbp.finance_file_url ?? null,
          financefilename: pnbp.finance_file_name ?? null,

          paidat: pnbp.paid_at ?? null,
          paymentproofurl: pnbp.payment_proof_url ?? null,
          paymentproofname: pnbp.payment_proof_name ?? null,

          completedat: pnbp.completed_at ?? null,
          validatedby: null,
          holdreason: pnbp.hold_reason ?? null,

          services: svc
            ? {
                id: svc.id,
                title: svc.title,
                deadline: svc.deadline,
              }
            : null,
          clients: cli
            ? {
                id: cli.id,
                fullname: cli.full_name,
                phone: cli.phone ?? null,
                email: cli.email ?? null,
              }
            : null,
        },
      });
    } catch (err) {
      console.error('/api/finance/detail error:', err);
      return res
        .status(500)
        .json({ success: false, error: err.message || 'Failed to fetch finance detail' });
    }
  }
);


/**
 * POST /api/finance/complete
 * ✅ FIXED: Complete payment request dengan upload dokumen
 */
app.post(
  '/api/finance/complete',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  uploadDynamic.single('file'),
  async (req, res) => {
    try {
      console.log('📥 POST /api/finance/complete - Start')

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'File tidak ditemukan'
        })
      }

      const {
        requestId,
        serviceId,
        paymentType,
        notes,
        invoiceNumber,
        invoicePayerType
      } = req.body

      console.log('📋 Request data:', {
        requestId,
        serviceId,
        paymentType,
        hasFile: !!req.file
      })

      if (!requestId || !serviceId) {
        return res.status(400).json({
          success: false,
          error: 'requestId dan serviceId wajib diisi'
        })
      }

      // Build file URL
      const relativePath = path.relative(
        path.join(__dirname, '../public'),
        req.file.path
      ).replace(/\\/g, '/')

      const fileUrl = `/${relativePath}`
      const fileName = req.file.filename

      console.log('✅ File saved:', fileUrl)

      // ✅ Update invoice_requests dengan status 'sent'
      const updatePayload = paymentType === 'pnbp' ? {
        finance_file_url: fileUrl,
        finance_file_name: fileName,
        status: 'sent',
        notes: notes || null,
        sent_at: new Date().toISOString(),
        invoice_sent_by: req.userId
      } : {
        invoice_file_url: fileUrl,
        invoice_number: invoiceNumber || null,
        invoice_sent_at: new Date().toISOString(),
        invoice_sent_by: req.userId,
        status: 'sent',
        notes: notes || null,
        invoice_payer_type: invoicePayerType || null
      }

      console.log('📝 Update payload:', updatePayload)

      const { data: updateData, error: updateError } = await supabase
        .from('invoice_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Update error:', updateError)
        return res.status(500).json({
          success: false,
          error: `Update gagal: ${updateError.message}`
        })
      }

      console.log('✅ Invoice request updated:', updateData.id, '- Status:', updateData.status)

      // ✅ Update service_finances
      const { error: sfError } = await supabase
        .from('service_finances')
        .update({
          status: 'pending',
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('payment_request_id', requestId)

      if (sfError) {
        console.warn('⚠️ Update service_finances warning:', sfError.message)
      } else {
        console.log('✅ Service finances updated')
      }

      res.json({
        success: true,
        message: `Dokumen ${paymentType} berhasil diupload`,
        data: {
          ...updateData,
          fileUrl,
          fileName
        }
      })
    } catch (err) {
      console.error('❌ POST /api/finance/complete error:', err)
      return res.status(500).json({
        success: false,
        error: err.message || 'Gagal menyelesaikan request'
      })
    }
  }
)

/**
 * POST /api/finance/claim
 * ✅ FIXED: Claim finance task
 */
app.post(
  '/api/finance/claim',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { finance_id } = req.body

      if (!finance_id) {
        return res.status(400).json({
          success: false,
          error: 'finance_id wajib diisi'
        })
      }

      console.log('📌 Claim attempt by', req.user?.email, 'for finance', finance_id)

      // 1. Claim specific task
      const { data, error } = await supabase
        .from('service_finances')
        .update({
          claimed_by: req.userId,
          claimed_at: new Date().toISOString()
        })
        .eq('id', finance_id)
        .is('claimed_by', null)
        .select('id, service_id, follow_up_type')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(409).json({ 
            success: false, 
            error: 'Task sudah di-claim oleh user lain' 
          })
        }
        throw error
      }

      console.log('✅ Task claimed:', data.id)

      // 2. Auto-assign semua Invoice untuk service yang sama
      const { data: assignedTasks, error: assignError } = await supabase
        .from('service_finances')
        .update({
          claimed_by: req.userId,
          claimed_at: new Date().toISOString()
        })
        .eq('service_id', data.service_id)
        .eq('follow_up_type', 'Invoice')
        .is('claimed_by', null)
        .select('id')

      if (assignError) {
        console.error('Auto-assign error:', assignError)
      } else {
        console.log('✅ Auto-assigned', assignedTasks?.length || 0, 'Invoice tasks')
      }

      return res.json({
        success: true,
        message: 'Task berhasil di-claim',
        data,
        auto_assigned: assignedTasks?.length || 0
      })
    } catch (err) {
      console.error('❌ /api/finance/claim error:', err)
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      })
    }
  }
)

/**
 * POST /api/finance/release
 * Release claimed task (undo claim)
 */
app.post(
  '/api/finance/release',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { financeId } = req.body

      if (!financeId || typeof financeId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'financeId is required',
        })
      }

      console.log('Release claim attempt by', req.user?.email, 'for finance', financeId)

      const { data, error } = await supabase
        .from('service_finances')
        .update({
          claimed_by: null,
          claimed_at: null,
        })
        .eq('id', financeId)
        .eq('claimed_by', req.userId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(403).json({
            success: false,
            error: 'Anda tidak bisa release task yang bukan milik Anda',
          })
        }
        console.error('💥 /api/finance/release error (db):', error)
        return res.status(500).json({
          success: false,
          error: error.message || 'Database error',
        })
      }

      return res.json({
        success: true,
        message: 'Claim berhasil di-release',
        data,
      })
    } catch (err) {
      console.error('💥 /api/finance/release error (server):', err)
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      })
    }
  }
)

/**
 * POST /api/finance/validate-payment
 * Keuangan validasi bukti bayar
 */
 app.post(
  '/api/finance/validate-payment',
  authenticate,
  validateRole('keuangan', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { requestId, isApproved, notes } = req.body
      console.log('POST apifinancevalidate-payment', requestId, isApproved, notes)

      if (!requestId) {
        return res.status(400).json({ success: false, error: 'requestId wajib diisi' })
      }

      const newStatus = isApproved ? 'completed' : 'hold'

      // 1) Update invoicerequests + ambil workflowstepinstanceid
      const { data: updateData, error: updateError } = await supabase
        .from('invoice_requests')
        .update({
          status: newStatus,
          validated_by: req.userId,
          completed_at: isApproved ? new Date().toISOString() : null,
          hold_reason: !isApproved ? notes : null,
          notes: isApproved ? notes : null,
        })
        .eq('id', requestId)
        .select('id, service_id, workflow_step_instance_id')  // ⬅️ penting
        .single()

      if (updateError) {
        console.error('Update invoicerequests error', updateError)
        throw updateError
      }

      // 2) Sinkron ke servicefinances (sudah ada di kode kamu)
      if (updateData.serviceid) {
        const { error: financeError } = await supabase
          .from('service_finances')
          .update({
            status: newStatus,
            notes: notes || null,
          })
          .eq('payment_request_id', requestId)

        if (financeError) {
          console.warn('Update servicefinances warning', financeError)
        }
      }

      // 3) Kalau request terkait step workflow, complete juga step-nya
      if (isApproved && updateData.workflowstepinstanceid) {
        const { error: stepError } = await supabase
          .from('workflow_step_instances')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: req.userId,
          })
          .eq('id', updateData.workflowstepinstanceid)

        if (stepError) {
          console.warn('Update workflowstepinstances warning', stepError)
        }
      }

      return res.json({
        success: true,
        message: isApproved ? 'Pembayaran berhasil divalidasi' : 'Pembayaran ditahan',
        data: updateData,
      })
    } catch (error) {
      console.error('POST apifinancevalidate-payment error', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Gagal memvalidasi pembayaran',
      })
    }
  },
)

// ============================================
// SERVICE ENDPOINTS
// ============================================

app.get('/api/services', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/services/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error fetching service:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

app.get('/api/notifications/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params
    const { unreadOnly } = req.query

    if (userId !== req.userId) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.userId)

      const roles = userRoles?.map((r) => r.role) || []
      const isAdmin = roles.includes('admin') || roles.includes('super_admin')

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        })
      }
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) throw error

    res.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.post('/api/notifications/mark-read', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds array is required',
      })
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notificationIds)
      .eq('user_id', req.userId)
      .select()

    if (error) throw error

    res.json({
      success: true,
      message: 'Notifications marked as read',
      data,
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// ============================================
// ADMIN USER MANAGEMENT ENDPOINTS
// ============================================

app.get('/api/admin/users', 
  authenticate, 
  validateRole('admin', 'super_admin'), 
  async (req, res) => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      res.json({
        success: true,
        data: profiles || [],
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }
)

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  })
})

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;  // ✅ TAMBAH INI
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Finance endpoints ready with FIXED snake_case`)
  console.log(`✅ /api/finance/workload - FIXED RPC function call`)
  console.log(`✅ All endpoints use consistent snake_case naming`)
})
