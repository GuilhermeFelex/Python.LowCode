
// src/components/visual-script/ScriptBlock.tsx
/**
 * @fileoverview Componente que renderiza um bloco de script individual.
 * Usado tanto na paleta de blocos quanto no canvas principal.
 * Lida com a exibição de parâmetros, arraste e a interação com blocos filhos.
 */
"use client";

import React, { type DragEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, X, CornerDownRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { Block, CanvasBlock, ParameterDefinition } from '@/types/visual-script';
import { AVAILABLE_BLOCKS } from '@/lib/visual-script-utils'; // Usado para renderizar filhos recursivamente.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScriptBlockProps {
  blockDefinition: Block;
  canvasBlockInstance?: CanvasBlock; // Opcional, pois blocos na paleta não têm instância.
  isPaletteBlock: boolean; // True se for um bloco na paleta, false se for no canvas.
  onParamChange?: (instanceId: string, paramId: string, value: string) => void;
  onRemove?: (instanceId: string) => void;
  onToggleCollapse?: (instanceId: string) => void;
  onBlockDrop?: (event: DragEvent<HTMLDivElement>) => void; // Manipulador de drop unificado.
}

// Uso React.memo aqui pra otimizar a renderização,
// já que muitos desses blocos podem aparecer na tela.
const ScriptBlockComponent: React.FC<ScriptBlockProps> = ({
  blockDefinition,
  canvasBlockInstance,
  isPaletteBlock,
  onParamChange,
  onRemove,
  onToggleCollapse,
  onBlockDrop,
}) => {
  // Função chamada quando começo a arrastar um bloco.
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (isPaletteBlock) {
      // Se é da paleta, passo o ID do TIPO de bloco.
      event.dataTransfer.setData('blockTypeId', blockDefinition.id);
    } else if (canvasBlockInstance) {
      // Se é do canvas, passo o ID da INSTÂNCIA do bloco.
      event.dataTransfer.setData('draggedCanvasBlockId', canvasBlockInstance.instanceId);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  // Função chamada quando um item arrastado está SOBRE este bloco.
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessário para permitir o drop.
    event.stopPropagation(); // Evita que o evento se propague para elementos pai.
    if (event.dataTransfer.types.includes('blocktypeid') || event.dataTransfer.types.includes('draggedcanvasblockid')) {
      event.dataTransfer.dropEffect = 'move'; // Feedback visual.
    } else {
      event.dataTransfer.dropEffect = 'none'; // Não é algo que eu possa soltar aqui.
    }
  };

  // Função chamada quando um item é SOLTO sobre este bloco ou sua área de filhos.
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation(); 
    if (onBlockDrop) {
      onBlockDrop(event); // Chamo o manipulador principal (em page.tsx) pra decidir o que fazer.
    }
  };

  // Renderiza os campos de entrada para os parâmetros do bloco.
  const renderParameterInputs = () => {
    if (!canvasBlockInstance || !onParamChange) return null; // Só renderizo se for um bloco no canvas.

    return blockDefinition.parameters.map((paramDef: ParameterDefinition) => {
      // Verifico se o parâmetro tem uma condição para ser exibido.
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
          return null; // Se a condição não for atendida, não renderizo o parâmetro.
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
                <SelectValue placeholder={paramDef.placeholder || `Selecione ${paramDef.name}`} />
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
      // Input padrão para string, number, password.
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

  // Classes CSS dinâmicas para o card principal do bloco.
  const cardClasses = `w-full transition-all duration-150 ease-in-out shadow-md hover:shadow-lg ${
    isPaletteBlock ? 'cursor-grab active:cursor-grabbing' : 'bg-card cursor-move'
  }`;

  // Verifica se é uma área onde posso soltar blocos filhos.
  const isDroppableChildArea = !isPaletteBlock && blockDefinition.canHaveChildren && canvasBlockInstance;
  const isCollapsed = canvasBlockInstance?.isCollapsed ?? false;

  // Renderiza o ícone correto no cabeçalho do bloco.
  const renderHeaderIcon = () => {
    if (isPaletteBlock) {
      return <GripVertical className="h-4 w-4 text-muted-foreground" />; // Ícone de "arrastar" para blocos da paleta.
    }
    // Bloco no Canvas
    if (onToggleCollapse && canvasBlockInstance) {
      // Se pode colapsar, mostro o botão de expandir/recolher.
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleCollapse(canvasBlockInstance.instanceId)}
          className="h-6 w-6 p-0 mr-1"
          aria-label={isCollapsed ? `Expandir bloco ${blockDefinition.name}` : `Recolher bloco ${blockDefinition.name}`}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      );
    }
    if (blockDefinition.canHaveChildren) {
      // Se pode ter filhos mas não é colapsável (raro, mas por via das dúvidas).
      return <CornerDownRight className="h-4 w-4 text-muted-foreground" />;
    }
    // Bloco simples no canvas.
    return <GripVertical className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card
      draggable={true} // Todos os blocos (paleta e canvas) são arrastáveis.
      onDragStart={handleDragStart}
      onDragOver={handleDragOver} // Permite soltar *sobre* este bloco (para reordenar).
      onDrop={handleDrop}       // Lógica de soltar *sobre* este bloco.
      className={cardClasses}
      aria-label={`Bloco ${blockDefinition.name}`}
      data-instance-id={canvasBlockInstance?.instanceId} // Importante para identificar o alvo do drop.
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2 flex-grow">
          {renderHeaderIcon()}
          <blockDefinition.icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-semibold">{blockDefinition.name}</CardTitle>
        </div>
        {!isPaletteBlock && canvasBlockInstance && onRemove && (
          // Botão de remover, só para blocos no canvas.
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(canvasBlockInstance.instanceId)}
            className="h-6 w-6 p-0"
            aria-label={`Remover bloco ${blockDefinition.name}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      {!isCollapsed && ( // Só mostro o conteúdo se não estiver colapsado.
        <>
          {blockDefinition.description && isPaletteBlock && (
             <CardContent className="p-3 text-xs text-muted-foreground border-t">
                {blockDefinition.description}
             </CardContent>
          )}

          {!isPaletteBlock && blockDefinition.parameters.length > 0 && (
            // Parâmetros, só para blocos no canvas.
            <CardContent className="p-3 pt-2 border-t">
              {renderParameterInputs()}
            </CardContent>
          )}

          {isDroppableChildArea && (
            // Área para soltar blocos filhos.
            <CardContent className="p-0 border-t">
              <div
                data-instance-id={canvasBlockInstance.instanceId} // ID do pai, pra saber onde aninhar.
                data-is-drop-zone="true" // Marco como uma zona de soltura de filhos.
                className="m-2 p-3 border border-dashed border-accent/50 rounded-md min-h-[60px] bg-background/30 space-y-2"
                onDragOver={handleDragOver} // Permite soltar aqui.
                onDrop={handleDrop} // Lógica de soltar aqui.
              >
                {canvasBlockInstance.children && canvasBlockInstance.children.length > 0 ? (
                  // Renderizo os blocos filhos recursivamente.
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
                        onBlockDrop={onBlockDrop} // Passo o manipulador de drop pros filhos também.
                      />
                    );
                  })
                ) : (
                  // Mensagem se a área de filhos estiver vazia.
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Arraste blocos aqui para aninhar dentro de "{blockDefinition.name}"
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

export const ScriptBlock = React.memo(ScriptBlockComponent);
