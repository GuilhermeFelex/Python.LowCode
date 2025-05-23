
// src/components/visual-script/MainCanvas.tsx
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import type { CanvasBlock, Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Button } from '@/components/ui/button'; // Button no longer used here
// import { PanelRightOpen, PanelRightClose } from 'lucide-react'; // Icons no longer used here
import { SquareDashedMousePointer } from 'lucide-react';


interface MainCanvasProps {
  canvasBlocks: CanvasBlock[];
  availableBlocks: Block[];
  onBlockDrop: (event: DragEvent<HTMLDivElement>) => void; 
  onParamChange: (instanceId: string, paramId: string, value: string) => void;
  onRemoveBlock: (instanceId: string) => void;
  onToggleBlockCollapse: (instanceId: string) => void;
  // isCodeVisualizerVisible: boolean; // Removed
  // toggleCodeVisualizer: () => void; // Removed
}

export function MainCanvas({
  canvasBlocks,
  availableBlocks,
  onBlockDrop,
  onParamChange,
  onRemoveBlock,
  onToggleBlockCollapse,
  // isCodeVisualizerVisible, // Removed
  // toggleCodeVisualizer, // Removed
}: MainCanvasProps) {
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Only allow dropping if a new block is being dragged from the palette
    if (event.dataTransfer.types.includes('blocktypeid')) {
        event.dataTransfer.dropEffect = 'move';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
  };

  // Pass the event to the main handler in page.tsx
  const handleDropOnCanvas = (event: DragEvent<HTMLDivElement>) => {
    // page.tsx's onBlockDrop will check event.target to see if it's a child zone or main canvas
    onBlockDrop(event);
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-background p-4 overflow-hidden">
      <header className="pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-primary">Visual Script Canvas</h1>
          <p className="text-sm text-muted-foreground">Construct your Python script by arranging blocks.</p>
        </div>
        {/* Removed Toggle Button
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCodeVisualizer}
            className="h-8 w-8"
            aria-label={isCodeVisualizerVisible ? "Hide Code Visualizer" : "Show Code Visualizer"}
            title={isCodeVisualizerVisible ? "Hide Code Visualizer" : "Show Code Visualizer"}
          >
            {isCodeVisualizerVisible ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
        */}
      </header>
      <ScrollArea
        className="flex-1 border border-dashed rounded-lg bg-background/70 transition-colors duration-200 hover:border-primary/50"
        onDragOver={handleDragOver}
        onDrop={handleDropOnCanvas} // Main drop handler for the canvas area
        aria-label="Main script canvas"
      >
        <div className="p-6 space-y-4 min-h-full">
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
                onToggleCollapse={onToggleBlockCollapse}
                onBlockDrop={onBlockDrop} 
              />
            );
          })}
        </div>
      </ScrollArea>
    </main>
  );
}
