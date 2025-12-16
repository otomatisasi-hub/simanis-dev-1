// src/components/auth/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredResource?: string; // Resource dari userpermissions
  requiredAction?: 'create' | 'read' | 'update' | 'delete';
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requiredResource,
  requiredAction = 'read'
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // ✅ Check permission dari userpermissions jika requiredResource ada
      if (requiredResource) {
        const { data: permission, error: permError } = await supabase
          .from('userpermissions')
          .select(`can_${requiredAction}`)
          .eq('user_id', user.id)
          .eq('resource', requiredResource)
          .single();

        if (permError || !permission) {
          console.warn('⛔ No permission found for resource:', requiredResource);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const hasPermission = permission[`can_${requiredAction}`] || false;
        
        console.log('🔐 Permission Check:', {
          resource: requiredResource,
          action: requiredAction,
          hasPermission
        });

        setHasAccess(hasPermission);
        setLoading(false);
        return;
      }

      // ✅ Fallback ke role check jika allowedRoles ada
      if (allowedRoles && allowedRoles.length > 0) {
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError || !userRole) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const normalizeRole = (role: string) => role.toLowerCase().replace(/_/g, '');
        const normalizedUserRole = normalizeRole(userRole.role);
        const normalizedAllowedRoles = allowedRoles.map(r => normalizeRole(r));

        const hasRoleAccess = normalizedAllowedRoles.includes(normalizedUserRole);

        console.log('🔐 Role Check:', {
          userRole: userRole.role,
          allowedRoles,
          hasRoleAccess
        });

        setHasAccess(hasRoleAccess);
        setLoading(false);
        return;
      }

      // ✅ Default: allow access jika tidak ada restriction
      setHasAccess(true);
      setLoading(false);

    } catch (error) {
      console.error('Access check error:', error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    console.warn('⛔ Access denied - redirecting to dashboard');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
