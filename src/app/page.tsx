
// src/app/page.tsx
"use client";

import React, { useState, useEffect, type DragEvent, useCallback, useRef } from 'react';
import { BlockPanel } from '@/components/visual-script/BlockPanel';
import { MainCanvas } from '@/components/visual-script/MainCanvas';
import { CodeVisualizer } from '@/components/visual-script/CodeVisualizer';
import type { CanvasBlock } from '@/types/visual-script';
import { AVAILABLE_BLOCKS, generatePythonCode } from '@/lib/visual-script-utils';
import { useToast } from "@/hooks/use-toast";
// import { PanelRightOpen, PanelRightClose } from 'lucide-react'; // No longer needed directly here
import { Button } from '@/components/ui/button';

export default function VisualScriptPage() {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const [codeVisualizerWidth, setCodeVisualizerWidth] = useState(384); // Default width for CodeVisualizer
  const minVisualizerWidth = 200; // Minimum width for CodeVisualizer
  const maxVisualizerWidth = 800; // Maximum width for CodeVisualizer

  const isResizing = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const code = generatePythonCode(canvasBlocks, AVAILABLE_BLOCKS);
      setGeneratedCode(code);
    }
  }, [canvasBlocks, isClient]);

  const findAndRemoveBlockRecursive = useCallback((blocks: CanvasBlock[], idToRemove: string): { updatedBlocks: CanvasBlock[], removedBlock: CanvasBlock | null } => {
    let removedBlock: CanvasBlock | null = null;
    const updatedBlocks = blocks.filter(block => {
      if (block.instanceId === idToRemove) {
        removedBlock = block;
        return false; 
      }
      if (block.children && !removedBlock) { 
        const result = findAndRemoveBlockRecursive(block.children, idToRemove);
        if (result.removedBlock) {
          removedBlock = result.removedBlock;
          block.children = result.updatedBlocks; 
        }
      }
      return true; 
    });
    return { updatedBlocks, removedBlock };
  }, []);
  
  const insertIntoChildrenRecursive = useCallback((blocks: CanvasBlock[], parentId: string, blockToInsert: CanvasBlock): CanvasBlock[] => {
    return blocks.map(block => {
      if (block.instanceId === parentId) {
        const parentDef = AVAILABLE_BLOCKS.find(b => b.id === block.blockTypeId);
        if (parentDef?.canHaveChildren) {
          return {
            ...block,
            children: [...(block.children || []), blockToInsert],
            isCollapsed: false, 
          };
        }
      }
      if (block.children) {
        return { ...block, children: insertIntoChildrenRecursive(block.children, parentId, blockToInsert) };
      }
      return block;
    });
  }, []);

  const insertBeforeRecursive = useCallback((blocks: CanvasBlock[], targetId: string, blockToInsert: CanvasBlock): { newBlocks: CanvasBlock[], inserted: boolean } => {
    let inserted = false;
    const newBlocks: CanvasBlock[] = [];
    for (const block of blocks) {
      if (block.instanceId === targetId && !inserted) {
        newBlocks.push(blockToInsert);
        inserted = true;
      }
      if (block.children && !inserted) { 
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


  const handleBlockDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isClient) return;

    const newBlockTypeId = event.dataTransfer.getData('blockTypeId');
    const draggedInstanceId = event.dataTransfer.getData('draggedCanvasBlockId');

    const target = event.target as HTMLElement;
    const dropZoneElement = target.closest<HTMLElement>('[data-is-drop-zone="true"]');
    const parentDropZoneInstanceId = dropZoneElement?.dataset.instanceId;
    
    let directDropOnBlockInstanceId: string | undefined = undefined;
    const potentialTargetCard = target.closest<HTMLElement>('[data-instance-id]:not([data-is-drop-zone="true"])');
    if (potentialTargetCard) {
        directDropOnBlockInstanceId = potentialTargetCard.dataset.instanceId;
    }

    setCanvasBlocks(prevBlocks => {
      if (newBlockTypeId) { 
        const blockType = AVAILABLE_BLOCKS.find(b => b.id === newBlockTypeId);
        if (!blockType) return prevBlocks;

        const initialParams: Record<string, string> = {};
        blockType.parameters.forEach(p => {
          initialParams[p.id] = p.defaultValue;
        });

        const newBlock: CanvasBlock = {
          instanceId: `block_${crypto.randomUUID()}`,
          blockTypeId: blockType.id,
          params: initialParams,
          isCollapsed: false,
          ...(blockType.canHaveChildren && { children: [] }),
        };

        if (parentDropZoneInstanceId) {
          return insertIntoChildrenRecursive(prevBlocks, parentDropZoneInstanceId, newBlock);
        } else if (directDropOnBlockInstanceId && directDropOnBlockInstanceId !== newBlock.instanceId) {
            const result = insertBeforeRecursive(prevBlocks, directDropOnBlockInstanceId, newBlock);
            return result.inserted ? result.newBlocks : [...prevBlocks, newBlock];
        } else {
          return [...prevBlocks, newBlock];
        }

      } else if (draggedInstanceId) { 
        if (draggedInstanceId === parentDropZoneInstanceId || draggedInstanceId === directDropOnBlockInstanceId) {
          return prevBlocks; 
        }

        const { updatedBlocks: blocksAfterRemoval, removedBlock } = findAndRemoveBlockRecursive(prevBlocks, draggedInstanceId);
        if (!removedBlock) return prevBlocks; 

        if (parentDropZoneInstanceId) {
          return insertIntoChildrenRecursive(blocksAfterRemoval, parentDropZoneInstanceId, removedBlock);
        } else if (directDropOnBlockInstanceId) {
           const result = insertBeforeRecursive(blocksAfterRemoval, directDropOnBlockInstanceId, removedBlock);
           return result.inserted ? result.newBlocks : [...blocksAfterRemoval, removedBlock]; 
        } else { 
          return [...blocksAfterRemoval, removedBlock];
        }
      }
      return prevBlocks;
    });
  }, [isClient, findAndRemoveBlockRecursive, insertIntoChildrenRecursive, insertBeforeRecursive]);


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

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast({
        title: "Code Copied!",
        description: "The Python code has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy code to clipboard.",
        variant: "destructive",
      });
    }
  }, [generatedCode, toast]);

  const handleSaveToFile = useCallback(() => {
    try {
      const blob = new Blob([generatedCode], { type: 'text/python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visual_script.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "File Saved!",
        description: "The Python code has been downloaded as visual_script.py.",
      });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: "Could not save the code to a file.",
        variant: "destructive",
      });
    }
  }, [generatedCode, toast]);

  const handleMouseDownOnResizer = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isClient) return;
    event.preventDefault();
    isResizing.current = true;
    dragStartX.current = event.clientX;
    dragStartWidth.current = codeVisualizerWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isClient, codeVisualizerWidth]);

  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (event: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = event.clientX - dragStartX.current;
        let newWidth = dragStartWidth.current - dx; 
        newWidth = Math.max(minVisualizerWidth, Math.min(newWidth, maxVisualizerWidth));
        setCodeVisualizerWidth(newWidth);
    };

    const handleMouseUp = () => {
        if (!isResizing.current) return;
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
  }, [isClient, minVisualizerWidth, maxVisualizerWidth]);


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
          aria-label="Resize code visualizer panel"
          title="Resize panel"
        >
          <div className="w-0.5 h-8 bg-transparent group-hover:bg-primary/30 rounded-full transition-colors duration-150"></div>
        </div>
        <CodeVisualizer code={generatedCode} width={codeVisualizerWidth} />
      </>
    </div>
  );
}
