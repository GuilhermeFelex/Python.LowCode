// src/components/visual-script/CodeVisualizer.tsx
"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

interface CodeVisualizerProps {
  code: string;
}

export function CodeVisualizer({ code }: CodeVisualizerProps) {
  // Add a subtle transition effect when code changes
  const [displayCode, setDisplayCode] = useState(code);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    setIsFading(true);
    const timer = setTimeout(() => {
      setDisplayCode(code);
      setIsFading(false);
    }, 150); // Duration of fade-out part of transition
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <aside className="w-96 min-w-96 h-full border-l bg-card flex flex-col shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold text-foreground">Code Visualizer</CardTitle>
        <p className="text-xs text-muted-foreground">Real-time Python code generation</p>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <pre className={`p-4 text-sm whitespace-pre-wrap break-all transition-opacity duration-150 ${isFading ? 'opacity-50' : 'opacity-100'}`}>
            <code>{displayCode}</code>
          </pre>
        </ScrollArea>
      </CardContent>
    </aside>
  );
}
