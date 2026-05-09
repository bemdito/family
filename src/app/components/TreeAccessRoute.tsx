import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { resolveFirstAccessLinkForUser } from '../services/memberProfileService';

const RECENT_LOGIN_LIMIT_MS = 60 * 60 * 1000;

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

function hasRecentLogin(lastSignInAt?: string | null) {
  if (!lastSignInAt) return false;

  const lastSignInTime = new Date(lastSignInAt).getTime();
  if (!Number.isFinite(lastSignInTime)) return false;

  return Date.now() - lastSignInTime <= RECENT_LOGIN_LIMIT_MS;
}

export function TreeAccessRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = React.useState(true);
  const [target, setTarget] = React.useState<'tree' | 'auth' | 'profile'>('auth');

  React.useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      if (loading) return;

      if (!user) {
        setTarget('auth');
        setChecking(false);
        return;
      }

      if (!hasRecentLogin(user.last_sign_in_at)) {
        setTarget('auth');
        setChecking(false);
        return;
      }

      setChecking(true);
      const result = await resolveFirstAccessLinkForUser(user);

      if (!mounted) return;

      if (result.status !== 'linked') {
        setTarget('auth');
      } else if (result.data.dados_confirmados) {
        setTarget('tree');
      } else {
        setTarget('profile');
      }

      setChecking(false);
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [loading, user?.id, user?.last_sign_in_at]);

  if (loading || checking) {
    return <AccessLoading />;
  }

  if (!user || target === 'auth') {
    return <Navigate to="/entrar" replace />;
  }

  if (target === 'profile') {
    return <Navigate to="/meus-dados" replace />;
  }

  return <>{children}</>;
}
