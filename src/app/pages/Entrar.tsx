import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Mail, Lock, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function Entrar() {
  const navigate = useNavigate();
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (modoCadastro) {
      const result = await signUpWithPassword(email, password, nome ? { nome_exibicao: nome } : undefined);
      setLoading(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Cadastro iniciado. Verifique seu e-mail para confirmar a conta, se o projeto exigir confirmação.');
      return;
    }

    const result = await signInWithPassword(email, password);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Login realizado com sucesso.');
    navigate('/minha-arvore');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Voltar para a árvore
            </Link>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3">
              {modoCadastro ? <UserPlus className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
            </div>
            <CardTitle className="text-2xl">
              {modoCadastro ? 'Criar conta da família' : 'Entrar na área do membro'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              {modoCadastro
                ? 'Crie sua conta para acessar sua área personalizada e sua árvore familiar.'
                : 'Entre para visualizar sua área personalizada, favoritos e notificações.'}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {modoCadastro && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processando...' : modoCadastro ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {modoCadastro ? 'Já possui conta?' : 'Ainda não possui conta?'}{' '}
            <button
              type="button"
              onClick={() => setModoCadastro((prev) => !prev)}
              className="text-blue-600 hover:underline font-medium"
            >
              {modoCadastro ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
