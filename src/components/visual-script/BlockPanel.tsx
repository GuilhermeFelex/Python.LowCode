
// src/components/visual-script/BlockPanel.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Copy, Check, Download, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBlocks = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableBlocks;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return availableBlocks.filter(
      (block) =>
        block.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        block.category.toLowerCase().includes(lowerCaseSearchTerm) ||
        (block.description && block.description.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [availableBlocks, searchTerm]);

  const categories = useMemo(() => {
    return Array.from(new Set(filteredBlocks.map(block => block.category))).sort();
  }, [filteredBlocks]);

  // Determine which categories should be open based on search or default
  const initialOrFilteredOpenCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      // Default to all categories from the original availableBlocks list if no search term
      return Array.from(new Set(availableBlocks.map(block => block.category)));
    }
    // If there is a search term, only include categories that have matching blocks
    return categories;
  }, [categories, searchTerm, availableBlocks]);

  // State to manage accordion open items
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(initialOrFilteredOpenCategories);

  // Effect to update open items when the search term changes or initial categories are determined
  useEffect(() => {
    setOpenAccordionItems(initialOrFilteredOpenCategories);
  }, [initialOrFilteredOpenCategories]);


  return (
    <aside className="w-72 min-w-72 h-full border-r bg-card flex flex-col shadow-lg">
      <header className="p-4 border-b space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">Blocks</h2>
          {/* Toggle button removed from here */}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={onSimulate} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            <Play className="mr-1 h-3 w-3" /> Simulate
          </Button>
          <Button onClick={onCopyCode} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            {isCodeCopied ? <Check className="mr-1 h-3 w-3 text-green-500" /> : <Copy className="mr-1 h-3 w-3" />}
            {isCodeCopied ? 'Copied' : 'Copy'}
          </Button>
          <Button onClick={onSaveFile} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            <Download className="mr-1 h-3 w-3" /> Save
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search blocks..."
            className="pl-8 h-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>
      <ScrollArea className="flex-1">
        {filteredBlocks.length === 0 && searchTerm.trim() && (
          <p className="p-4 text-sm text-muted-foreground text-center">No blocks found matching "{searchTerm}".</p>
        )}
        <Accordion 
          type="multiple" 
          value={openAccordionItems} // Controlled component
          onValueChange={setOpenAccordionItems} // Handler to update state
          className="w-full p-4"
        >
          {categories.map(category => {
            const blocksInCategory = filteredBlocks.filter(b => b.category === category);
            if (blocksInCategory.length === 0) return null; // Don't render category if no blocks match search

            return (
              <AccordionItem value={category} key={category} className="border-b-0 mb-2 last:mb-0">
                <AccordionTrigger className="py-2 px-3 rounded-md hover:bg-muted/50 hover:no-underline text-sm font-medium text-muted-foreground tracking-wider [&[data-state=open]>svg]:text-primary">
                  <div className="flex items-center justify-between w-full">
                    <span>{category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {blocksInCategory.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                  <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-3">
                    {blocksInCategory
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
            )
          })}
        </Accordion>
      </ScrollArea>
    </aside>
  );
}
