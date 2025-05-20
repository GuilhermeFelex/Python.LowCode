
// src/app/page.tsx
"use client";

import { useState, useEffect, type DragEvent, useCallback, useRef } from 'react';
import { BlockPanel } from '@/components/visual-script/BlockPanel';
import { MainCanvas } from '@/components/visual-script/MainCanvas';
import { CodeVisualizer } from '@/components/visual-script/CodeVisualizer';
import type { CanvasBlock } from '@/types/visual-script';
import { AVAILABLE_BLOCKS, generatePythonCode } from '@/lib/visual-script-utils';
import { useToast } from "@/hooks/use-toast";

export default function VisualScriptPage() {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const [codeVisualizerWidth, setCodeVisualizerWidth] = useState(384); 
  const minVisualizerWidth = 200; 
  const maxVisualizerWidth = 800; 

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

  const handleBlockDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const blockTypeId = event.dataTransfer.getData('blockTypeId');
    if (!blockTypeId || !isClient) return;

    const blockType = AVAILABLE_BLOCKS.find(b => b.id === blockTypeId);
    if (!blockType) return;

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

    const target = event.target as HTMLElement;
    const dropZone = target.closest<HTMLElement>('[data-is-drop-zone="true"]');
    const parentInstanceId = dropZone?.dataset.instanceId;

    if (parentInstanceId) {
      setCanvasBlocks(prevBlocks => {
        const addRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
          return blocks.map(block => {
            if (block.instanceId === parentInstanceId) {
              const parentDef = AVAILABLE_BLOCKS.find(b => b.id === block.blockTypeId);
              if (parentDef?.canHaveChildren) {
                return {
                  ...block,
                  children: [...(block.children || []), newBlock],
                  isCollapsed: false, // Ensure parent expands when child is added
                };
              }
            }
            if (block.children && block.children.length > 0) {
              return { ...block, children: addRecursive(block.children) };
            }
            return block;
          });
        };
        
        const originalBlocksJson = JSON.stringify(prevBlocks);
        const updatedBlocks = addRecursive(prevBlocks);

        if (JSON.stringify(updatedBlocks) === originalBlocksJson) {
          // If parentInstanceId was set, it means a specific child drop zone was targeted.
          // If addRecursive didn't change anything, it means the block wasn't added to that child.
          // We should not add it to the root in this case. We just return the original blocks.
          if (!dropZone) { 
             return [...prevBlocks, newBlock];
          }
          return updatedBlocks; 
        }
        return updatedBlocks;
      });
    } else {
      // No parentInstanceId means the drop was on the main canvas background.
      setCanvasBlocks(prevBlocks => [...prevBlocks, newBlock]);
    }
  };

  const handleParamChange = (instanceId: string, paramId: string, value: string) => {
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
  };

  const handleRemoveBlock = (instanceId: string) => {
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
  };

  const handleToggleBlockCollapse = (instanceId: string) => {
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
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast({
        title: "Code Copied!",
        description: "The Python code has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
      toast({
        title: "Copy Failed",
        description: "Could not copy code to clipboard. See console for details.",
        variant: "destructive",
      });
    }
  };

  const handleSimulate = () => {
    console.log("--- Simulating Script Execution ---");
    console.log(generatedCode);
    console.log("--- Simulation End ---");
    toast({
      title: "Simulation Started",
      description: "Check the browser console for simulated output.",
    });
  };

  const handleSaveToFile = () => {
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
      console.error('Failed to save file: ', err);
      toast({
        title: "Save Failed",
        description: "Could not save the code to a file. See console for details.",
        variant: "destructive",
      });
    }
  };

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
        let newWidth = dragStartWidth.current - dx; // My fix for the resize direction.
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
        onSimulate={handleSimulate}
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
    </div>
  );
}

