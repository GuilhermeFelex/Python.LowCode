
// src/components/visual-script/CodeVisualizer.tsx
"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useMemo } from 'react';

interface CodeVisualizerProps {
  code: string;
  width: number;
}

const COMMENT_REGEX = /^\s*#/;

export function CodeVisualizer({ code, width }: CodeVisualizerProps) {
  const [displayCode, setDisplayCode] = useState(code);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    setIsFading(true);
    const timer = setTimeout(() => {
      setDisplayCode(code);
      setIsFading(false);
    }, 150); 
    return () => clearTimeout(timer);
  }, [code]);

  const formattedCodeLines = useMemo(() => {
    return displayCode.split('\n').map((line, index) => {
      if (COMMENT_REGEX.test(line)) {
        return (
          <span key={index} className="text-comment">
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
      style={{ width: `${width}px`, minWidth: `${width}px` }} // Apply dynamic width
      aria-live="polite"
    >
      <CardHeader className="border-b flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-foreground">Code Visualizer</CardTitle>
        <p className="text-xs text-muted-foreground">Real-time Python code generation</p>
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

