import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, KeyRound, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  ensureMemberProfile,
  FirstAccessPersonPreview,
  getPrimaryLinkedPerson,
  isPersonAlreadyLinked,
  linkUserToPerson,
  validateFirstAccessCode,
} from '../services/memberProfileService';

type AuthMode = 'login' | 'first-access';
type FirstAccessStep = 'code' | 'account';

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (lower.includes('password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  if (lower.includes('already registered') || lower.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Faça login para continuar.';
  }

  return message;
}

export function Entrar() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstAccessStep, setFirstAccessStep] = useState<FirstAccessStep>('code');
  const [accessCode, setAccessCode] = useState('');
  const [preview, setPreview] = useState<FirstAccessPersonPreview | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirmation, setSignupPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function redirectAuthenticatedUser() {
      if (loading) return;

      if (!user) {
        setCheckingSession(false);
        return;
      }

      setCheckingSession(true);
      const { data } = await getPrimaryLinkedPerson(user.id);

      if (!mounted) return;

      if (data?.dados_confirmados) {
        navigate('/', { replace: true });
      } else if (data) {
        navigate('/meus-dados', { replace: true });
      } else {
        setCheckingSession(false);
      }
    }

    redirectAuthenticatedUser();

    return () => {
      mounted = false;
    };
  }, [loading, navigate, user]);

  const title = useMemo(() => {
    if (mode === 'login') return 'Entrar na árvore';
    return firstAccessStep === 'code' ? 'Primeiro acesso' : 'Criar conta';
  }, [firstAccessStep, mode]);

  const routeAfterAuth = async (userId: string) => {
    const { data, error } = await getPrimaryLinkedPerson(userId);

    if (error) {
      toast.error(error);
      return;
    }

    if (!data) {
      toast.error('Sua conta ainda não está vinculada a uma pessoa da árvore.');
      return;
    }

    navigate(data.dados_confirmados ? '/' : '/meus-dados', { replace: true });
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword) {
      toast.error('Informe e-mail e senha.');
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setSubmitting(false);

    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }

    if (!data.user) {
      toast.error('Não foi possível identificar o usuário autenticado.');
      return;
    }

    await routeAfterAuth(data.user.id);
  };

  const handleValidateCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { data, error } = await validateFirstAccessCode(accessCode);
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (!data) {
      toast.error('Código não encontrado. Verifique o código informado.');
      return;
    }

    if (data.already_used) {
      toast.error('Este código já foi utilizado. Faça login ou solicite ajuda.');
      return;
    }

    setPreview(data);
    setFirstAccessStep('account');
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!preview) {
      toast.error('Valide o código de primeiro acesso antes de criar a conta.');
      setFirstAccessStep('code');
      return;
    }

    if (!signupEmail.trim()) {
      toast.error('E-mail é obrigatório.');
      return;
    }

    if (!signupPassword) {
      toast.error('Senha é obrigatória.');
      return;
    }

    if (!signupPasswordConfirmation) {
      toast.error('Confirmação de senha é obrigatória.');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (signupPassword !== signupPasswordConfirmation) {
      toast.error('Senha e confirmação devem ser iguais.');
      return;
    }

    setSubmitting(true);

    const linkedCheck = await isPersonAlreadyLinked(preview.pessoa_id);
    if (linkedCheck.error) {
      setSubmitting(false);
      toast.error(linkedCheck.error);
      return;
    }

    if (linkedCheck.alreadyLinked) {
      setSubmitting(false);
      toast.error('Este código já foi utilizado. Faça login ou solicite ajuda.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          nome_exibicao: preview.nome_completo,
          pessoa_id: preview.pessoa_id,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      toast.error(friendlyAuthError(error.message));
      return;
    }

    if (!data.user) {
      setSubmitting(false);
      toast.error('Não foi possível criar o usuário.');
      return;
    }

    if (!data.session) {
      setSubmitting(false);
      toast.info('Conta criada. Confirme seu e-mail e faça login para concluir o vínculo.');
      setMode('login');
      return;
    }

    const profileResult = await ensureMemberProfile(data.user.id, {
      nome_exibicao: preview.nome_completo,
    });

    if (profileResult.error) {
      setSubmitting(false);
      toast.error(profileResult.error);
      return;
    }

    const linkResult = await linkUserToPerson({
      userId: data.user.id,
      pessoaId: preview.pessoa_id,
      relacaoComPerfil: 'Sou esta pessoa',
      principal: true,
      dadosConfirmados: false,
    });

    setSubmitting(false);

    if (linkResult.error) {
      toast.error(linkResult.error);
      return;
    }

    toast.success('Conta criada. Revise seus dados para acessar a árvore.');
    navigate('/meus-dados', { replace: true });
  };

  if (loading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1fr)]">
          <section className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Árvore Genealógica</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950">Família Barros Souza</h1>
            <p className="mt-4 max-w-xl text-base text-gray-600">
              Use o código de primeiro acesso para ativar sua conta e revisar seus dados na árvore.
            </p>
          </section>

          <Card className="border-gray-200 shadow-xl">
            <CardHeader className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                <ModeButton active={mode === 'login'} onClick={() => setMode('login')}>
                  <LogIn className="h-4 w-4" />
                  Login
                </ModeButton>
                <ModeButton active={mode === 'first-access'} onClick={() => setMode('first-access')}>
                  <UserPlus className="h-4 w-4" />
                  Primeiro acesso
                </ModeButton>
              </div>

              <div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <p className="mt-2 text-sm text-gray-500">
                  {mode === 'login'
                    ? 'Entre com seu e-mail e senha para acessar sua árvore.'
                    : 'Informe o código recebido e crie suas credenciais.'}
                </p>
              </div>
            </CardHeader>

            <CardContent>
              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field label="E-mail">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} className="pl-10" required />
                    </div>
                  </Field>

                  <Field label="Senha">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="pl-10" required />
                    </div>
                  </Field>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setMode('first-access')}
                    className="w-full text-center text-sm font-medium text-blue-700 hover:underline"
                  >
                    Primeiro acesso
                  </button>
                </form>
              ) : firstAccessStep === 'code' ? (
                <form onSubmit={handleValidateCode} className="space-y-4">
                  <Field label="Código de primeiro acesso">
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={accessCode}
                        onChange={(event) => setAccessCode(event.target.value)}
                        placeholder="04fe1b51-306b-4b88-8d6d-1d084984f6ec"
                        className="pl-10"
                        required
                      />
                    </div>
                  </Field>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Validando...' : 'Validar código'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-950">{preview?.nome_completo}</p>
                    <p className="mt-1 text-xs text-blue-800">
                      {[preview?.data_nascimento, preview?.local_nascimento].filter(Boolean).join(' • ') || 'Pessoa encontrada'}
                    </p>
                  </div>

                  <Field label="E-mail">
                    <Input type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} required />
                  </Field>

                  <Field label="Senha">
                    <Input type="password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} required />
                  </Field>

                  <Field label="Confirmar senha">
                    <Input
                      type="password"
                      value={signupPasswordConfirmation}
                      onChange={(event) => setSignupPasswordConfirmation(event.target.value)}
                      required
                    />
                  </Field>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Criando conta...' : 'Criar conta e revisar dados'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setFirstAccessStep('code')}
                    className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Trocar código
                  </button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
        active ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
