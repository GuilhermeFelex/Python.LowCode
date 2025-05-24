
// src/components/visual-script/MainCanvas.tsx
/**
 * @fileoverview Componente da área principal (canvas) onde os usuários constroem os scripts.
 * Lida com o "soltar" de blocos e renderiza as instâncias de ScriptBlock.
 */
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import type { CanvasBlock, Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SquareDashedMousePointer } from 'lucide-react';

interface MainCanvasProps {
  canvasBlocks: CanvasBlock[];
  availableBlocks: Block[];
  onBlockDrop: (event: DragEvent<HTMLDivElement>) => void; 
  onParamChange: (instanceId: string, paramId: string, value: string) => void;
  onRemoveBlock: (instanceId: string) => void;
  onToggleBlockCollapse: (instanceId: string) => void;
}

export function MainCanvas({
  canvasBlocks,
  availableBlocks,
  onBlockDrop,
  onParamChange,
  onRemoveBlock,
  onToggleBlockCollapse,
}: MainCanvasProps) {
  
  // Manipulador para o evento onDragOver.
  // Preciso prevenir o comportamento padrão pra permitir o 'drop'.
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    // Verifico se o que está sendo arrastado é um dos nossos blocos.
    const isDraggableBlock = event.dataTransfer.types.some(
      (type) => type.toLowerCase() === 'blocktypeid' || type.toLowerCase() === 'draggedcanvasblockid'
    );
    if (isDraggableBlock) {
      event.preventDefault(); 
      event.dataTransfer.dropEffect = 'move'; // Feedback visual pro usuário.
    } else {
      event.dataTransfer.dropEffect = 'none'; // Não é algo que eu queira soltar aqui.
    }
  };

  // Manipulador para quando algo é solto DIRETAMENTE no canvas (não sobre outro bloco).
  const handleDropOnCanvas = (event: DragEvent<HTMLDivElement>) => {
    const isDraggableBlock = event.dataTransfer.types.some(
      (type) => type.toLowerCase() === 'blocktypeid' || type.toLowerCase() === 'draggedcanvasblockid'
    );
    if (isDraggableBlock) {
      event.preventDefault(); // Evita que o navegador faça algo com o item solto.
      onBlockDrop(event); // Delega a lógica principal pra page.tsx.
    }
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-background p-4 overflow-hidden">
      <header className="pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-primary">Visual Script Canvas</h1>
          <p className="text-sm text-muted-foreground">Construa seu script Python organizando os blocos.</p>
        </div>
      </header>
      <ScrollArea
        className="flex-1 border border-dashed rounded-lg bg-background/70 transition-colors duration-200 hover:border-primary/50"
        onDragOver={handleDragOver}
        onDrop={handleDropOnCanvas} // Soltar na área geral do canvas.
        aria-label="Canvas principal do script"
      >
        <div className="p-6 space-y-4 min-h-full">
          {canvasBlocks.length === 0 && (
            // Mensagem exibida quando o canvas está vazio.
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
              <SquareDashedMousePointer className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="text-lg">Arraste blocos aqui para começar a construir seu script.</p>
              <p className="text-sm">Organize-os na ordem que você quer que executem.</p>
            </div>
          )}
          {canvasBlocks.map((canvasBlock) => {
            // Encontro a definição do bloco pra poder renderizá-lo.
            const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
            if (!blockDefinition) return null; // Se não achar, não renderizo (deve ser raro).
            return (
              <ScriptBlock
                key={canvasBlock.instanceId}
                blockDefinition={blockDefinition}
                canvasBlockInstance={canvasBlock}
                isPaletteBlock={false} // Não é um bloco da paleta, é uma instância no canvas.
                onParamChange={onParamChange}
                onRemove={onRemoveBlock}
                onToggleBlockCollapse={onToggleBlockCollapse}
                onBlockDrop={onBlockDrop} // Passo a função de drop pra lógica de reordenação/aninhamento.
              />
            );
          })}
        </div>
      </ScrollArea>
    </main>
  );
}
