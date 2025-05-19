// src/components/visual-script/ScriptBlock.tsx
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
import type { Block, CanvasBlock, ParameterDefinition } from '@/types/visual-script';

interface ScriptBlockProps {
  blockDefinition: Block;
  canvasBlockInstance?: CanvasBlock; // Only if on canvas
  isPaletteBlock: boolean;
  onParamChange?: (instanceId: string, paramId: string, value: string) => void;
  onRemove?: (instanceId: string) => void;
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
    }
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

  const cardClasses = `w-full transition-all duration-150 ease-in-out shadow-md hover:shadow-lg ${isPaletteBlock ? 'cursor-grab active:cursor-grabbing' : 'cursor-auto'}`;

  return (
    <Card
      draggable={isPaletteBlock}
      onDragStart={handleDragStart}
      className={cardClasses}
      aria-label={`${blockDefinition.name} block`}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          {isPaletteBlock && <GripVertical className="h-4 w-4 text-muted-foreground" />}
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
    </Card>
  );
}
