/**
 * Aplica máscara de telefone no formato (XX) XXXXX-XXXX
 */
export function formatarTelefone(valor: string): string {
  // Remove tudo que não é dígito
  const numeros = valor.replace(/\D/g, '');
  
  // Aplica a máscara
  if (numeros.length <= 2) {
    return numeros;
  } else if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  } else if (numeros.length <= 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }
  
  // Limita a 11 dígitos
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

/**
 * Remove a máscara do telefone, deixando apenas números
 */
export function limparTelefone(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Valida se o telefone tem formato válido
 */
export function validarTelefone(valor: string): boolean {
  const numeros = limparTelefone(valor);
  return numeros.length === 10 || numeros.length === 11;
}
