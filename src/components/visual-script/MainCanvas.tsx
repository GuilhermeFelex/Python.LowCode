// src/components/visual-script/MainCanvas.tsx
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import type { CanvasBlock, Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MainCanvasProps {
  canvasBlocks: CanvasBlock[];
  availableBlocks: Block[];
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onParamChange: (instanceId: string, paramId: string, value: string) => void;
  onRemoveBlock: (instanceId: string) => void;
}

export function MainCanvas({
  canvasBlocks,
  availableBlocks,
  onDrop,
  onParamChange,
  onRemoveBlock,
}: MainCanvasProps) {
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = 'move';
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-background p-4 overflow-hidden">
      <header className="pb-4">
        <h1 className="text-2xl font-bold text-primary">Visual Script Canvas</h1>
        <p className="text-sm text-muted-foreground">Construct your Python script by arranging blocks.</p>
      </header>
      <ScrollArea
        className="flex-1 border border-dashed rounded-lg bg-background transition-colors duration-200 hover:border-primary/50"
        onDragOver={handleDragOver}
        onDrop={onDrop}
        aria-label="Main script canvas"
      >
        <div className="p-6 space-y-4 min-h-[200px]"> {/* Added min-h for better drop target visibility */}
          {canvasBlocks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
              <PuzzleIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Drag blocks here to start building your script.</p>
              <p className="text-sm">Arrange them in the order you want them to execute.</p>
            </div>
          )}
          {canvasBlocks.map((canvasBlock) => {
            const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
            if (!blockDefinition) return null; // Should not happen if data is consistent
            return (
              <ScriptBlock
                key={canvasBlock.instanceId}
                blockDefinition={blockDefinition}
                canvasBlockInstance={canvasBlock}
                isPaletteBlock={false}
                onParamChange={onParamChange}
                onRemove={onRemoveBlock}
              />
            );
          })}
        </div>
      </ScrollArea>
    </main>
  );
}

// Placeholder for PuzzleIcon if not directly available or to customize
function PuzzleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.426 7.849a1.5 1.5 0 0 0-2.121-2.121l-2.605 2.605A1.5 1.5 0 0 0 14 9.586V10a2 2 0 0 0-2-2H9.414a1.5 1.5 0 0 0-1.06.44l-2.605 2.604A1.5 1.5 0 0 0 5 12.202V12a2 2 0 0 0 2 2h.586a1.5 1.5 0 0 0 1.06.44l2.605 2.604a1.5 1.5 0 0 0 2.121 2.121l2.605-2.605A1.5 1.5 0 0 0 17 15.414V15a2 2 0 0 0 2-2v-.586a1.5 1.5 0 0 0-.44-1.06Z" />
      <path d="M10 16H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
      <path d="M16 8h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}
