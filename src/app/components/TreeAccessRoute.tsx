import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getPrimaryLinkedPerson } from '../services/memberProfileService';

function AccessLoading({ message = 'Verificando acesso...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export function TreeAccessRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = React.useState(true);
  const [target, setTarget] = React.useState<'tree' | 'auth' | 'review'>('auth');

  React.useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      if (loading) return;

      if (!user) {
        setTarget('auth');
        setChecking(false);
        return;
      }

      setChecking(true);
      const { data } = await getPrimaryLinkedPerson(user.id);

      if (!mounted) return;

      if (!data) {
        setTarget('auth');
      } else if (data.dados_confirmados) {
        setTarget('tree');
      } else {
        setTarget('review');
      }

      setChecking(false);
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [loading, user]);

  if (loading || checking) {
    return <AccessLoading />;
  }

  if (!user || target === 'auth') {
    return <Navigate to="/entrar" replace />;
  }

  if (target === 'review') {
    return <Navigate to="/meus-dados" replace />;
  }

  return <>{children}</>;
}
