
// src/app/page.tsx
"use client";

import { useState, useEffect, type DragEvent } from 'react';
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
  const [isCodeVisualizerVisible, setIsCodeVisualizerVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) { 
      const code = generatePythonCode(canvasBlocks, AVAILABLE_BLOCKS);
      setGeneratedCode(code);
    }
  }, [canvasBlocks, isClient]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const blockId = event.dataTransfer.getData('blockId');
    const blockType = AVAILABLE_BLOCKS.find(b => b.id === blockId);

    if (!blockType || !isClient) return;

    const initialParams: Record<string, string> = {};
    blockType.parameters.forEach(p => {
      initialParams[p.id] = p.defaultValue;
    });

    const newBlock: CanvasBlock = {
      instanceId: `block_${crypto.randomUUID()}`,
      blockTypeId: blockType.id,
      params: initialParams,
      ...(blockType.canHaveChildren && { children: [] }),
    };

    const targetElement = event.target as HTMLElement;
    const dropZoneElement = targetElement.closest('[data-is-drop-zone="true"]');
    const parentInstanceId = dropZoneElement?.getAttribute('data-instance-id');

    if (parentInstanceId) {
      setCanvasBlocks(prevBlocks => {
        const addRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
          return blocks.map(b => {
            if (b.instanceId === parentInstanceId) {
              const parentDef = AVAILABLE_BLOCKS.find(def => def.id === b.blockTypeId);
              if (parentDef?.canHaveChildren) {
                return { ...b, children: [...(b.children || []), newBlock] };
              }
            }
            if (b.children && b.children.length > 0) {
              return { ...b, children: addRecursive(b.children) };
            }
            return b;
          });
        };
        return addRecursive(prevBlocks);
      });
    } else {
      setCanvasBlocks(prev => [...prev, newBlock]);
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
    const removeRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
      const filteredBlocks = blocks.filter(block => block.instanceId !== instanceId);
      return filteredBlocks.map(block => {
        if (block.children && block.children.length > 0) {
          const updatedChildren = removeRecursive(block.children);
          return { ...block, children: block.children !== undefined ? updatedChildren : undefined };
        }
        return block;
      });
    };
    setCanvasBlocks(prev => removeRecursive(prev));
  };

  const toggleCodeVisualizer = () => {
    setIsCodeVisualizerVisible(prev => !prev);
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
        onDrop={handleDrop}
        onParamChange={handleParamChange}
        onRemoveBlock={handleRemoveBlock}
        isCodeVisualizerVisible={isCodeVisualizerVisible}
        toggleCodeVisualizer={toggleCodeVisualizer}
      />
      {isCodeVisualizerVisible && <CodeVisualizer code={generatedCode} />}
    </div>
  );
}
