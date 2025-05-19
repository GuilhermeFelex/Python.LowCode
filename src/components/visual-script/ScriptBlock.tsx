// src/components/visual-script/ScriptBlock.tsx
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical, X, CornerDownRight } from 'lucide-react';
import type { Block, CanvasBlock, ParameterDefinition } from '@/types/visual-script';
import { AVAILABLE_BLOCKS } from '@/lib/visual-script-utils'; // Import for recursive rendering

interface ScriptBlockProps {
  blockDefinition: Block;
  canvasBlockInstance?: CanvasBlock;
  isPaletteBlock: boolean;
  onParamChange?: (instanceId: string, paramId: string, value: string) => void;
  onRemove?: (instanceId: string) => void;
  // onDropInBlock prop might be needed if ScriptBlock handles its own drops directly.
  // For now, relying on MainCanvas's onDrop and event.target.
}

export function ScriptBlock({
  blockDefinition,
  canvasBlockInstance,
  isPaletteBlock,
  onParamChange,
  onRemove,
}: ScriptBlockProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (isPaletteBlock) {
      event.dataTransfer.setData('blockId', blockDefinition.id);
      event.dataTransfer.effectAllowed = 'move';
    } else if (canvasBlockInstance) {
      // Allow dragging blocks already on canvas (for reordering, not implemented yet)
      // event.dataTransfer.setData('instanceId', canvasBlockInstance.instanceId);
      // event.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOverChildArea = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  };

  const renderParameterInputs = () => {
    if (!canvasBlockInstance || !onParamChange) return null;

    return blockDefinition.parameters.map((paramDef: ParameterDefinition) => (
      <div key={paramDef.id} className="mb-3">
        <Label htmlFor={`${canvasBlockInstance.instanceId}-${paramDef.id}`} className="text-xs font-medium">
          {paramDef.name}
        </Label>
        <Input
          id={`${canvasBlockInstance.instanceId}-${paramDef.id}`}
          type={paramDef.type === 'number' ? 'number' : 'text'}
          value={canvasBlockInstance.params[paramDef.id] || ''}
          onChange={(e) => onParamChange(canvasBlockInstance.instanceId, paramDef.id, e.target.value)}
          placeholder={paramDef.placeholder || paramDef.defaultValue}
          className="mt-1 h-8 text-sm"
        />
      </div>
    ));
  };

  const cardClasses = `w-full transition-all duration-150 ease-in-out shadow-md hover:shadow-lg ${
    isPaletteBlock ? 'cursor-grab active:cursor-grabbing' : 'bg-card' // Removed cursor-auto for canvas blocks to allow drag later
  }`;

  const isDroppableChildArea = !isPaletteBlock && blockDefinition.canHaveChildren && canvasBlockInstance;

  return (
    <Card
      draggable={isPaletteBlock} // Only palette blocks are draggable *from* the panel
      onDragStart={handleDragStart}
      className={cardClasses}
      aria-label={`${blockDefinition.name} block`}
      // Add data-instance-id for potential drag-reordering on canvas later
      data-instance-id={canvasBlockInstance?.instanceId}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          {(isPaletteBlock || (!isPaletteBlock && !blockDefinition.canHaveChildren)) && <GripVertical className="h-4 w-4 text-muted-foreground" />}
          {(!isPaletteBlock && blockDefinition.canHaveChildren) && <CornerDownRight className="h-4 w-4 text-muted-foreground" />}
          <blockDefinition.icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-semibold">{blockDefinition.name}</CardTitle>
        </div>
        {!isPaletteBlock && canvasBlockInstance && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(canvasBlockInstance.instanceId)}
            className="h-6 w-6 p-0"
            aria-label={`Remove ${blockDefinition.name} block`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      {blockDefinition.description && isPaletteBlock && (
         <CardContent className="p-3 text-xs text-muted-foreground border-t">
            {blockDefinition.description}
         </CardContent>
      )}

      {!isPaletteBlock && blockDefinition.parameters.length > 0 && (
        <CardContent className="p-3 pt-2 border-t">
          {renderParameterInputs()}
        </CardContent>
      )}

      {isDroppableChildArea && (
        <CardContent className="p-0 border-t">
          <div
            data-instance-id={canvasBlockInstance.instanceId} // Parent instanceId
            data-is-drop-zone="true" // Mark as a child drop zone
            className="m-2 p-3 border border-dashed border-accent/50 rounded-md min-h-[60px] bg-background/30 space-y-2"
            onDragOver={handleDragOverChildArea}
            // onDrop is handled by MainCanvas by event bubbling
            // if ScriptBlock were to handle it: onDrop={(e) => onDropInBlock(e, canvasBlockInstance.instanceId)}
          >
            {canvasBlockInstance.children && canvasBlockInstance.children.length > 0 ? (
              canvasBlockInstance.children.map(childBlock => {
                const childBlockDef = AVAILABLE_BLOCKS.find(b => b.id === childBlock.blockTypeId);
                if (!childBlockDef) return null;
                return (
                  <ScriptBlock
                    key={childBlock.instanceId}
                    blockDefinition={childBlockDef}
                    canvasBlockInstance={childBlock}
                    isPaletteBlock={false} // Children are never palette blocks
                    onParamChange={onParamChange} // Pass down props
                    onRemove={onRemove}         // Pass down props
                  />
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Arraste blocos aqui para aninhar dentro de &quot;{blockDefinition.name}&quot;
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
