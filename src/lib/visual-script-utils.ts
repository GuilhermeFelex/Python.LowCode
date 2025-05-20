
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
      { id: 'message', name: 'Message', type: 'string', defaultValue: 'Hello World', placeholder: 'Enter message' },
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
    canHaveChildren: true, // Allows nesting
    codeTemplate: (params) => `for ${params.loopVariable} in range(${params.count}):`, // Children will be handled by generatePythonCode
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
    id: 'http_request',
    name: 'HTTP Request',
    description: 'Makes an HTTP request to a URL using a specified method, headers, body, and authentication.',
    icon: Webhook,
    category: 'Network',
    parameters: [
      { 
        id: 'method', 
        name: 'Method', 
        type: 'select', 
        defaultValue: 'GET',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' },
        ]
      },
      { id: 'url', name: 'URL', type: 'string', defaultValue: 'https://api.example.com/data', placeholder: 'https://...' },
      { id: 'headers', name: 'Headers (key: value, one per line)', type: 'textarea', defaultValue: '', placeholder: 'Content-Type: application/json\nAuthorization: Bearer your_token' },
      { 
        id: 'body', 
        name: 'Body (e.g., JSON)', 
        type: 'textarea', 
        defaultValue: '', 
        placeholder: '{\n  "key": "value"\n}',
        condition: { paramId: 'method', paramValue: ['POST', 'PUT', 'PATCH'] } // Show only for these methods
      },
      {
        id: 'authType',
        name: 'Authentication',
        type: 'select',
        defaultValue: 'None',
        options: [
          { value: 'None', label: 'None' },
          { value: 'Bearer Token', label: 'Bearer Token' },
          { value: 'Basic Auth', label: 'Basic Auth (user:pass)' },
        ]
      },
      {
        id: 'authToken',
        name: 'Bearer Token',
        type: 'password',
        defaultValue: '',
        placeholder: 'Enter Bearer Token',
        condition: { paramId: 'authType', paramValue: 'Bearer Token' }
      },
      {
        id: 'authBasicUser',
        name: 'Basic Auth Username',
        type: 'string',
        defaultValue: '',
        placeholder: 'Enter Username',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      {
        id: 'authBasicPass',
        name: 'Basic Auth Password',
        type: 'password',
        defaultValue: '',
        placeholder: 'Enter Password',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      { id: 'responseVariable', name: 'Store Response In', type: 'string', defaultValue: 'response_data', placeholder: 'Variable name' },
    ],
    codeTemplate: (params) => {
      const method = params.method || 'GET';
      const url = params.url;
      const responseVar = params.responseVariable;
      const rawHeaders = params.headers;
      const body = params.body;
      const authType = params.authType;
      const authToken = params.authToken;
      const authUser = params.authBasicUser;
      const authPass = params.authBasicPass;

      let codeLines = [
        `# Requires 'requests' library: pip install requests`,
        `import requests # Make sure to uncomment if you run this code`,
        `simulated_headers = {}`,
        `simulated_auth = None`,
        `simulated_body_payload = None`,
      ];
      
      // Process Headers
      if (rawHeaders) {
        codeLines.push(`# Processing provided headers:`);
        codeLines.push(`raw_headers_str = """${rawHeaders}"""`);
        codeLines.push(`for header_line in raw_headers_str.strip().split('\\n'):`);
        codeLines.push(`    if ':' in header_line:`);
        codeLines.push(`        key, value = header_line.split(':', 1)`);
        codeLines.push(`        simulated_headers[key.strip()] = value.strip()`);
      }

      // Process Authentication
      if (authType === 'Bearer Token' && authToken) {
        codeLines.push(`# Authentication: Bearer Token`);
        codeLines.push(`simulated_headers['Authorization'] = f"Bearer ${authToken}"`);
      } else if (authType === 'Basic Auth' && authUser && authPass) {
        codeLines.push(`# Authentication: Basic Auth`);
        codeLines.push(`simulated_auth = ('${authUser}', '${authPass}')`);
      }
      
      // Process Body for relevant methods
      const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
      if (bodyRelevantMethods.includes(method.toUpperCase()) && body) {
        codeLines.push(`# Request Body for ${method}:`);
        codeLines.push(`# Assuming JSON body, but could be other formats.`);
        codeLines.push(`# For actual use, parse/validate JSON if necessary:`);
        codeLines.push(`# import json`);
        codeLines.push(`# simulated_body_payload = json.loads("""${body}""")`);
        codeLines.push(`simulated_body_payload = """${body}""" # As a string for simulation`);
      }
      
      // Construct simulated request call
      codeLines.push(`\n# Simulating the HTTP request:`);
      let reqArgs = [`"${url}"`];
      if (Object.keys(params).includes('headers') || authType === 'Bearer Token') { // Check if headers param exists or Bearer token to include headers arg
        reqArgs.push(`headers=simulated_headers`);
      }
      if (authType === 'Basic Auth' && authUser && authPass) {
        reqArgs.push(`auth=simulated_auth`);
      }
      if (bodyRelevantMethods.includes(method.toUpperCase()) && body) {
        // Assuming JSON for simplicity in requests call, 'data' for other types
        codeLines.push(`# For JSON, use 'json=simulated_body_payload' if it's a dict. For raw string, use 'data=simulated_body_payload'.`);
        reqArgs.push(`data=simulated_body_payload # Example with data, adjust for json if parsed to dict`);
      }
      
      codeLines.push(`${responseVar} = "--- SIMULATED RESPONSE ---" # Placeholder for actual request`);
      codeLines.push(`# try:`);
      codeLines.push(`#     response = requests.${method.toLowerCase()}(${reqArgs.join(', ')})`);
      codeLines.push(`#     response.raise_for_status() # Raise an exception for HTTP errors`);
      codeLines.push(`#     ${responseVar} = response.json() # or response.text, response.content`);
      codeLines.push(`# except requests.exceptions.RequestException as e:`);
      codeLines.push(`#     ${responseVar} = f"Error: {e}"`);
      codeLines.push(`#     print(${responseVar})`);
      codeLines.push(`\nprint(f"Simulated ${method} to {url}")`);
      codeLines.push(`print(f"Response (simulated) stored in: ${responseVar}")`);
      codeLines.push(`print(f"Value of ${responseVar}: {${responseVar}}")`);
      
      return codeLines.join('\n');
    },
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

function generateCodeRecursive(blocks: CanvasBlock[], availableBlocks: Block[], indentLevel = 0): string[] {
  const lines: string[] = [];
  const indent = '    '.repeat(indentLevel);

  blocks.forEach(canvasBlock => {
    const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
    if (blockDefinition) {
      try {
        // Split multiline templates and indent each line
        const generatedBlockCode = blockDefinition.codeTemplate(canvasBlock.params);
        generatedBlockCode.split('\n').forEach(line => {
          lines.push(indent + line);
        });

        if (blockDefinition.canHaveChildren) {
          if (canvasBlock.children && canvasBlock.children.length > 0) {
            lines.push(...generateCodeRecursive(canvasBlock.children, availableBlocks, indentLevel + 1));
          } else {
            // Add 'pass' for empty control flow blocks like loops or if-statements
            lines.push(indent + '    pass');
          }
        }
      } catch (error) {
        console.error("Error generating code for block:", blockDefinition, error);
        lines.push(indent + `# Error generating code for block ${blockDefinition.name}`);
      }
    }
  });
  return lines;
}

export function generatePythonCode(canvasBlocks: CanvasBlock[], availableBlocks: Block[]): string {
  if (!canvasBlocks.length) {
    return '# Drag and drop blocks to generate Python code.';
  }

  const codeLines: string[] = [
    '# Visual Script Generated Code',
    '# Note: Some blocks might require specific libraries (e.g., requests for HTTP).',
    ''
  ];

  codeLines.push(...generateCodeRecursive(canvasBlocks, availableBlocks, 0));
  return codeLines.join('\n');
}
