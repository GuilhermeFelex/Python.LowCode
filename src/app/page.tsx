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

  useEffect(() => {
    setIsClient(true); // Ensures crypto.randomUUID is called client-side
  }, []);

  useEffect(() => {
    const code = generatePythonCode(canvasBlocks, AVAILABLE_BLOCKS);
    setGeneratedCode(code);
  }, [canvasBlocks]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const blockId = event.dataTransfer.getData('blockId');
    const blockType = AVAILABLE_BLOCKS.find(b => b.id === blockId);

    if (blockType && isClient) { // Ensure isClient before using crypto
      const initialParams: Record<string, string> = {};
      blockType.parameters.forEach(p => {
        initialParams[p.id] = p.defaultValue;
      });

      const newBlock: CanvasBlock = {
        instanceId: `block_${crypto.randomUUID()}`, // Use crypto.randomUUID
        blockTypeId: blockType.id,
        params: initialParams,
      };
      setCanvasBlocks(prev => [...prev, newBlock]);
    }
  };

  const handleParamChange = (instanceId: string, paramId: string, value: string) => {
    setCanvasBlocks(prev => prev.map(block =>
      block.instanceId === instanceId
        ? { ...block, params: { ...block.params, [paramId]: value } }
        : block
    ));
  };

  const handleRemoveBlock = (instanceId: string) => {
    setCanvasBlocks(prev => prev.filter(block => block.instanceId !== instanceId));
  };

  if (!isClient) {
    // Optional: render a loading state or null until client is confirmed
    // This helps avoid hydration mismatches if crypto.randomUUID was used during SSR (though it's in an event handler here)
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
      />
      <CodeVisualizer code={generatedCode} />
    </div>
  );
}
