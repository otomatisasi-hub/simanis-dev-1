import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarDays, Building, User, Phone, Mail, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const individualSchema = z.object({
  client_type: z.literal('individual'),
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  nik: z.string().min(16, 'NIK harus 16 digit').max(16, 'NIK harus 16 digit'),
  npwp: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  ktp_url: z.string().optional(),
  npwp_url: z.string().optional(),
  kk_url: z.string().optional(),
  marriage_certificate_url: z.string().optional()
});

const corporateSchema = z.object({
  client_type: z.literal('corporate'),
  full_name: z.string().min(2, 'Nama perusahaan minimal 2 karakter'),
  company_name: z.string().min(2, 'Nama perusahaan minimal 2 karakter'),
  company_npwp: z.string().optional(),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_founding_date: z.string().optional(),
  company_registration_number: z.string().optional(),
  company_sk_kemenkumham: z.string().optional(),
  company_nib: z.string().optional(),
  director_ktp: z.string().optional(),
  director_npwp: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional(),
  corporate_documents_url: z.array(z.string()).optional(),
  commissioner_details: z.string().optional(),
  rups_approval_details: z.string().optional()
});

const clientSchema = z.discriminatedUnion('client_type', [
  individualSchema,
  corporateSchema
]);

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ClientFormData> & { id?: string };
  mode?: 'create' | 'edit';
}

export function ClientForm({ onSuccess, initialData, mode = 'create' }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [clientType, setClientType] = useState<'individual' | 'corporate'>(
    initialData?.client_type || 'individual'
  );
  const { toast } = useToast();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_type: clientType,
      full_name: '',
      email: '',
      phone: '',
      address: '',
      ...initialData
    }
  });

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const clientData = {
        ...data,
        created_by: user.id,
        updated_at: new Date().toISOString()
      } as any; // Type assertion to handle discriminated union

      let result;
      if (mode === 'edit' && initialData?.id) {
        result = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', initialData.id);
      } else {
        result = await supabase
          .from('clients')
          .insert([clientData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Berhasil",
        description: mode === 'edit' 
          ? "Data klien berhasil diperbarui" 
          : "Klien baru berhasil ditambahkan"
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data klien",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientTypeChange = (type: 'individual' | 'corporate') => {
    setClientType(type);
    form.setValue('client_type', type);
    form.reset({
      client_type: type,
      full_name: '',
      email: '',
      phone: ''
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {clientType === 'individual' ? <User className="h-5 w-5" /> : <Building className="h-5 w-5" />}
              {mode === 'edit' ? 'Edit Klien' : 'Tambah Klien Baru'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Type Selection */}
            <div className="space-y-2">
              <Label>Tipe Klien</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={clientType === 'individual' ? 'default' : 'outline'}
                  onClick={() => handleClientTypeChange('individual')}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Individu
                </Button>
                <Button
                  type="button"
                  variant={clientType === 'corporate' ? 'default' : 'outline'}
                  onClick={() => handleClientTypeChange('corporate')}
                  className="flex items-center gap-2"
                >
                  <Building className="h-4 w-4" />
                  Badan Hukum
                </Button>
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Data Dasar</TabsTrigger>
                <TabsTrigger value="documents">Dokumen</TabsTrigger>
                <TabsTrigger value="additional">Tambahan</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                {clientType === 'individual' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama lengkap" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nik"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NIK</FormLabel>
                          <FormControl>
                            <Input placeholder="Nomor Induk Kependudukan (16 digit)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="npwp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NPWP</FormLabel>
                          <FormControl>
                            <Input placeholder="Nomor Pokok Wajib Pajak" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Perusahaan</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama perusahaan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Perwakilan</FormLabel>
                          <FormControl>
                            <Input placeholder="Nama direktur/perwakilan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_npwp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NPWP Perusahaan</FormLabel>
                          <FormControl>
                            <Input placeholder="NPWP Badan Hukum" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company_registration_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>No. Registrasi</FormLabel>
                            <FormControl>
                              <Input placeholder="Nomor registrasi perusahaan" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company_nib"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NIB</FormLabel>
                            <FormControl>
                              <Input placeholder="Nomor Induk Berusaha" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="Nomor telefon" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={clientType === 'individual' ? 'address' : 'company_address'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Alamat lengkap" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Upload Dokumen</h3>
                  <div className="grid gap-4">
                    {clientType === 'individual' ? (
                      <>
                        <div className="space-y-2">
                          <Label>KTP</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload KTP</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Kartu Keluarga</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload KK</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>NPWP</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload NPWP</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Akta Pendirian</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload Akta Pendirian</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>SK Kemenkumham</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload SK Kemenkumham</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>NPWP Perusahaan</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload NPWP</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                {clientType === 'corporate' && (
                  <>
                    <FormField
                      control={form.control}
                      name="company_founding_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Pendirian</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="commissioner_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detail Komisaris</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Informasi komisaris" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rups_approval_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detail Persetujuan RUPS</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detail persetujuan RUPS" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline">
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : mode === 'edit' ? "Update" : "Simpan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}