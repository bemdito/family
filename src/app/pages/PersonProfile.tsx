import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { obterPessoaPorId, obterRelacionamentosDaPessoa } from '../services/dataService';
import { ArquivosHistoricos } from '../components/ArquivosHistoricos';
import { formatarTelefone } from '../utils/telefone';
import { alternarFavorito, conteudoEstaFavoritado } from '../services/userEngagementService';
import { Pessoa } from '../types';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  MapPin, 
  Heart, 
  Users, 
  Dog,
  Phone,
  Home,
  Globe,
  Star,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

export function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pessoa, setPessoa] = useState<Pessoa | undefined>();
  const [relacionamentos, setRelacionamentos] = useState({ pais: [], maes: [], conjuges: [], filhos: [] });
  const [loading, setLoading] = useState(true);
  const [favoritado, setFavoritado] = useState(false);

  // Recarregar dados quando o ID mudar ou quando retornar de edição
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setLoading(true);
        const pessoaData = await obterPessoaPorId(id);
        setPessoa(pessoaData);
        setFavoritado(conteudoEstaFavoritado('pessoa', id));
        
        if (pessoaData) {
          const rels = await obterRelacionamentosDaPessoa(id);
          setRelacionamentos(rels);
        }
        setLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  if (!id) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Pessoa não encontrada</p>
            <Button onClick={() => navigate('/')} className="w-full mt-4">
              Voltar para a árvore
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pais, maes, conjuges, filhos } = relacionamentos;
  const isPet = pessoa.humano_ou_pet === 'Pet';
  const isFalecido = !!pessoa.data_falecimento;

  // Remover duplicatas por precaução (usando Set para garantir IDs únicos)
  const paisUnicos = Array.from(new Set(pais.map(p => p.id))).map(id => pais.find(p => p.id === id)!);
  const maesUnicas = Array.from(new Set(maes.map(m => m.id))).map(id => maes.find(m => m.id === id)!);
  const conjugesUnicos = Array.from(new Set(conjuges.map(c => c.id))).map(id => conjuges.find(c => c.id === id)!);
  const filhosUnicos = Array.from(new Set(filhos.map(f => f.id))).map(id => filhos.find(f => f.id === id)!);

  const handleToggleFavorite = () => {
    const resultado = alternarFavorito({
      tipo: 'pessoa',
      conteudoId: pessoa.id,
      titulo: pessoa.nome_completo,
    });

    setFavoritado(resultado.active);
    toast.success(resultado.active ? 'Pessoa adicionada aos favoritos' : 'Pessoa removida dos favoritos');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para árvore
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/meus-favoritos">
              <Button variant="outline">
                <Star className="w-4 h-4 mr-2" />
                Favoritos
              </Button>
            </Link>
            <Link to="/notificacoes">
              <Button variant="outline">
                <Bell className="w-4 h-4 mr-2" />
                Notificações
              </Button>
            </Link>
            <Button variant="outline" onClick={handleToggleFavorite}>
              <Star className={`w-4 h-4 mr-2 ${favoritado ? 'fill-current text-yellow-500' : ''}`} />
              {favoritado ? 'Salvo' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/pessoas/${id}/editar`)}>
              Editar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo */}
              <div className="flex-shrink-0">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  isPet ? 'bg-amber-200' : isFalecido ? 'bg-gray-300' : 'bg-blue-200'
                }`}>
                  {pessoa.foto_principal_url ? (
                    <img 
                      src={pessoa.foto_principal_url} 
                      alt={pessoa.nome_completo}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : isPet ? (
                    <Dog className="w-16 h-16 text-amber-700" />
                  ) : (
                    <User className="w-16 h-16 text-blue-700" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {pessoa.nome_completo}
                    </h1>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {isPet && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full">
                          <Dog className="w-4 h-4" />
                          Pet da família
                        </span>
                      )}
                      {isFalecido && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          🕊️ In Memoriam
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {pessoa.data_nascimento && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Nascimento: <strong>{pessoa.data_nascimento}</strong>
                      </span>
                    </div>
                  )}
                  
                  {pessoa.local_nascimento && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Local: <strong>{pessoa.local_nascimento}</strong>
                      </span>
                    </div>
                  )}
                  
                  {pessoa.data_falecimento && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Falecimento: <strong>{pessoa.data_falecimento}</strong>
                      </span>
                    </div>
                  )}
                  
                  {pessoa.local_falecimento && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Local: <strong>{pessoa.local_falecimento}</strong>
                      </span>
                    </div>
                  )}
                  
                  {pessoa.local_atual && !isFalecido && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Home className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Reside em: <strong>{pessoa.local_atual}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Biography */}
          {(pessoa.minibio || pessoa.curiosidades) && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Sobre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pessoa.minibio && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">Mini biografia</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{pessoa.minibio}</p>
                  </div>
                )}
                {pessoa.curiosidades && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">Curiosidades</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{pessoa.curiosidades}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Parents */}
          {(paisUnicos.length > 0 || maesUnicas.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Pais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paisUnicos.map((pai) => (
                    <button
                      key={pai.id}
                      onClick={() => navigate(`/pessoa/${pai.id}`)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <p className="font-medium text-sm text-gray-900">{pai.nome_completo}</p>
                      <p className="text-xs text-gray-500">Pai</p>
                    </button>
                  ))}
                  {maesUnicas.map((mae) => (
                    <button
                      key={mae.id}
                      onClick={() => navigate(`/pessoa/${mae.id}`)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <p className="font-medium text-sm text-gray-900">{mae.nome_completo}</p>
                      <p className="text-xs text-gray-500">Mãe</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spouses */}
          {conjugesUnicos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Cônjuges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conjugesUnicos.map((conjuge) => (
                    <button
                      key={conjuge.id}
                      onClick={() => navigate(`/pessoa/${conjuge.id}`)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <p className="font-medium text-sm text-gray-900">{conjuge.nome_completo}</p>
                      <p className="text-xs text-gray-500">Cônjuge</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Children */}
          {filhosUnicos.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Filhos ({filhosUnicos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {filhosUnicos.map((filho) => (
                    <button
                      key={filho.id}
                      onClick={() => navigate(`/pessoa/${filho.id}`)}
                      className="text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <p className="font-medium text-sm text-gray-900">{filho.nome_completo}</p>
                      {filho.data_nascimento && (
                        <p className="text-xs text-gray-500 mt-1">
                          ✦ {filho.data_nascimento}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Info - Não exibir se pessoa falecida */}
          {!isFalecido && (pessoa.telefone || pessoa.endereco || pessoa.rede_social) && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pessoa.telefone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{formatarTelefone(pessoa.telefone)}</span>
                    </div>
                  )}
                  {pessoa.endereco && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Home className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{pessoa.endereco}</span>
                    </div>
                  )}
                  {pessoa.rede_social && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a 
                        href={pessoa.rede_social} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {pessoa.rede_social}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historical Files */}
          {pessoa.arquivos_historicos && pessoa.arquivos_historicos.length > 0 && (
            <div className="md:col-span-2">
              <ArquivosHistoricos 
                arquivos={pessoa.arquivos_historicos} 
                onChange={() => {}}
                readOnly={true}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <Button onClick={() => navigate('/')} variant="outline">
            Ver na Árvore Genealógica
          </Button>
          <Link to="/calendario-familiar">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Abrir calendário familiar
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
