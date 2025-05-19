// src/components/visual-script/CodeVisualizer.tsx
"use client";

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Copy, Check, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";


interface CodeVisualizerProps {
  code: string;
}

export function CodeVisualizer({ code }: CodeVisualizerProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Code Copied!",
        description: "The Python code has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
      toast({
        title: "Copy Failed",
        description: "Could not copy code to clipboard. See console for details.",
        variant: "destructive",
      });
    }
  };

  const handleSimulate = () => {
    console.log("--- Simulating Script Execution ---");
    console.log(code);
    console.log("--- Simulation End ---");
    toast({
      title: "Simulation Started",
      description: "Check the browser console for simulated output.",
    });
  };

  const handleSaveToFile = () => {
    try {
      const blob = new Blob([code], { type: 'text/python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visual_script.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "File Saved!",
        description: "The Python code has been downloaded as visual_script.py.",
      });
    } catch (err) {
      console.error('Failed to save file: ', err);
      toast({
        title: "Save Failed",
        description: "Could not save the code to a file. See console for details.",
        variant: "destructive",
      });
    }
  };

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
        <div className="p-3 border-t flex gap-2">
          <Button onClick={handleSimulate} variant="outline" size="sm" className="flex-1">
            <Play className="mr-2 h-4 w-4" /> Simulate
          </Button>
          <Button onClick={handleCopyCode} variant="outline" size="sm" className="flex-1">
            {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Button onClick={handleSaveToFile} variant="outline" size="sm" className="flex-1">
            <Download className="mr-2 h-4 w-4" /> Save File
          </Button>
        </div>
      </CardContent>
    </aside>
  );
}
