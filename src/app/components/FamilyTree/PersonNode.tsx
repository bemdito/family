import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, Dog, Eye, Pencil, Link2, Trash2 } from 'lucide-react';
import { PersonNodeData } from './types';
import {
  DIRECT_FAMILY_TOKENS,
  FAMILY_TREE_COLORS,
} from './visualTokens';
import { isPersonDeceased } from '../../utils/personFields';
import {
  DIRECT_FAMILY_CARD_TEXT_COLORS,
  DIRECT_FAMILY_RELATION_COLORS,
  DIRECT_FAMILY_STATUS_BORDER_COLORS,
} from './directFamilyColors';
import {
  extractYear,
  getPersonCardSecondaryText,
} from './utils/personCardText';

const DIRECT_FAMILY_PET_STYLE = {
  background: '#D97706',
  border: '#22C55E',
  color: '#ffffff',
  muted: 'rgba(255,255,255,0.82)',
};

function relationCardStyle(relationKey: keyof typeof DIRECT_FAMILY_RELATION_COLORS) {
  return {
    background: DIRECT_FAMILY_RELATION_COLORS[relationKey].background,
    border: DIRECT_FAMILY_RELATION_COLORS[relationKey].solid,
    color: DIRECT_FAMILY_CARD_TEXT_COLORS.primary,
    muted: DIRECT_FAMILY_CARD_TEXT_COLORS.muted,
  };
}

