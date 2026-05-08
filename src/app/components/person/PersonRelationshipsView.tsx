import React from 'react';
import { Heart, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Pessoa } from '../../types';
import { getRelationshipSubtitle } from '../../utils/personProfile';

type RelationshipGroups = {
  pais: Pessoa[];
  maes: Pessoa[];
  conjuges: Pessoa[];
  filhos: Pessoa[];
  irmaos: Pessoa[];
};

function uniqueById(people: Pessoa[]) {
  return Array.from(new Map(people.map((person) => [person.id, person])).values());
}

function PersonButton({ person, label }: { person: Pessoa; label: string }) {
  const navigate = useNavigate();
  const isPet = person.humano_ou_pet === 'Pet';

  return (
    <button
      type="button"
      onClick={() => navigate(`/pessoa/${person.id}`, { flushSync: true })}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
      aria-label={`Abrir perfil de ${person.nome_completo}`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${isPet ? 'bg-amber-100' : 'bg-blue-50'}`}>
        {person.foto_principal_url ? (
          <img src={person.foto_principal_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className={`h-6 w-6 ${isPet ? 'text-amber-700' : 'text-blue-700'}`} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-gray-900">{person.nome_completo}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{getRelationshipSubtitle(person) || label}</span>
      </span>
    </button>
  );
}

export function PersonRelationshipsView({ relationships, loading = false }: { relationships: RelationshipGroups; loading?: boolean }) {
  const parents = uniqueById([...relationships.pais, ...relationships.maes]);
  const spouses = uniqueById(relationships.conjuges);
  const children = uniqueById(relationships.filhos);
  const siblings = uniqueById(relationships.irmaos);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">Carregando relacionamentos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {parents.length === 0 ? <p className="text-sm text-gray-500">Nenhum pai/mãe cadastrado</p> : parents.map((person) => <PersonButton key={person.id} person={person} label="Pai/Mãe" />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Cônjuge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {spouses.length === 0 ? <p className="text-sm text-gray-500">Nenhum cônjuge cadastrado</p> : spouses.map((person) => <PersonButton key={person.id} person={person} label="Cônjuge" />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Filhos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {children.length === 0 ? <p className="text-sm text-gray-500">Nenhum filho cadastrado</p> : children.map((person) => <PersonButton key={person.id} person={person} label="Filho(a)" />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Irmãos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {siblings.length === 0 ? <p className="text-sm text-gray-500">Nenhum irmão cadastrado</p> : siblings.map((person) => <PersonButton key={person.id} person={person} label="Irmão(ã)" />)}
        </CardContent>
      </Card>
    </div>
  );
}
