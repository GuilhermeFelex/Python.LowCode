
// src/components/visual-script/ScriptBlock.tsx
"use client";

import type React from 'react';
import type { DragEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, X, CornerDownRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { Block, CanvasBlock, ParameterDefinition } from '@/types/visual-script';
import { AVAILABLE_BLOCKS } from '@/lib/visual-script-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScriptBlockProps {
  blockDefinition: Block;
  canvasBlockInstance?: CanvasBlock;
  isPaletteBlock: boolean;
  onParamChange?: (instanceId: string, paramId: string, value: string) => void;
  onRemove?: (instanceId: string) => void;
  onToggleCollapse?: (instanceId: string) => void;
  onBlockDrop?: (event: DragEvent<HTMLDivElement>, targetParentId: string | null, insertBeforeId: string | null) => void;
  parentId?: string | null; // ID of the parent block, or null if root
}

export function ScriptBlock({
  blockDefinition,
  canvasBlockInstance,
  isPaletteBlock,
  onParamChange,
  onRemove,
  onToggleCollapse,
  onBlockDrop,
  parentId,
}: ScriptBlockProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.stopPropagation(); // Prevent parent drag handlers if nested
    if (isPaletteBlock) {
      event.dataTransfer.setData('newBlockTypeId', blockDefinition.id);
      event.dataTransfer.effectAllowed = 'move';
    } else if (canvasBlockInstance) {
      event.dataTransfer.setData('reorderInstanceId', canvasBlockInstance.instanceId);
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const isReorder = event.dataTransfer.types.includes('reorderinstanceid');
    const isNewBlock = event.dataTransfer.types.includes('newblocktypeid');
    
    // Prevent dropping on itself or its own definition if it's a reorder
    if (isReorder && canvasBlockInstance) {
        const draggedInstanceId = event.dataTransfer.getData('reorderinstanceid');
        if (draggedInstanceId === canvasBlockInstance.instanceId) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }
    }
    
    if (isReorder || isNewBlock) {
        event.dataTransfer.dropEffect = 'move';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
  };

  // Drop on the block itself (to insert before it)
  const handleDropOnSelf = (event: DragEvent<HTMLDivElement>) => {
    if (isPaletteBlock || !canvasBlockInstance || !onBlockDrop) return;
    event.preventDefault();
    event.stopPropagation();
    onBlockDrop(event, parentId, canvasBlockInstance.instanceId);
  };

  // Drop in the child area of this block
  const handleDropInChildrenArea = (event: DragEvent<HTMLDivElement>) => {
    if (isPaletteBlock || !canvasBlockInstance || !blockDefinition.canHaveChildren || !onBlockDrop) return;
     // Only handle drops if they occur directly on the drop zone, not on child blocks within it.
    if (event.target === event.currentTarget) {
        event.preventDefault();
        event.stopPropagation();
        onBlockDrop(event, canvasBlockInstance.instanceId, null); // Append to this block's children
    }
  };


  const renderParameterInputs = () => {
    if (!canvasBlockInstance || !onParamChange) return null;

    return blockDefinition.parameters.map((paramDef: ParameterDefinition) => {
      if (paramDef.condition) {
        const controllingParamValue = canvasBlockInstance.params[paramDef.condition.paramId];
        const conditionValue = paramDef.condition.paramValue;
        let conditionMet = false;
        if (Array.isArray(conditionValue)) {
          conditionMet = conditionValue.includes(controllingParamValue);
        } else {
          conditionMet = controllingParamValue === conditionValue;
        }
        if (!conditionMet) {
          return null;
        }
      }

      const inputId = `${canvasBlockInstance.instanceId}-${paramDef.id}`;
      const currentValue = canvasBlockInstance.params[paramDef.id] ?? paramDef.defaultValue ?? '';

      if (paramDef.type === 'select') {
        return (
          <div key={paramDef.id} className="mb-3">
            <Label htmlFor={inputId} className="text-xs font-medium">
              {paramDef.name}
            </Label>
            <Select
              value={currentValue}
              onValueChange={(value) => onParamChange!(canvasBlockInstance!.instanceId, paramDef.id, value)}
            >
              <SelectTrigger id={inputId} className="mt-1 h-8 text-sm">
                <SelectValue placeholder={paramDef.placeholder || `Select ${paramDef.name}`} />
              </SelectTrigger>
              <SelectContent>
                {paramDef.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      } else if (paramDef.type === 'textarea') {
        return (
          <div key={paramDef.id} className="mb-3">
            <Label htmlFor={inputId} className="text-xs font-medium">
              {paramDef.name}
            </Label>
            <Textarea
              id={inputId}
              value={currentValue}
              onChange={(e) => onParamChange!(canvasBlockInstance!.instanceId, paramDef.id, e.target.value)}
              placeholder={paramDef.placeholder || paramDef.defaultValue}
              className="mt-1 text-sm min-h-[60px]"
              rows={3}
            />
          </div>
        );
      }
      return (
        <div key={paramDef.id} className="mb-3">
          <Label htmlFor={inputId} className="text-xs font-medium">
            {paramDef.name}
          </Label>
          <Input
            id={inputId}
            type={paramDef.type === 'number' ? 'number' : paramDef.type === 'password' ? 'password' : 'text'}
            value={currentValue}
            onChange={(e) => onParamChange!(canvasBlockInstance!.instanceId, paramDef.id, e.target.value)}
            placeholder={paramDef.placeholder || paramDef.defaultValue}
            className="mt-1 h-8 text-sm"
          />
        </div>
      );
    });
  };

  const cardClasses = `w-full transition-all duration-150 ease-in-out shadow-md hover:shadow-lg ${
    isPaletteBlock ? 'cursor-grab active:cursor-grabbing' : 'bg-card'
  }`;

  const isDroppableChildArea = !isPaletteBlock && blockDefinition.canHaveChildren && canvasBlockInstance;
  const isCollapsed = canvasBlockInstance?.isCollapsed ?? false;

  return (
    <Card
      draggable={true} // All blocks are draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver} // Allow dropping on the block itself
      onDrop={handleDropOnSelf}   // Handle drop on the block itself
      className={cardClasses}
      aria-label={`${blockDefinition.name} block`}
      data-instance-id={canvasBlockInstance?.instanceId}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2 flex-grow">
          {!isPaletteBlock && onToggleCollapse && canvasBlockInstance && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleCollapse(canvasBlockInstance.instanceId)}
              className="h-6 w-6 p-0 mr-1"
              aria-label={isCollapsed ? `Expand ${blockDefinition.name} block` : `Collapse ${blockDefinition.name} block`}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
          {(isPaletteBlock || (!isPaletteBlock && !onToggleCollapse && !blockDefinition.canHaveChildren )) &&
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          }
           {(!isPaletteBlock && blockDefinition.canHaveChildren && !onToggleCollapse && !canvasBlockInstance?.children?.length) &&
            <CornerDownRight className="h-4 w-4 text-muted-foreground" />
          }
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

      {!isCollapsed && (
        <>
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
                data-instance-id={canvasBlockInstance.instanceId}
                data-is-drop-zone="true"
                className="m-2 p-3 border border-dashed border-accent/50 rounded-md min-h-[60px] bg-background/30 space-y-2"
                onDragOver={handleDragOver} // Allow dropping in child area
                onDrop={handleDropInChildrenArea} // Handle drop in child area
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
                        isPaletteBlock={false}
                        onParamChange={onParamChange}
                        onRemove={onRemove}
                        onToggleCollapse={onToggleCollapse}
                        onBlockDrop={onBlockDrop} // Pass down the main drop handler
                        parentId={canvasBlockInstance.instanceId} // Pass current block's ID as parentId
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
        </>
      )}
    </Card>
  );
}
