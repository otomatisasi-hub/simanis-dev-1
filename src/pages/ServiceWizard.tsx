// // use client
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "@/hooks/useAuth";

// export function ServiceWizardPage() {
//   const { user } = useAuth();

//   const createService = async (clientId: string, form: any) => {
//     if (!user) return;

//     const { data, error } = await supabase
//       .from("services")
//       .insert({
//         client_id: clientId,
//         title: form.title,
//         description: form.description,
//         category_id: form.categoryId,
//         layanan: form.layanan,
//         sub_layanan: form.subLayanan,
//         is_syariah: form.isSyariah ?? false,
//         created_by: user.id,
//         assigned_to: user.id,
//         status: "draft",
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error("Create service error", error);
//       return null;
//     }

//     return data;
//   };

//   // sambungkan createService ke form wizard kamu
//   return <div>Service Wizard</div>;
// }

// export default ServiceWizardPage;
