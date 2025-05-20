
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
  const [isCodeVisualizerVisible, setIsCodeVisualizerVisible] = useState(true);

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

  const toggleCodeVisualizer = () => {
    setIsCodeVisualizerVisible(prev => !prev);
  };

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
                  isCollapsed: false, 
                };
              }
            }
            if (block.children && block.children.length > 0) {
              return { ...block, children: addRecursive(block.children) };
            }
            return block;
          });
        };
        
        // My check to see if the block was actually added to a child or needs to go to root
        const originalBlocksJson = JSON.stringify(prevBlocks);
        const updatedBlocks = addRecursive(prevBlocks);

        // If updatedBlocks is same as original, and there was no specific dropZone target,
        // it means we tried to drop on a child area but it wasn't a valid one,
        // or it was a block that cannot have children but was somehow marked as drop zone (should not happen with current logic).
        // OR, if the dropZone was the canvas itself (no parentInstanceId), this condition won't apply.
        // This check primarily ensures that if a child drop fails to nest, it doesn't just vanish.
        // However, the primary logic for adding to root if not parentInstanceId is below.
        if (JSON.stringify(updatedBlocks) === originalBlocksJson) {
          // This can happen if we drop on a block that *is* a drop zone but for some reason
          // the block doesn't get added (e.g. parentDef.canHaveChildren was false, which it shouldn't be for a drop zone)
          // OR if we drop on the main canvas directly (dropZone might be null or the canvas itself)
          // The `else` part below handles adding to the root if parentInstanceId is falsy.
          // If parentInstanceId existed but block wasn't added, it might mean it was dropped on a block that isn't a valid parent.
          // Let's ensure it goes to the root if dropZone is not a valid child drop target.
           if (!dropZone) { // If no specific drop zone, add to root. This means it was dropped on main canvas padding.
             return [...prevBlocks, newBlock];
          }
          // If dropZone existed but addRecursive didn't change anything, it implies an issue or non-nestable target.
          // For robustness, let's only add to root if dropZone.dataset.isCanvasRoot or similar, or if no dropZone.
          // For now, if it's a specific child drop zone and fails, we rely on addRecursive not adding.
          // Adding to root if parentInstanceId was present but addRecursive failed is not intended here.
          return updatedBlocks; // Return what addRecursive did, even if it's no change.
        }
        return updatedBlocks;
      });
    } else {
      // This is the case for dropping directly onto the main canvas (not a child zone)
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

  // Handler for mousedown on the resizer
  const handleMouseDownOnResizer = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isClient) return;
    event.preventDefault(); // Prevent text selection during drag
    isResizing.current = true;
    dragStartX.current = event.clientX;
    dragStartWidth.current = codeVisualizerWidth;

    // Apply styles to body to improve resize experience
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection globally
  }, [isClient, codeVisualizerWidth]);

  // Effect for handling mousemove and mouseup on the document
  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (event: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = event.clientX - dragStartX.current;
        // Corrected logic: dragging left should decrease panel width, dragging right should increase.
        // This interpretation is for a right-side panel being resized from its left edge.
        // If CodeVisualizer is on the right, moving mouse left means dx is negative.
        // newWidth = dragStartWidth - dx. If dx is -50 (mouse moved left), newWidth = startWidth - (-50) = startWidth + 50.
        // This makes the right panel (CodeVisualizer) wider.
        // If dx is +50 (mouse moved right), newWidth = startWidth - 50.
        // This makes the right panel (CodeVisualizer) narrower.
        // This is correct for resizing the right panel from its left edge.
        let newWidth = dragStartWidth.current - dx; // My fix for the resize direction.
        newWidth = Math.max(minVisualizerWidth, Math.min(newWidth, maxVisualizerWidth));
        setCodeVisualizerWidth(newWidth);
    };

    const handleMouseUp = () => {
        if (!isResizing.current) return;
        isResizing.current = false;
        // Reset body styles
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    // Add event listeners to the document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup function to remove event listeners
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Ensure styles are reset if component unmounts while resizing
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
  }, [isClient, minVisualizerWidth, maxVisualizerWidth]); // Dependencies include state used in handlers


  if (!isClient) {
    // Return a simple loading state or null to prevent hydration mismatch issues
    return null; // Or a loading skeleton
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
        isCodeVisualizerVisible={isCodeVisualizerVisible}
        toggleCodeVisualizer={toggleCodeVisualizer}
      />
      {isCodeVisualizerVisible && (
        <>
          <div 
            className="w-1 cursor-col-resize bg-border hover:bg-primary/10 transition-colors flex items-center justify-center group"
            onMouseDown={handleMouseDownOnResizer}
            role="separator"
            aria-label="Resize code visualizer panel"
            title="Resize panel"
          >
            {/* Visual indicator for the resizer handle */}
            <div className="w-0.5 h-8 bg-transparent group-hover:bg-primary/30 rounded-full transition-colors duration-150"></div>
          </div>
          <CodeVisualizer code={generatedCode} width={codeVisualizerWidth} />
        </>
      )}
    </div>
  );
}

