
// src/app/page.tsx
"use client";

import { useState, useEffect, type DragEvent } from 'react';
import { BlockPanel } from '@/components/visual-script/BlockPanel';
import { MainCanvas } from '@/components/visual-script/MainCanvas';
import { CodeVisualizer } from '@/components/visual-script/CodeVisualizer';
import type { CanvasBlock } from '@/types/visual-script';
import { AVAILABLE_BLOCKS, generatePythonCode } from '@/lib/visual-script-utils';

export default function VisualScriptPage() {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isCodeVisualizerVisible, setIsCodeVisualizerVisible] = useState(true);

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

  if (!isClient) {
    return null; 
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background text-foreground">
      <BlockPanel availableBlocks={AVAILABLE_BLOCKS} />
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
