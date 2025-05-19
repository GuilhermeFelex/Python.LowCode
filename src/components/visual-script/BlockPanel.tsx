// src/components/visual-script/BlockPanel.tsx
"use client";

import type { Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface BlockPanelProps {
  availableBlocks: Block[];
}

export function BlockPanel({ availableBlocks }: BlockPanelProps) {
  const categories = Array.from(new Set(availableBlocks.map(block => block.category)));

  return (
    <aside className="w-72 min-w-72 h-full border-r bg-card flex flex-col shadow-lg">
      <header className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Blocks</h2>
        <p className="text-xs text-muted-foreground">Drag blocks to the canvas</p>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
                {category}
                <Badge variant="secondary" className="ml-2">
                  {availableBlocks.filter(b => b.category === category).length}
                </Badge>
              </h3>
              <div className="space-y-3">
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
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
