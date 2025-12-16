import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, ChevronRight, FileText, Users, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const serviceSchema = z.object({
  title: z.string().min(2, 'Judul layanan minimal 2 karakter'),
  description: z.string().optional(),
  client_id: z.string().min(1, 'Pilih klien'),
  service_type_id: z.string().min(1, 'Pilih jenis layanan'),
  category_id: z.string().min(1, 'Pilih kategori'),
  priority: z.enum(['low', 'normal', 'high']),
  estimated_completion_date: z.string().optional(),
  fee_amount: z.string().optional(),
  notes: z.string().optional()
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface Client {
  id: string;
  full_name: string;
  client_type: string;
  company_name?: string;
}

interface ServiceType {
  id: string;
  name: string;
  category: string;
  description: string;
  document_template: any;
  workflow_steps: any;
}

interface ServiceCategory {
  id: string;
  name: string;
  type: string;
}

interface ServiceCreationWizardProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, name: 'Informasi Dasar', icon: FileText },
  { id: 2, name: 'Pilih Klien', icon: Users },
  { id: 3, name: 'Dokumen Required', icon: CheckCircle },
  { id: 4, name: 'Finalisasi', icon: Calendar }
];

export function ServiceCreationWizard({ onSuccess, onCancel }: ServiceCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [documentChecklist, setDocumentChecklist] = useState<{[key: string]: boolean}>({});

  const { toast } = useToast();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      client_id: '',
      service_type_id: '',
      category_id: '',
      priority: 'normal',
      estimated_completion_date: '',
      fee_amount: '',
      notes: ''
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, serviceTypesRes, categoriesRes] = await Promise.all([
        supabase.from('clients').select('id, full_name, client_type, company_name'),
        supabase.from('service_types').select('*'),
        supabase.from('service_categories').select('*')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (serviceTypesRes.error) throw serviceTypesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setClients(clientsRes.data);
      setServiceTypes(serviceTypesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive"
      });
    }
  };

  const handleServiceTypeChange = (serviceTypeId: string) => {
    const serviceType = serviceTypes.find(st => st.id === serviceTypeId);
    setSelectedServiceType(serviceType || null);
    
    if (serviceType?.document_template) {
      const checklist: {[key: string]: boolean} = {};
      Object.values(serviceType.document_template).flat().forEach((doc: any) => {
        if (typeof doc === 'string') {
          checklist[doc] = false;
        }
      });
      setDocumentChecklist(checklist);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: ServiceFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate reference number
      const referenceNumber = `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const serviceData = {
        ...data,
        reference_number: referenceNumber,
        created_by: user.id,
        status: 'draft',
        fee_amount: data.fee_amount ? parseFloat(data.fee_amount) : null,
        estimated_completion_date: data.estimated_completion_date || null
      } as any; // Type assertion to handle optional fields

      const { error } = await supabase
        .from('services')
        .insert([serviceData]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Layanan berhasil dibuat"
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating service:', error);
      toast({
        title: "Error",
        description: "Gagal membuat layanan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul Layanan</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan judul layanan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Layanan</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    handleServiceTypeChange(value);
                  }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis layanan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant={type.category === 'ppat' ? 'default' : 'secondary'}>
                              {type.category.toUpperCase()}
                            </Badge>
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Deskripsi layanan (opsional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih Klien</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih klien" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant={client.client_type === 'individual' ? 'default' : 'secondary'}>
                              {client.client_type === 'individual' ? 'Perorangan' : 'Badan Hukum'}
                            </Badge>
                            {client.company_name || client.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioritas</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Rendah</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Tinggi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_completion_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimasi Selesai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fee_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biaya</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dokumen yang Diperlukan</h3>
            {selectedServiceType ? (
              <div className="space-y-4">
                {Object.entries(selectedServiceType.document_template || {}).map(([category, documents]) => (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium capitalize">
                        {category.replace(/_/g, ' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(documents as string[]).map((doc) => (
                        <div key={doc} className="flex items-center space-x-2">
                          <Checkbox
                            id={doc}
                            checked={documentChecklist[doc] || false}
                            onCheckedChange={(checked) => {
                              setDocumentChecklist(prev => ({
                                ...prev,
                                [doc]: checked as boolean
                              }));
                            }}
                          />
                          <label htmlFor={doc} className="text-sm">
                            {doc}
                          </label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Pilih jenis layanan terlebih dahulu</p>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review & Finalisasi</h3>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Tambahan</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Catatan untuk layanan ini" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ringkasan Layanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Judul:</strong> {form.watch('title') || 'Belum diisi'}</div>
                <div><strong>Jenis:</strong> {selectedServiceType?.name || 'Belum dipilih'}</div>
                <div><strong>Klien:</strong> {
                  clients.find(c => c.id === form.watch('client_id'))?.full_name || 'Belum dipilih'
                }</div>
                <div><strong>Prioritas:</strong> {form.watch('priority')}</div>
                <div><strong>Estimasi Selesai:</strong> {form.watch('estimated_completion_date') || 'Belum diisi'}</div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Buat Layanan Baru</CardTitle>
          <div className="text-sm text-muted-foreground">
            Langkah {currentStep} dari {STEPS.length}
          </div>
        </div>
        <Progress value={(currentStep / STEPS.length) * 100} className="mt-4" />
      </CardHeader>

      <CardContent>
        <div className="flex justify-between mb-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`rounded-full p-2 ${
                    step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs mt-1">{step.name}</span>
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {renderStepContent()}

            <div className="flex justify-between mt-8">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Sebelumnya
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Batal
                  </Button>
                )}
              </div>

              <div>
                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={nextStep}>
                    Selanjutnya
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading}>
                    {loading ? "Membuat..." : "Buat Layanan"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}