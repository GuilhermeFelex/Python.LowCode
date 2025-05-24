
/**
 * @fileoverview Utilitários gerais.
 * Atualmente, contém apenas a função `cn` para mesclar classes CSS do Tailwind.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Função auxiliar para combinar classes do Tailwind CSS de forma condicional e inteligente.
// `clsx` permite classes condicionais, e `twMerge` resolve conflitos de classes do Tailwind
// (ex: se você tiver 'p-2' e 'p-4', `twMerge` garante que apenas 'p-4' seja aplicado).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
