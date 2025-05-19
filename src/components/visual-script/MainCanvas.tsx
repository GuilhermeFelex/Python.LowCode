// src/components/visual-script/MainCanvas.tsx
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import type { CanvasBlock, Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SquareDashedMousePointer } from 'lucide-react';

interface MainCanvasProps {
  canvasBlocks: CanvasBlock[];
  availableBlocks: Block[]; // Added to pass to ScriptBlock
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onParamChange: (instanceId: string, paramId: string, value: string) => void;
  onRemoveBlock: (instanceId: string) => void;
}

export function MainCanvas({
  canvasBlocks,
  availableBlocks, // Destructure
  onDrop,
  onParamChange,
  onRemoveBlock,
}: MainCanvasProps) {
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move';
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-background p-4 overflow-hidden">
      <header className="pb-4">
        <h1 className="text-2xl font-bold text-primary">Visual Script Canvas</h1>
        <p className="text-sm text-muted-foreground">Construct your Python script by arranging blocks.</p>
      </header>
      <ScrollArea
        className="flex-1 border border-dashed rounded-lg bg-background/70 transition-colors duration-200 hover:border-primary/50"
        onDragOver={handleDragOver}
        onDrop={onDrop} // This onDrop is handleDrop from page.tsx
        aria-label="Main script canvas"
      >
        <div className="p-6 space-y-4 min-h-full"> {/* Ensured min-h-full for consistent drop target */}
          {canvasBlocks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
              <SquareDashedMousePointer className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="text-lg">Drag blocks here to start building your script.</p>
              <p className="text-sm">Arrange them in the order you want them to execute.</p>
            </div>
          )}
          {canvasBlocks.map((canvasBlock) => {
            const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
            if (!blockDefinition) return null;
            return (
              <ScriptBlock
                key={canvasBlock.instanceId}
                blockDefinition={blockDefinition}
                canvasBlockInstance={canvasBlock}
                isPaletteBlock={false}
                onParamChange={onParamChange}
                onRemove={onRemoveBlock}
                // availableBlocks is needed by ScriptBlock for recursive rendering, but it's imported there now.
                // If it wasn't imported, we would pass it: availableBlocks={availableBlocks}
              />
            );
          })}
        </div>
      </ScrollArea>
    </main>
  );
}
