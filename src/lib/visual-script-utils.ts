import type { Block, CanvasBlock } from '@/types/visual-script';
import { Terminal, FileText, Repeat, Puzzle, Webhook, FunctionSquare, Variable } from 'lucide-react';

export const AVAILABLE_BLOCKS: Block[] = [
  {
    id: 'print_message',
    name: 'Print Message',
    description: 'Prints a message to the console.',
    icon: Terminal,
    category: 'Output',
    parameters: [
      { id: 'message', name: 'Message', type: 'string', defaultValue: 'Hello, Visual Script!', placeholder: 'Enter message' },
    ],
    codeTemplate: (params) => `print(f"${params.message}")`,
  },
  {
    id: 'read_file',
    name: 'Read File',
    description: 'Reads content from a specified file.',
    icon: FileText,
    category: 'File IO',
    parameters: [
      { id: 'filePath', name: 'File Path', type: 'string', defaultValue: './my_file.txt', placeholder: 'e.g., /path/to/file.txt' },
      { id: 'variableName', name: 'Store in Variable', type: 'string', defaultValue: 'file_content', placeholder: 'Variable name' },
    ],
    codeTemplate: (params) => `${params.variableName} = open("${params.filePath}", "r").read()`,
  },
  {
    id: 'loop_range',
    name: 'Loop (Range)',
    description: 'Repeats actions a number of times.',
    icon: Repeat,
    category: 'Logic',
    parameters: [
      { id: 'count', name: 'Iterations', type: 'number', defaultValue: '5', placeholder: 'e.g., 10' },
      { id: 'loopVariable', name: 'Loop Variable', type: 'string', defaultValue: 'i', placeholder: 'e.g., i' },
    ],
    codeTemplate: (params) => `for ${params.loopVariable} in range(${params.count}):\n    pass # Add blocks inside loop (not supported by simple generation)`,
  },
  {
    id: 'define_variable',
    name: 'Define Variable',
    description: 'Defines a variable with a value.',
    icon: Variable,
    category: 'Data',
    parameters: [
      { id: 'variableName', name: 'Variable Name', type: 'string', defaultValue: 'my_var', placeholder: 'e.g., age' },
      { id: 'value', name: 'Value', type: 'string', defaultValue: '""', placeholder: 'e.g., "John" or 42' },
    ],
    codeTemplate: (params) => `${params.variableName} = ${params.value}`,
  },
  {
    id: 'http_get_request',
    name: 'HTTP GET Request',
    description: 'Makes an HTTP GET request to a URL.',
    icon: Webhook,
    category: 'Network',
    parameters: [
      { id: 'url', name: 'URL', type: 'string', defaultValue: 'https://api.example.com/data', placeholder: 'https://...' },
      { id: 'responseVariable', name: 'Store Response In', type: 'string', defaultValue: 'response_data', placeholder: 'Variable name' },
    ],
    // This is a simplified example; actual HTTP requests in Python need a library like 'requests'
    codeTemplate: (params) => `# Requires 'requests' library: pip install requests\n# import requests\n# ${params.responseVariable} = requests.get("${params.url}").json() \nprint(f"Simulated GET request to {${params.url}}, storing in {${params.responseVariable}}")`,
  },
  {
    id: 'custom_function',
    name: 'Custom Function',
    description: 'Represents a custom Python function call.',
    icon: FunctionSquare,
    category: 'Advanced',
    parameters: [
      { id: 'functionName', name: 'Function Name', type: 'string', defaultValue: 'my_custom_function', placeholder: 'Function name' },
      { id: 'args', name: 'Arguments (comma-sep)', type: 'string', defaultValue: '', placeholder: 'arg1, "string_arg"' },
      { id: 'outputVar', name: 'Store Result In (optional)', type: 'string', defaultValue: '', placeholder: 'result_variable' },
    ],
    codeTemplate: (params) => {
      const args = params.args ? params.args : '';
      if (params.outputVar) {
        return `${params.outputVar} = ${params.functionName}(${args})`;
      }
      return `${params.functionName}(${args})`;
    }
  },
];

export function generatePythonCode(canvasBlocks: CanvasBlock[], availableBlocks: Block[]): string {
  if (!canvasBlocks.length) {
    return '# Drag and drop blocks to generate Python code.';
  }

  const codeLines: string[] = [
    '# Visual Script Generated Code',
    '# Note: Some blocks might require specific libraries (e.g., requests for HTTP).',
    ''
  ];

  canvasBlocks.forEach(canvasBlock => {
    const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
    if (blockDefinition) {
      try {
        const generatedLine = blockDefinition.codeTemplate(canvasBlock.params);
        codeLines.push(generatedLine);
      } catch (error) {
        console.error("Error generating code for block:", blockDefinition, error);
        codeLines.push(`# Error generating code for block ${blockDefinition.name}`);
      }
    }
  });

  return codeLines.join('\n');
}
