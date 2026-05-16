type WhatsAppContactInput = {
  telefone?: string | null;
  permitir_exibir_telefone?: boolean | null;
  permitir_mensagens_whatsapp?: boolean | null;
};

export function normalizePhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) return null;

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  return digits;
}

export function hasValidWhatsAppPhone(phone?: string | null): boolean {
  return Boolean(normalizePhoneForWhatsApp(String(phone ?? '')));
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  if (!normalizedPhone) return null;

  const baseUrl = `https://wa.me/${normalizedPhone}`;
  const trimmedMessage = message?.trim();

  if (!trimmedMessage) return baseUrl;

  return `${baseUrl}?text=${encodeURIComponent(trimmedMessage)}`;
}

export function canUseWhatsAppContact(input: WhatsAppContactInput): boolean {
  return Boolean(
    hasValidWhatsAppPhone(input.telefone) &&
    (input.permitir_exibir_telefone === true || input.permitir_mensagens_whatsapp === true)
  );
}
