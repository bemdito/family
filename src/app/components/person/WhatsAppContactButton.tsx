import { MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buildWhatsAppUrl, canUseWhatsAppContact } from '../../utils/whatsapp';
import { buttonVariants } from '../ui/button';

type WhatsAppContactButtonProps = {
  telefone?: string | null;
  permitirExibirTelefone?: boolean | null;
  permitirMensagensWhatsApp?: boolean | null;
  personId?: string | null;
  personName?: string | null;
  className?: string;
  showIcon?: boolean;
  logClick?: boolean;
};

export function WhatsAppContactButton({
  telefone,
  permitirExibirTelefone,
  permitirMensagensWhatsApp,
  className,
  showIcon = true,
}: WhatsAppContactButtonProps) {
  const canContact = canUseWhatsAppContact({
    telefone,
    permitir_exibir_telefone: permitirExibirTelefone,
    permitir_mensagens_whatsapp: permitirMensagensWhatsApp,
  });

  if (!canContact) return null;

  const href = buildWhatsAppUrl(String(telefone ?? ''));
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Entrar em contato por WhatsApp"
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full gap-2 sm:w-auto', className)}
    >
      {showIcon && <MessageCircle className="h-4 w-4" aria-hidden="true" />}
      <span>Entrar em contato por WhatsApp</span>
    </a>
  );
}
