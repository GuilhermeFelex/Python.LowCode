
// src/components/visual-script/CodeVisualizer.tsx
/**
 * @fileoverview Componente que exibe o código Python gerado em tempo real.
 * Permite rolagem e destaca comentários. Sua largura pode ser ajustada.
 */
"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useMemo } from 'react';

interface CodeVisualizerProps {
  code: string;
  width: number;
}

// Regex simples pra identificar linhas de comentário.
const COMMENT_REGEX = /^\s*#/;

export function CodeVisualizer({ code, width }: CodeVisualizerProps) {
  const [displayCode, setDisplayCode] = useState(code);
  const [isFading, setIsFading] = useState(false);

  // Efeito pra suavizar a transição quando o código muda.
  // Eu poderia só atualizar direto, mas um fadezinho fica mais legal.
  useEffect(() => {
    setIsFading(true);
    const timer = setTimeout(() => {
      setDisplayCode(code);
      setIsFading(false);
    }, 150); // Um delay pequeno pra dar tempo do fade.
    return () => clearTimeout(timer);
  }, [code]);

  // Formato as linhas de código, aplicando a classe de comentário se necessário.
  // Memoizado pra só reprocessar se o `displayCode` mudar.
  const formattedCodeLines = useMemo(() => {
    return displayCode.split('\n').map((line, index) => {
      if (COMMENT_REGEX.test(line)) {
        return (
          <span key={index} className="text-comment"> {/* Classe pro CSS pegar */}
            {line}
          </span>
        );
      }
      return <span key={index}>{line}</span>;
    });
  }, [displayCode]);

  return (
    <aside 
      className="h-full border-l bg-card flex flex-col shadow-lg overflow-hidden"
      style={{ width: `${width}px`, minWidth: `${width}px` }} // Aplico a largura dinâmica.
      aria-live="polite" // Pra leitores de tela anunciarem mudanças no código.
    >
      <CardHeader className="border-b flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-foreground">Visualizador de Código</CardTitle>
        <p className="text-xs text-muted-foreground">Geração de código Python em tempo real</p>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <pre className={`p-4 text-sm whitespace-pre-wrap break-words transition-opacity duration-150 ${isFading ? 'opacity-50' : 'opacity-100'}`}>
            <code>
              {formattedCodeLines.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </code>
          </pre>
        </ScrollArea>
      </CardContent>
    </aside>
  );
}