function PersonHandles() {
  const hiddenHandle = { background: 'transparent', border: 'none' };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ top: -1, left: '50%', ...hiddenHandle }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ top: -1, left: '50%', ...hiddenHandle }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-source-secondary"
        style={{ top: -1, left: '60%', ...hiddenHandle }}
      />

      <Handle type="source" position={Position.Right} id="right-source" style={{ right: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ right: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="source" position={Position.Right} id="spouse-right" style={{ right: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="target" position={Position.Right} id="spouse-right-target" style={{ right: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="source" position={Position.Right} id="child-right" style={{ right: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="target" position={Position.Right} id="sibling-right" style={{ right: 0, top: '50%', ...hiddenHandle }} />

      <Handle type="source" position={Position.Left} id="left-source" style={{ left: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ left: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="target" position={Position.Left} id="spouse-left" style={{ left: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="source" position={Position.Left} id="spouse-left-source" style={{ left: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="target" position={Position.Left} id="child-left" style={{ left: 0, top: '50%', ...hiddenHandle }} />
      <Handle type="source" position={Position.Left} id="sibling-left" style={{ left: 0, top: '50%', ...hiddenHandle }} />

      <Handle type="source" position={Position.Bottom} id="bottom" style={{ bottom: 0, left: '50%', ...hiddenHandle }} />
    </>
  );
}

const directRelationStyles: Record<NonNullable<PersonNodeData['directRelation']>, {
  background: string;
  border: string;
  color: string;
  muted: string;
}> = {
  central: relationCardStyle('central'),
  parent: relationCardStyle('pais'),
  sibling: relationCardStyle('irmaos'),
  child: relationCardStyle('filhos'),
  spouse: relationCardStyle('conjuge'),
  grandparent: relationCardStyle('avos'),
  greatGrandparent: relationCardStyle('bisavos'),
  greatGreatGrandparent: relationCardStyle('tataravos'),
  uncleAunt: relationCardStyle('tios'),
  cousin: relationCardStyle('primos'),
  nephewNiece: relationCardStyle('sobrinhos'),
  grandchild: relationCardStyle('netos'),
};

function ActionButton({
  label,
  onClick,
  Icon,
  danger = false,
}: {
  label: string;
  onClick?: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={[
        'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function getLifeYearsLabel(pessoa: PersonNodeData['pessoa']) {
  const birthYear = extractYear(pessoa.data_nascimento);
  const deathYear = extractYear(pessoa.data_falecimento);

  if (birthYear && deathYear) return `${birthYear}-${deathYear}`;
  if (deathYear) return `†${deathYear}`;
  if (birthYear) return birthYear;
  return undefined;
}

function parseBirthDate(value?: string | number | null) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return {
      day: Number(day),
      month: Number(month),
      year: Number(year),
      hasFullDate: true,
    };
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return {
      day: Number(day),
      month: Number(month),
      year: Number(year),
      hasFullDate: true,
    };
  }

  const year = extractYear(text);
  if (!year) return null;

  return {
    year: Number(year),
    hasFullDate: false,
  };
}

function getAgeLabel(value?: string | number | null) {
  const birthDate = parseBirthDate(value);
  if (!birthDate || !Number.isFinite(birthDate.year)) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birthDate.year;

  if (birthDate.hasFullDate && birthDate.month && birthDate.day) {
    const hasHadBirthday =
      today.getMonth() + 1 > birthDate.month ||
      (today.getMonth() + 1 === birthDate.month && today.getDate() >= birthDate.day);
    if (!hasHadBirthday) age -= 1;
  }

  if (age < 0 || age > 130) return undefined;
  return birthDate.hasFullDate ? `${age} anos` : `aprox. ${age} anos`;
}

export const PersonNode = React.memo(({ data }: NodeProps<PersonNodeData>) => {
  const {
    pessoa,
    onClick,
    isSelected,
    isCentralPerson,
    onView,
    onEdit,
    onAddConnection,
    onRemove,
    directRelation,
    useDirectRelationStyleForPet,
    useCentralDirectLayout,
  } = data;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const isPet = pessoa.humano_ou_pet === 'Pet';
  const isFalecido = isPersonDeceased(pessoa);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClick?.(pessoa);
  }, [onClick, pessoa]);

  const handleContextMenu = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(true);
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;

    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as globalThis.Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const getBorderColor = () => {
    if (isPet) return FAMILY_TREE_COLORS.CARD_BORDER_PET;
    if (isFalecido) return FAMILY_TREE_COLORS.CARD_BORDER_DECEASED;
    return FAMILY_TREE_COLORS.CARD_BORDER_ALIVE;
  };

  const secondaryText = getPersonCardSecondaryText(pessoa);

  const avatarContent = (avatarClassName: string, iconClassName: string) => {
    if (pessoa.foto_principal_url) {
      return (
        <img
          src={pessoa.foto_principal_url}
          alt={pessoa.nome_completo}
          className={`${avatarClassName} rounded-full object-cover`}
        />
      );
    }

    return isPet ? (
      <Dog className={iconClassName} />
    ) : (
      <User className={iconClassName} />
    );
  };

  const renderMenu = () => (
    menuOpen && (
      <div
        data-tree-node-menu="true"
        className="absolute right-2 top-2 z-50 min-w-[170px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
      >
        <ActionButton
          label="Visualizar"
          Icon={Eye}
          onClick={() => {
            setMenuOpen(false);
            onView?.(pessoa);
          }}
        />
        <ActionButton
          label="Editar"
          Icon={Pencil}
          onClick={() => {
            setMenuOpen(false);
            onEdit?.(pessoa);
          }}
        />
        <ActionButton
          label="Adicionar conexão"
          Icon={Link2}
          onClick={() => {
            setMenuOpen(false);
            onAddConnection?.(pessoa);
          }}
        />
        <ActionButton
          label="Remover"
          Icon={Trash2}
          danger
          onClick={() => {
            setMenuOpen(false);
            onRemove?.(pessoa);
          }}
        />
      </div>
    )
  );

  if (directRelation) {
    const style = isPet && !useDirectRelationStyleForPet ? DIRECT_FAMILY_PET_STYLE : directRelationStyles[directRelation];
    const directBorderColor = isFalecido
      ? DIRECT_FAMILY_STATUS_BORDER_COLORS.deceased
      : DIRECT_FAMILY_STATUS_BORDER_COLORS.alive;
    const isCentralDirectNode = directRelation === 'central' && useCentralDirectLayout !== false;
    const cardWidth = isCentralDirectNode ? DIRECT_FAMILY_TOKENS.CENTRAL_WIDTH : DIRECT_FAMILY_TOKENS.CARD_WIDTH;
    const cardHeight = isCentralDirectNode ? DIRECT_FAMILY_TOKENS.CENTRAL_HEIGHT : DIRECT_FAMILY_TOKENS.CARD_HEIGHT;
    const avatarSize = isCentralDirectNode ? DIRECT_FAMILY_TOKENS.CENTRAL_AVATAR_SIZE : DIRECT_FAMILY_TOKENS.AVATAR_SIZE;
    const directSecondaryText = secondaryText || getLifeYearsLabel(pessoa);
    const centralDetails = [
      getAgeLabel(pessoa.data_nascimento),
      pessoa.local_nascimento
        ? `Natural de ${pessoa.local_nascimento}${pessoa.data_nascimento ? ` (${pessoa.data_nascimento})` : ''}`
        : pessoa.data_nascimento
          ? String(pessoa.data_nascimento)
          : undefined,
      pessoa.local_atual ? `Mora atualmente em ${pessoa.local_atual}` : undefined,
    ].filter((item): item is string => Boolean(item));

    return (
      <div className="relative" ref={menuRef}>
        <div
          className={[
            'cursor-pointer rounded-lg border-[3px] shadow-lg transition-all hover:shadow-xl',
            isCentralDirectNode
              ? 'flex flex-col items-center justify-start px-12 py-11 text-center'
              : 'flex items-center gap-3 px-3 py-2',
            isSelected ? 'ring-2 ring-blue-300' : '',
          ].join(' ')}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          style={{
            width: cardWidth,
            minHeight: cardHeight,
            height: cardHeight,
            background: style.background,
            borderColor: directBorderColor,
            color: style.color,
          }}
        >
          <PersonHandles />

          <div
            className={[
              'flex shrink-0 items-center justify-center rounded-full',
              isCentralDirectNode ? 'bg-gray-100' : 'bg-white/90',
            ].join(' ')}
            style={{ width: avatarSize, height: avatarSize }}
          >
            {avatarContent(
              isCentralDirectNode ? 'h-[320px] w-[320px]' : 'h-[66px] w-[66px]',
              isCentralDirectNode ? 'h-28 w-28 text-slate-700' : 'h-7 w-7 text-slate-700'
            )}
          </div>

          <div className={isCentralDirectNode ? 'mt-9 min-w-0 max-w-full' : 'min-w-0 flex-1'}>
            <h3
              className={[
                'font-bold leading-tight',
                isCentralDirectNode
                  ? 'whitespace-normal break-words text-4xl'
                  : 'overflow-hidden text-ellipsis text-[18px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]',
              ].join(' ')}
              title={pessoa.nome_completo}
            >
              {pessoa.nome_completo}
            </h3>
            {isCentralDirectNode ? (
              centralDetails.length > 0 && (
                <div className="mt-5 space-y-2 text-xl leading-snug" style={{ color: style.muted }}>
                  {centralDetails.map((detail) => (
                    <p key={detail} className="whitespace-normal break-words">
                      {detail}
                    </p>
                  ))}
                </div>
              )
            ) : directSecondaryText && (
              <p
                className={[
                  'truncate leading-tight',
                  'mt-0.5 text-[13px]',
                ].join(' ')}
                style={{ color: style.muted }}
                title={directSecondaryText}
              >
                {directSecondaryText}
              </p>
            )}
          </div>
        </div>

        {renderMenu()}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <div
        className={`cursor-pointer rounded-lg border-2 px-4 py-3 shadow-md transition-all hover:shadow-lg ${
          isSelected ? 'ring-2 ring-blue-300' : ''
        }`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          width: 280,
          minHeight: 120,
          height: 120,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderColor: getBorderColor(),
        }}
      >
        <PersonHandles />

        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
              isPet ? 'bg-amber-200' : isFalecido ? 'bg-gray-300' : 'bg-blue-200'
            }`}
          >
            {pessoa.foto_principal_url ? (
              <img
                src={pessoa.foto_principal_url}
                alt={pessoa.nome_completo}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : isPet ? (
              <Dog className="h-6 w-6 text-amber-700" />
            ) : (
              <User className="h-6 w-6 text-blue-700" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3
                className="min-w-0 flex-1 overflow-hidden text-ellipsis text-sm font-semibold leading-tight text-gray-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                title={pessoa.nome_completo}
              >
                {pessoa.nome_completo}
              </h3>
              {isCentralPerson && (
                <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-white">
                  Você
                </span>
              )}
            </div>

            {secondaryText && (
              <p className="mt-1 truncate text-xs text-gray-600" title={secondaryText}>
                {secondaryText}
              </p>
            )}

            {isPet && (
              <span className="mt-1 inline-block rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-800">
                🐾 Pet
              </span>
            )}

            {isFalecido && !isPet && (
              <span className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                🕊️ In Memoriam
              </span>
            )}
          </div>
        </div>
      </div>

      {renderMenu()}
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
