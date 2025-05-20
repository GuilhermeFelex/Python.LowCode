
// src/components/visual-script/BlockPanel.tsx
"use client";

import type { Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Copy, Check, Download } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface BlockPanelProps {
  availableBlocks: Block[];
  onSimulate: () => void;
  onCopyCode: () => void;
  onSaveFile: () => void;
  isCodeCopied: boolean;
}

export function BlockPanel({ 
  availableBlocks,
  onSimulate,
  onCopyCode,
  onSaveFile,
  isCodeCopied,
}: BlockPanelProps) {
  const categories = Array.from(new Set(availableBlocks.map(block => block.category)));

  // Create default open values for all categories
  const defaultAccordionValues = categories.map(category => category);

  return (
    <aside className="w-72 min-w-72 h-full border-r bg-card flex flex-col shadow-lg">
      <header className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-foreground">Blocks</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button onClick={onSimulate} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            <Play className="mr-1 h-3 w-3" /> Simulate
          </Button>
          <Button onClick={onCopyCode} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            {isCodeCopied ? <Check className="mr-1 h-3 w-3 text-green-500" /> : <Copy className="mr-1 h-3 w-3" />}
            {isCodeCopied ? 'Copied' : 'Copy'}
          </Button>
          <Button onClick={onSaveFile} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            <Download className="h-3 w-3" /> Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Drag blocks to the canvas</p>
      </header>
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full p-4">
          {categories.map(category => (
            <AccordionItem value={category} key={category} className="border-b-0 mb-2 last:mb-0">
              <AccordionTrigger className="py-2 px-3 rounded-md hover:bg-muted/50 hover:no-underline text-sm font-medium text-muted-foreground uppercase tracking-wider [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center justify-between w-full">
                  <span>{category}</span>
                  <Badge variant="secondary" className="ml-2">
                    {availableBlocks.filter(b => b.category === category).length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-3">
                  {availableBlocks
                    .filter(block => block.category === category)
                    .map((block) => (
                      <ScriptBlock
                        key={block.id}
                        blockDefinition={block}
                        isPaletteBlock={true}
                      />
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </aside>
  );
}
