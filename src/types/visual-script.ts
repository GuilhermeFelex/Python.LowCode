
/**
 * @fileoverview Definições de tipo TypeScript para a aplicação Visual Script.
 * Descreve as estruturas de dados para blocos, instâncias de blocos no canvas e parâmetros.
 */
import type { LucideProps } from 'lucide-react'; // Tipos para os ícones Lucide.
import type React from 'react'; // Tipos do React.

// Define a estrutura de um parâmetro de um bloco.
export interface ParameterDefinition {
  id: string; // Identificador único do parâmetro dentro do bloco.
  name: string; // Nome amigável do parâmetro, exibido na UI. Usei 'name' em vez de 'label' pra padronizar.
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'password'; // Tipos de input suportados.
  defaultValue: string; // Valor padrão do parâmetro.
  placeholder?: string; // Texto de placeholder para o campo de input.
  options?: { value: string; label: string }[]; // Opções para o tipo 'select'.
  // Condição para exibir este parâmetro, baseada no valor de outro parâmetro do mesmo bloco.
  condition?: { paramId: string; paramValue: string | string[] }; // paramValue pode ser um valor único ou uma lista de valores.
}

// Define a estrutura de um TIPO de bloco (a definição do bloco na paleta).
export interface Block {
  id:string; // Identificador único do tipo de bloco.
  name: string; // Nome do bloco exibido na UI.
  description?: string; // Descrição curta do que o bloco faz.
  icon: React.FC<LucideProps>; // Componente do ícone Lucide para o bloco.
  parameters: ParameterDefinition[]; // Lista de parâmetros que este bloco aceita.
  codeTemplate: (params: Record<string, string>) => string; // Função que gera o código Python para este bloco.
  category: string; // Categoria do bloco (ex: "Output", "Logic").
  canHaveChildren?: boolean; // True se este bloco pode conter outros blocos aninhados (ex: um loop).
}

// Define a estrutura de uma INSTÂNCIA de bloco no canvas.
export interface CanvasBlock {
  instanceId: string; // Identificador único desta instância específica do bloco no canvas.
  blockTypeId: string; // ID do tipo de bloco (referencia `Block.id`).
  params: Record<string, string>; // Valores atuais dos parâmetros para esta instância.
  children?: CanvasBlock[]; // Lista de blocos filhos aninhados, se `Block.canHaveChildren` for true.
  isCollapsed?: boolean; // True se o bloco no canvas estiver recolhido/minimizado.
  // Poderia adicionar x, y aqui se fosse implementar um canvas de forma livre, mas por enquanto é sequencial.
}
