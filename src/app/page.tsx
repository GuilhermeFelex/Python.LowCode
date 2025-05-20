
// src/app/page.tsx
"use client";

import { useState, useEffect, type DragEvent } from 'react';
import { BlockPanel } from '@/components/visual-script/BlockPanel';
import { MainCanvas } from '@/components/visual-script/MainCanvas';
import { CodeVisualizer } from '@/components/visual-script/CodeVisualizer';
import type { CanvasBlock } from '@/types/visual-script';
import { AVAILABLE_BLOCKS, generatePythonCode } from '@/lib/visual-script-utils';
import { useToast } from "@/hooks/use-toast";

export default function VisualScriptPage() {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const code = generatePythonCode(canvasBlocks, AVAILABLE_BLOCKS);
      setGeneratedCode(code);
    }
  }, [canvasBlocks, isClient]);

  const findBlockRecursive = (
    blocks: CanvasBlock[],
    instanceId: string
  ): { block: CanvasBlock | null; path: string[] } => {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.instanceId === instanceId) {
        return { block, path: [i.toString()] };
      }
      if (block.children) {
        const foundInChildren = findBlockRecursive(block.children, instanceId);
        if (foundInChildren.block) {
          return {
            block: foundInChildren.block,
            path: [i.toString(), ...foundInChildren.path],
          };
        }
      }
    }
    return { block: null, path: [] };
  };

  const removeBlockRecursive = (
    blocks: CanvasBlock[],
    instanceId: string
  ): { removedBlock: CanvasBlock | null; updatedBlocks: CanvasBlock[] } => {
    let removedBlock: CanvasBlock | null = null;
    const remainingBlocks = blocks.filter((block) => {
      if (block.instanceId === instanceId) {
        removedBlock = block;
        return false;
      }
      return true;
    });

    if (removedBlock) {
      return { removedBlock, updatedBlocks: remainingBlocks };
    }

    const updatedBlocks = remainingBlocks.map((block) => {
      if (block.children) {
        const result = removeBlockRecursive(block.children, instanceId);
        if (result.removedBlock) {
          removedBlock = result.removedBlock;
          return { ...block, children: result.updatedBlocks };
        }
      }
      return block;
    });

    return { removedBlock, updatedBlocks };
  };

  const insertBlockRecursive = (
    blocks: CanvasBlock[],
    blockToInsert: CanvasBlock,
    targetParentId: string | null,
    insertBeforeId: string | null
  ): CanvasBlock[] => {
    if (targetParentId === null) { // Inserting at root level
      let newBlocks = [...blocks];
      if (insertBeforeId) {
        const targetIndex = newBlocks.findIndex(b => b.instanceId === insertBeforeId);
        if (targetIndex !== -1) {
          newBlocks.splice(targetIndex, 0, blockToInsert);
        } else {
          newBlocks.push(blockToInsert); // Fallback: append if target not found
        }
      } else {
        newBlocks.push(blockToInsert);
      }
      return newBlocks;
    }

    // Inserting into a child list
    return blocks.map(block => {
      if (block.instanceId === targetParentId) {
        let newChildren = block.children ? [...block.children] : [];
        if (insertBeforeId) {
          const targetIndex = newChildren.findIndex(b => b.instanceId === insertBeforeId);
          if (targetIndex !== -1) {
            newChildren.splice(targetIndex, 0, blockToInsert);
          } else {
            newChildren.push(blockToInsert); // Fallback: append if target not found
          }
        } else {
          newChildren.push(blockToInsert);
        }
        return { ...block, children: newChildren, isCollapsed: false }; // Ensure parent is expanded
      }
      if (block.children) {
        return {
          ...block,
          children: insertBlockRecursive(block.children, blockToInsert, targetParentId, insertBeforeId),
        };
      }
      return block;
    });
  };


  const handleBlockDrop = (
    event: DragEvent<HTMLDivElement>,
    targetParentId: string | null, // ID of the parent block, or null for root
    insertBeforeId: string | null  // ID of the block to insert before, or null to append
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const newBlockTypeId = event.dataTransfer.getData('newBlockTypeId');
    const reorderInstanceId = event.dataTransfer.getData('reorderInstanceId');

    if (newBlockTypeId && isClient) {
      const blockType = AVAILABLE_BLOCKS.find(b => b.id === newBlockTypeId);
      if (!blockType) return;

      const initialParams: Record<string, string> = {};
      blockType.parameters.forEach(p => {
        initialParams[p.id] = p.defaultValue;
      });

      const newBlock: CanvasBlock = {
        instanceId: `block_${crypto.randomUUID()}`,
        blockTypeId: blockType.id,
        params: initialParams,
        isCollapsed: false,
        ...(blockType.canHaveChildren && { children: [] }),
      };
      setCanvasBlocks(prevBlocks => insertBlockRecursive(prevBlocks, newBlock, targetParentId, insertBeforeId));

    } else if (reorderInstanceId && isClient) {
      if (reorderInstanceId === targetParentId || reorderInstanceId === insertBeforeId) return; // Prevent dropping a block onto itself

      const { removedBlock, updatedBlocks: blocksAfterRemoval } = removeBlockRecursive(canvasBlocks, reorderInstanceId);
      if (removedBlock) {
        // Check if trying to drop a parent into its own child (or sub-child)
        if (targetParentId) {
            const { block: targetParentBlock } = findBlockRecursive([removedBlock], targetParentId);
            if (targetParentBlock) {
                toast({ title: "Invalid Move", description: "Cannot move a parent block into one of its own children.", variant: "destructive" });
                setCanvasBlocks(canvasBlocks); // Revert to original state if invalid move
                return;
            }
        }
        setCanvasBlocks(insertBlockRecursive(blocksAfterRemoval, removedBlock, targetParentId, insertBeforeId));
      }
    }
  };

  const handleParamChange = (instanceId: string, paramId: string, value: string) => {
    const updateRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
      return blocks.map(block => {
        if (block.instanceId === instanceId) {
          return { ...block, params: { ...block.params, [paramId]: value } };
        }
        if (block.children && block.children.length > 0) {
          return { ...block, children: updateRecursive(block.children) };
        }
        return block;
      });
    };
    setCanvasBlocks(prev => updateRecursive(prev));
  };

  const handleRemoveBlock = (instanceId: string) => {
    const { updatedBlocks } = removeBlockRecursive(canvasBlocks, instanceId);
    setCanvasBlocks(updatedBlocks);
  };

  const handleToggleBlockCollapse = (instanceId: string) => {
    const toggleRecursive = (blocks: CanvasBlock[]): CanvasBlock[] => {
      return blocks.map(block => {
        if (block.instanceId === instanceId) {
          return { ...block, isCollapsed: !block.isCollapsed };
        }
        if (block.children && block.children.length > 0) {
          return { ...block, children: toggleRecursive(block.children) };
        }
        return block;
      });
    };
    setCanvasBlocks(prev => toggleRecursive(prev));
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
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
    console.log(generatedCode);
    console.log("--- Simulation End ---");
    toast({
      title: "Simulation Started",
      description: "Check the browser console for simulated output.",
    });
  };

  const handleSaveToFile = () => {
    try {
      const blob = new Blob([generatedCode], { type: 'text/python' });
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


  if (!isClient) {
    return null;
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background text-foreground">
      <BlockPanel
        availableBlocks={AVAILABLE_BLOCKS}
        onSimulate={handleSimulate}
        onCopyCode={handleCopyCode}
        onSaveFile={handleSaveToFile}
        isCodeCopied={copied}
      />
      <MainCanvas
        canvasBlocks={canvasBlocks}
        availableBlocks={AVAILABLE_BLOCKS}
        onBlockDrop={handleBlockDrop}
        onParamChange={handleParamChange}
        onRemoveBlock={handleRemoveBlock}
        onToggleBlockCollapse={handleToggleBlockCollapse}
      />
      <CodeVisualizer code={generatedCode} />
    </div>
  );
}
