import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { isAdminUser } from '../services/permissionService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [adminLoading, setAdminLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      if (loading) return;

      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      setAdminLoading(true);
      const result = await isAdminUser(user);

      if (!mounted) return;

      setIsAdmin(result.isAdmin);
      setAdminLoading(false);
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [loading, user]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Verificando acesso administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/entrar" replace />;
  }

  return <>{children}</>;
}
