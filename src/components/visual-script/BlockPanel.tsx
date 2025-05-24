
// src/components/visual-script/BlockPanel.tsx
/**
 * @fileoverview Componente do painel lateral que exibe os blocos de script disponíveis.
 * Permite buscar blocos e acionar ações como copiar código e salvar arquivo.
 * As categorias de blocos são organizadas em um acordeão.
 */
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Block } from '@/types/visual-script';
import { ScriptBlock } from './ScriptBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Download, Search } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface BlockPanelProps {
  availableBlocks: Block[];
  onCopyCode: () => void;
  onSaveFile: () => void;
  isCodeCopied: boolean;
}

export function BlockPanel({
  availableBlocks,
  onCopyCode,
  onSaveFile,
  isCodeCopied,
}: BlockPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro os blocos com base no termo de busca.
  // Isso é memoizado pra não recalcular a cada renderização desnecessariamente.
  const filteredBlocks = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableBlocks; // Se não tem busca, mostro todos.
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return availableBlocks.filter(
      (block) =>
        block.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        block.category.toLowerCase().includes(lowerCaseSearchTerm) ||
        (block.description && block.description.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [availableBlocks, searchTerm]);

  // Crio uma lista única e ordenada de categorias a partir dos blocos filtrados.
  const categories = useMemo(() => {
    return Array.from(new Set(filteredBlocks.map(block => block.category))).sort();
  }, [filteredBlocks]);

  // Determino quais itens do acordeão devem estar abertos.
  // Se tem busca, abro as categorias que têm resultados. Senão, abro todas.
  const initialOrFilteredOpenCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      // Se não tem busca, pego todas as categorias dos blocos originais.
      return Array.from(new Set(availableBlocks.map(block => block.category)));
    }
    return categories; // Se tem busca, são as categorias filtradas.
  }, [categories, searchTerm, availableBlocks]);

  // Estado para controlar os itens abertos do acordeão.
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(initialOrFilteredOpenCategories);

  // Sincronizo os itens abertos do acordeão se as categorias iniciais/filtradas mudarem.
  // Isso garante que o acordeão se expanda corretamente após uma busca, por exemplo.
  useEffect(() => {
    setOpenAccordionItems(initialOrFilteredOpenCategories);
  }, [initialOrFilteredOpenCategories]);


  return (
    <aside className="w-72 min-w-72 h-full border-r bg-card flex flex-col shadow-lg">
      <header className="p-4 border-b space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">Blocos</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onCopyCode} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            {isCodeCopied ? <Check className="mr-1 h-3 w-3 text-green-500" /> : <Copy className="mr-1 h-3 w-3" />}
            {isCodeCopied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button onClick={onSaveFile} variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
            <Download className="h-3 w-3" /> Salvar Arquivo
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar blocos..."
            className="pl-8 h-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>
      <ScrollArea className="flex-1">
        {filteredBlocks.length === 0 && searchTerm.trim() && (
          <p className="p-4 text-sm text-muted-foreground text-center">Nenhum bloco encontrado para "{searchTerm}".</p>
        )}
        <Accordion
          type="multiple" // Permite vários itens abertos ao mesmo tempo.
          value={openAccordionItems} // Controla quais itens estão abertos.
          onValueChange={setOpenAccordionItems} // Atualiza o estado quando o usuário interage.
          className="w-full p-4"
        >
          {categories.map(category => {
            const blocksInCategory = filteredBlocks.filter(b => b.category === category);
            if (blocksInCategory.length === 0) return null; // Não renderizo a categoria se não tiver blocos (após filtro).

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
                          isPaletteBlock={true} // Indica que é um bloco na paleta (arrastável).
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
