
// src/app/page.tsx
/**
 * @fileoverview Componente principal da página Visual Script.
 * Gerencia o estado dos blocos no canvas, a lógica de arrastar e soltar,
 * a geração de código Python e a interação entre os painéis.
 */
"use client";

import React, { useState, useEffect, type DragEvent, useCallback, useRef } from 'react';
import { BlockPanel } from '@/components/visual-script/BlockPanel';
import { MainCanvas } from '@/components/visual-script/MainCanvas';
import { CodeVisualizer } from '@/components/visual-script/CodeVisualizer';
import type { CanvasBlock } from '@/types/visual-script';
import { AVAILABLE_BLOCKS, generatePythonCode } from '@/lib/visual-script-utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';

export default function VisualScriptPage() {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const [codeVisualizerWidth, setCodeVisualizerWidth] = useState(384); // Largura padrão pro CodeVisualizer
  const minVisualizerWidth = 200; // Largura mínima que achei razoável
  const maxVisualizerWidth = 800; // E a máxima, pra não tomar a tela toda

  const isResizing = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    // Isso garante que certas operações só rodem no cliente, evitando problemas de hidratação.
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Gero o código Python sempre que os blocos no canvas mudam.
      const code = generatePythonCode(canvasBlocks, AVAILABLE_BLOCKS);
      setGeneratedCode(code);
    }
  }, [canvasBlocks, isClient]);

  // Função recursiva para encontrar e remover um bloco, não importa o quão aninhado ele esteja.
  const findAndRemoveBlockRecursive = useCallback((blocks: CanvasBlock[], idToRemove: string): { updatedBlocks: CanvasBlock[], removedBlock: CanvasBlock | null } => {
    let removedBlock: CanvasBlock | null = null;
    const updatedBlocks = blocks.filter(block => {
      if (block.instanceId === idToRemove) {
        removedBlock = block; // Achei! Marco pra remover.
        return false; 
      }
      if (block.children && !removedBlock) { 
        // Se tiver filhos e ainda não achei, busco recursivamente nos filhos.
        const result = findAndRemoveBlockRecursive(block.children, idToRemove);
        if (result.removedBlock) {
          removedBlock = result.removedBlock;
          block.children = result.updatedBlocks; // Atualizo a lista de filhos do bloco pai.
        }
      }
      return true; 
    });
    return { updatedBlocks, removedBlock };
  }, []);
  
  // Função recursiva para inserir um bloco como filho de um bloco pai específico.
  const insertIntoChildrenRecursive = useCallback((blocks: CanvasBlock[], parentId: string, blockToInsert: CanvasBlock): CanvasBlock[] => {
    return blocks.map(block => {
      if (block.instanceId === parentId) {
        const parentDef = AVAILABLE_BLOCKS.find(b => b.id === block.blockTypeId);
        if (parentDef?.canHaveChildren) {
          // Encontrei o pai, adiciono o novo bloco aos seus filhos.
          // Também garanto que o pai não esteja colapsado, pra mostrar o novo filho.
          return {
            ...block,
            children: [...(block.children || []), blockToInsert],
            isCollapsed: false, 
          };
        }
      }
      if (block.children) {
        // Se não for o pai, mas tiver filhos, continuo buscando recursivamente.
        return { ...block, children: insertIntoChildrenRecursive(block.children, parentId, blockToInsert) };
      }
      return block;
    });
  }, []);

  // Função recursiva para inserir um bloco ANTES de um bloco alvo específico.
  const insertBeforeRecursive = useCallback((blocks: CanvasBlock[], targetId: string, blockToInsert: CanvasBlock): { newBlocks: CanvasBlock[], inserted: boolean } => {
    let inserted = false;
    const newBlocks: CanvasBlock[] = [];
    for (const block of blocks) {
      if (block.instanceId === targetId && !inserted) {
        // Encontrei o alvo, insiro o novo bloco ANTES dele.
        newBlocks.push(blockToInsert);
        inserted = true;
      }
      if (block.children && !inserted) { 
        // Se tiver filhos e ainda não inseri, busco recursivamente.
        const childResult = insertBeforeRecursive(block.children, targetId, blockToInsert);
        if (childResult.inserted) {
          newBlocks.push({ ...block, children: childResult.newBlocks });
          inserted = true; 
        } else {
          newBlocks.push(block); 
        }
      } else {
         newBlocks.push(block); 
      }
    }
    return { newBlocks, inserted };
  }, []);


  // Manipulador principal para quando um bloco é solto no canvas.
  const handleBlockDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isClient) return; // Só executo no cliente.

    const newBlockTypeId = event.dataTransfer.getData('blockTypeId'); // ID do tipo de bloco (se arrastado da paleta)
    const draggedInstanceId = event.dataTransfer.getData('draggedCanvasBlockId'); // ID da instância (se reordenando)

    const target = event.target as HTMLElement;
    // Tento encontrar se foi solto numa "drop zone" de um bloco pai.
    const dropZoneElement = target.closest<HTMLElement>('[data-is-drop-zone="true"]');
    const parentDropZoneInstanceId = dropZoneElement?.dataset.instanceId;
    
    let directDropOnBlockInstanceId: string | undefined = undefined;
    // Tento encontrar se foi solto diretamente sobre outro bloco (para inserir antes).
    const potentialTargetCard = target.closest<HTMLElement>('[data-instance-id]:not([data-is-drop-zone="true"])');
    if (potentialTargetCard) {
        directDropOnBlockInstanceId = potentialTargetCard.dataset.instanceId;
    }

    setCanvasBlocks(prevBlocks => {
      if (newBlockTypeId) { 
        // Cenário 1: Arrastando um NOVO bloco da paleta.
        const blockType = AVAILABLE_BLOCKS.find(b => b.id === newBlockTypeId);
        if (!blockType) return prevBlocks; // Tipo de bloco inválido.

        // Crio os parâmetros iniciais pro novo bloco.
        const initialParams: Record<string, string> = {};
        blockType.parameters.forEach(p => {
          initialParams[p.id] = p.defaultValue;
        });

        const newBlock: CanvasBlock = {
          instanceId: `block_${crypto.randomUUID()}`, // ID único pra instância.
          blockTypeId: blockType.id,
          params: initialParams,
          isCollapsed: false, // Começa expandido.
          ...(blockType.canHaveChildren && { children: [] }), // Se pode ter filhos, inicializa a lista.
        };

        if (parentDropZoneInstanceId) {
          // Soltou na área de filhos de um pai.
          return insertIntoChildrenRecursive(prevBlocks, parentDropZoneInstanceId, newBlock);
        } else if (directDropOnBlockInstanceId && directDropOnBlockInstanceId !== newBlock.instanceId) {
            // Soltou sobre outro bloco, insiro antes.
            const result = insertBeforeRecursive(prevBlocks, directDropOnBlockInstanceId, newBlock);
            return result.inserted ? result.newBlocks : [...prevBlocks, newBlock]; // Fallback se a inserção falhar.
        } else {
          // Soltou na área principal do canvas.
          return [...prevBlocks, newBlock];
        }

      } else if (draggedInstanceId) { 
        // Cenário 2: REORDENANDO um bloco existente no canvas.
        if (draggedInstanceId === parentDropZoneInstanceId || draggedInstanceId === directDropOnBlockInstanceId) {
          return prevBlocks; // Evito soltar um bloco nele mesmo ou em sua própria drop zone.
        }

        // Primeiro, encontro e removo o bloco da sua posição original.
        const { updatedBlocks: blocksAfterRemoval, removedBlock } = findAndRemoveBlockRecursive(prevBlocks, draggedInstanceId);
        if (!removedBlock) return prevBlocks; // Não deveria acontecer, mas por segurança.

        if (parentDropZoneInstanceId) {
          // Soltou na área de filhos de um pai.
          return insertIntoChildrenRecursive(blocksAfterRemoval, parentDropZoneInstanceId, removedBlock);
        } else if (directDropOnBlockInstanceId) {
           // Soltou sobre outro bloco, insiro antes.
           const result = insertBeforeRecursive(blocksAfterRemoval, directDropOnBlockInstanceId, removedBlock);
           return result.inserted ? result.newBlocks : [...blocksAfterRemoval, removedBlock]; // Fallback.
        } else { 
          // Soltou na área principal do canvas, adiciono ao final da lista raiz.
          return [...blocksAfterRemoval, removedBlock];
        }
      }
      return prevBlocks; // Caso nenhuma condição seja atendida.
    });
  }, [isClient, findAndRemoveBlockRecursive, insertIntoChildrenRecursive, insertBeforeRecursive]);


  // Atualiza o valor de um parâmetro de um bloco.
  const handleParamChange = useCallback((instanceId: string, paramId: string, value: string) => {
    const updateRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
      return blocks.map(block => {
        if (block.instanceId === instanceId) {
          return { ...block, params: { ...block.params, [paramId]: value } };
        }
        if (block.children && block.children.length > 0) {
          return { ...block, children: updateRecursive(block.children) };
        }
        return block;
      });
    };
    setCanvasBlocks(prev => updateRecursive(prev));
  }, []);

  // Remove um bloco do canvas.
  const handleRemoveBlock = useCallback((instanceId: string) => {
    const removeRecursive = (blocks: CanvasBlock[]): { updatedBlocks: CanvasBlock[], blockFound: boolean } => {
      let blockFound = false;
      const updatedBlocks = blocks.filter(block => {
        if (block.instanceId === instanceId) {
          blockFound = true;
          return false;
        }
        if (block.children && block.children.length > 0) {
          const result = removeRecursive(block.children);
          block.children = result.updatedBlocks;
          if (result.blockFound) blockFound = true;
        }
        return true;
      });
      return { updatedBlocks, blockFound };
    };
    setCanvasBlocks(prev => removeRecursive(prev).updatedBlocks);
  }, []);

  // Alterna o estado de colapso (minimizado/expandido) de um bloco.
  const handleToggleBlockCollapse = useCallback((instanceId: string) => {
    const toggleRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
      return blocks.map(block => {
        if (block.instanceId === instanceId) {
          return { ...block, isCollapsed: !block.isCollapsed };
        }
        if (block.children && block.children.length > 0) {
          return { ...block, children: toggleRecursive(block.children) };
        }
        return block;
      });
    };
    setCanvasBlocks(prev => toggleRecursive(prev));
  }, []);

  // Copia o código gerado para a área de transferência.
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast({
        title: "Código Copiado!",
        description: "O código Python foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000); // Reseta o estado 'copiado' após 2s.
    } catch (err) {
      toast({
        title: "Falha ao Copiar",
        description: "Não foi possível copiar o código para a área de transferência.",
        variant: "destructive",
      });
    }
  }, [generatedCode, toast]);

  // Salva o código gerado em um arquivo .py.
  const handleSaveToFile = useCallback(() => {
    try {
      const blob = new Blob([generatedCode], { type: 'text/python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visual_script.py'; // Nome do arquivo.
      document.body.appendChild(a);
      a.click(); // Simula o clique pra iniciar o download.
      document.body.removeChild(a); // Limpa o elemento 'a'.
      URL.revokeObjectURL(url); // Libera o objeto URL.
      toast({
        title: "Arquivo Salvo!",
        description: "O código Python foi baixado como visual_script.py.",
      });
    } catch (err) {
      toast({
        title: "Falha ao Salvar",
        description: "Não foi possível salvar o código em um arquivo.",
        variant: "destructive",
      });
    }
  }, [generatedCode, toast]);

  // Inicia o redimensionamento do painel CodeVisualizer.
  const handleMouseDownOnResizer = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isClient) return;
    event.preventDefault();
    isResizing.current = true;
    dragStartX.current = event.clientX; // Posição X inicial do mouse.
    dragStartWidth.current = codeVisualizerWidth; // Largura inicial do painel.

    document.body.style.cursor = 'col-resize'; // Muda o cursor pra indicar redimensionamento.
    document.body.style.userSelect = 'none'; // Evita seleção de texto durante o arraste.
  }, [isClient, codeVisualizerWidth]);

  // Lógica de redimensionamento enquanto o mouse se move.
  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (event: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = event.clientX - dragStartX.current; // Diferença de movimento do mouse.
        let newWidth = dragStartWidth.current - dx; // Calcula nova largura (invertido por ser painel da direita).
        // Garanto que a nova largura esteja dentro dos limites min/max.
        newWidth = Math.max(minVisualizerWidth, Math.min(newWidth, maxVisualizerWidth));
        setCodeVisualizerWidth(newWidth);
    };

    const handleMouseUp = () => {
        if (!isResizing.current) return;
        isResizing.current = false;
        // Reseta o cursor e a seleção de texto.
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    // Adiciono os listeners ao documento pra capturar o movimento fora do elemento resizer.
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Limpeza: removo os listeners quando o componente desmontar ou as dependências mudarem.
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
  }, [isClient, minVisualizerWidth, maxVisualizerWidth]);


  // Se não for cliente ainda (SSR), não renderizo nada pra evitar erros de hidratação.
  if (!isClient) {
    return null;
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background text-foreground">
      <BlockPanel
        availableBlocks={AVAILABLE_BLOCKS}
        onCopyCode={handleCopyCode}
        onSaveFile={handleSaveToFile}
        isCodeCopied={copied}
      />
      <MainCanvas
        canvasBlocks={canvasBlocks}
        availableBlocks={AVAILABLE_BLOCKS}
        onBlockDrop={handleBlockDrop}
        onParamChange={handleParamChange}
        onRemoveBlock={handleRemoveBlock}
        onToggleBlockCollapse={handleToggleBlockCollapse}
      />
      <>
        <div
          className="w-1 cursor-col-resize bg-border hover:bg-primary/10 transition-colors flex items-center justify-center group"
          onMouseDown={handleMouseDownOnResizer}
          role="separator"
          aria-label="Redimensionar painel do visualizador de código"
          title="Redimensionar painel"
        >
          {/* Pequeno indicador visual no centro da barra de redimensionamento */}
          <div className="w-0.5 h-8 bg-transparent group-hover:bg-primary/30 rounded-full transition-colors duration-150"></div>
        </div>
        <CodeVisualizer code={generatedCode} width={codeVisualizerWidth} />
      </>
    </div>
  );
}
