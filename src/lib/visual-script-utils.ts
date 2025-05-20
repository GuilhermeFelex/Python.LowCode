
import type { Block, CanvasBlock } from '@/types/visual-script';
import { Terminal, FileText, Repeat, Puzzle, Webhook, FunctionSquare, Variable } from 'lucide-react';

// Helper function to determine if a string is a valid number
function isNumeric(str: string): boolean {
  if (typeof str !== 'string') return false;
  // Check if it's a non-empty string and can be converted to a number that is finite
  const num = Number(str);
  return str.trim() !== '' && !isNaN(num) && isFinite(num);
}

// Helper to escape string for Python and ensure it's properly quoted for use in templates
function formatPythonStringLiteral(value: string): string {
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escapedValue}"`;
}

function formatPythonMultilineStringLiteral(value: string): string {
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""');
  return `"""${escapedValue}"""`;
}


export const AVAILABLE_BLOCKS: Block[] = [
  {
    id: 'print_message',
    name: 'Print Message',
    description: 'Prints a message to the console.',
    icon: Terminal,
    category: 'Output',
    parameters: [
      { id: 'message', name: 'Message', type: 'string', defaultValue: 'Hello World', placeholder: 'Enter message or variable name' },
    ],
    codeTemplate: (params) => `print(${params.message})`,
  },
  {
    id: 'read_file',
    name: 'Read File',
    description: 'Reads content from a specified file.',
    icon: FileText,
    category: 'File IO',
    parameters: [
      { id: 'filePath', name: 'File Path', type: 'string', defaultValue: './my_file.txt', placeholder: 'e.g., /path/to/file.txt or variable' },
      { id: 'variableName', name: 'Store in Variable', type: 'string', defaultValue: 'file_content', placeholder: 'Variable name' },
    ],
    // params.filePath will be pre-processed to be either a variable name or a quoted string
    // params.variableName is a raw string for the variable identifier
    codeTemplate: (params) => `${params.variableName} = open(${params.filePath}, "r").read()`,
  },
  {
    id: 'loop_range',
    name: 'Loop (Range)',
    description: 'Repeats actions a number of times.',
    icon: Repeat,
    category: 'Logic',
    parameters: [
      { id: 'count', name: 'Iterations', type: 'number', defaultValue: '5', placeholder: 'e.g., 10 or variable' },
      { id: 'loopVariable', name: 'Loop Variable', type: 'string', defaultValue: 'i', placeholder: 'e.g., i' },
    ],
    canHaveChildren: true,
    // params.count is pre-processed (var or number literal), params.loopVariable is raw
    codeTemplate: (params) => `for ${params.loopVariable} in range(${params.count}):`,
  },
  {
    id: 'define_variable',
    name: 'Define Variable',
    description: 'Defines a variable with a value.',
    icon: Variable,
    category: 'Data',
    parameters: [
      { id: 'variableName', name: 'Variable Name', type: 'string', defaultValue: 'my_var', placeholder: 'e.g., age' },
      { id: 'value', name: 'Value', type: 'string', defaultValue: '""', placeholder: 'e.g., "John", 42, or other_variable' },
    ],
    // params.variableName is raw, params.value is pre-processed (var, number literal, or string literal)
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
      { id: 'url', name: 'URL', type: 'string', defaultValue: 'https://api.example.com/data', placeholder: 'https://... or variable' },
      { id: 'headers', name: 'Headers (key: value, one per line, or variable name for dict)', type: 'textarea', defaultValue: '', placeholder: 'Content-Type: application/json\nAuthorization: Bearer token_var\nOR\nmy_headers_dict_var' },
      {
        id: 'body',
        name: 'Body (e.g., JSON string, or variable name for data/dict)',
        type: 'textarea',
        defaultValue: '',
        placeholder: '{\n  "key": "value"\n}\nOR\nmy_body_data_var',
        condition: { paramId: 'method', paramValue: ['POST', 'PUT', 'PATCH'] }
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
        type: 'password', // Treated as string for variable check
        defaultValue: '',
        placeholder: 'Enter Bearer Token or variable name',
        condition: { paramId: 'authType', paramValue: 'Bearer Token' }
      },
      {
        id: 'authBasicUser',
        name: 'Basic Auth Username',
        type: 'string',
        defaultValue: '',
        placeholder: 'Enter Username or variable name',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      {
        id: 'authBasicPass',
        name: 'Basic Auth Password',
        type: 'password', // Treated as string for variable check
        defaultValue: '',
        placeholder: 'Enter Password or variable name',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      { id: 'responseVariable', name: 'Store Response In', type: 'string', defaultValue: 'response_data', placeholder: 'Variable name' },
    ],
    codeTemplate: (params) => {
      // params are pre-processed. e.g. params.url is either `my_url_var` or `"https://literal.com"`
      // params.method is a quoted string like `"GET"`
      // params.headers is `my_headers_var` or `"""multiline literal"""`
      // params.body is `my_body_var` or `"""multiline literal"""` or `None` (if not applicable)
      // params.responseVariable is a raw variable name string.

      const method = params.method.replace(/"/g, ''); // Unquote method for use in f-string or direct call
      const responseVar = params.responseVariable; // This is a raw variable name

      let codeLines = [
        `# HTTP Request Block`,
        `# Ensure 'requests' library is installed: pip install requests`,
        `import requests  # Make sure to uncomment if you run this code`,
        ``,
        `_url = ${params.url}`,
        `_headers = {}`,
        `_auth = None`,
        `_body_payload = None`,
        `_method_str = "${method.toLowerCase()}"`,
        ``,
      ];

      // Handle headers: params.headers is either a variable name or a """multiline string"""
      codeLines.push(`# Processing Headers:`);
      codeLines.push(`_raw_headers_input = ${params.headers}`);
      codeLines.push(`if isinstance(_raw_headers_input, dict):`);
      codeLines.push(`    _headers = _raw_headers_input`);
      codeLines.push(`elif isinstance(_raw_headers_input, str) and _raw_headers_input.strip():`);
      codeLines.push(`    for header_line in _raw_headers_input.strip().split('\\n'):`);
      codeLines.push(`        if ':' in header_line:`);
      codeLines.push(`            key, value = header_line.split(':', 1)`);
      codeLines.push(`            _headers[key.strip()] = value.strip()`);
      codeLines.push(``);


      const authType = params.authType.replace(/"/g, ''); // Unquote
      if (authType === 'Bearer Token') {
        codeLines.push(`# Authentication: Bearer Token`);
        codeLines.push(`_bearer_token = ${params.authToken}`);
        codeLines.push(`_headers['Authorization'] = f"Bearer {_bearer_token}"`);
      } else if (authType === 'Basic Auth') {
        codeLines.push(`# Authentication: Basic Auth`);
        codeLines.push(`_basic_user = ${params.authBasicUser}`);
        codeLines.push(`_basic_pass = ${params.authBasicPass}`);
        codeLines.push(`_auth = (_basic_user, _basic_pass)`);
      }
      codeLines.push(``);

      const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
      if (bodyRelevantMethods.includes(method.toUpperCase())) {
        codeLines.push(`# Request Body for ${method}:`);
        codeLines.push(`_raw_body_input = ${params.body}`);
        codeLines.push(`_body_payload = _raw_body_input # Assumes it's a string or already a dict/None if variable`);
        codeLines.push(`# For actual use with requests, if _body_payload is a JSON string, you might want:`);
        codeLines.push(`# import json`);
        codeLines.push(`# try: _body_payload = json.loads(_raw_body_input)`);
        codeLines.push(`# except json.JSONDecodeError: pass # keep as string if not valid JSON`);
        codeLines.push(``);
      }

      codeLines.push(`# Simulating the HTTP request:`);
      let reqArgs = [`_url`];
      reqArgs.push(`headers=_headers`);
      if (authType === 'Basic Auth') {
        reqArgs.push(`auth=_auth`);
      }

      if (bodyRelevantMethods.includes(method.toUpperCase())) {
        codeLines.push(`# For JSON, use 'json=_body_payload' if it's a dict. For raw string, use 'data=_body_payload'.`);
        codeLines.push(`# This example uses 'data' assuming string body or form data.`);
        reqArgs.push(`data=_body_payload`);
      }

      codeLines.push(`${responseVar} = "--- SIMULATED RESPONSE ---" # Placeholder for actual request result`);
      codeLines.push(`# try:`);
      codeLines.push(`#     response = requests.request(method=_method_str, ${reqArgs.join(', ')})`);
      codeLines.push(`#     response.raise_for_status() # Raise an exception for HTTP errors`);
      codeLines.push(`#     # Process response: response.json(), response.text, response.content`);
      codeLines.push(`#     ${responseVar} = response.text # Example: store text response`);
      codeLines.push(`# except requests.exceptions.RequestException as e:`);
      codeLines.push(`#     ${responseVar} = f"Error: {e}"`);
      codeLines.push(`#     print(${responseVar})`);
      codeLines.push(``);
      codeLines.push(`print(f"Simulated {method} to {_url}")`);
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
      { id: 'functionName', name: 'Function Name', type: 'string', defaultValue: 'my_custom_function', placeholder: 'Function name or variable' },
      { id: 'args', name: 'Arguments (comma-sep, use var names or literals)', type: 'string', defaultValue: '', placeholder: 'arg_var, "string_literal", 123' },
      { id: 'outputVar', name: 'Store Result In (optional)', type: 'string', defaultValue: '', placeholder: 'result_variable' },
    ],
    codeTemplate: (params) => {
      // params.functionName is pre-processed. params.args is a string that needs to be used as is.
      // params.outputVar is a raw variable name.
      const args = params.args ? params.args.replace(/"/g, '') : ''; // Use raw args string. User must quote literals.
      const funcCall = `${params.functionName}(${args})`;
      if (params.outputVar) {
        return `${params.outputVar} = ${funcCall}`;
      }
      return funcCall;
    }
  },
];

function generateCodeRecursive(
  blocks: CanvasBlock[],
  availableBlocks: Block[],
  indentLevel = 0,
  currentDefinedVariables: Set<string>
): string[] {
  const lines: string[] = [];
  const indent = '    '.repeat(indentLevel);
  // Create a new set for this scope to not affect sibling scopes at higher levels
  let blockScopedDefinedVariables = new Set(currentDefinedVariables);

  blocks.forEach(canvasBlock => {
    const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
    if (blockDefinition) {
      const processedParams: Record<string, string> = {};

      // Pre-process parameters
      for (const paramDef of blockDefinition.parameters) {
        const paramId = paramDef.id;
        // For variableName parameters (like in define_variable, read_file, loop_range), we want the raw user input.
        if (paramId === 'variableName' || paramId === 'loopVariable' || paramId === 'responseVariable' || paramId === 'outputVar') {
          processedParams[paramId] = canvasBlock.params[paramId] ?? paramDef.defaultValue;
          continue;
        }
        
        const rawValue = canvasBlock.params[paramId] ?? paramDef.defaultValue;

        if (blockDefinition.id === 'define_variable' && paramId === 'value') {
          if (blockScopedDefinedVariables.has(rawValue)) {
            processedParams[paramId] = rawValue;
          } else if (isNumeric(rawValue)) {
            processedParams[paramId] = rawValue;
          } else {
            processedParams[paramId] = formatPythonStringLiteral(rawValue);
          }
        } else if (paramDef.type === 'textarea') {
          // For textareas, if the exact content is a variable name, use it. Otherwise, treat as multiline string.
          if (blockScopedDefinedVariables.has(rawValue.trim())) {
             processedParams[paramId] = rawValue.trim();
          } else {
            // Check if body is applicable for HTTP request
            if (blockDefinition.id === 'http_request' && paramId === 'body') {
                const methodParam = blockDefinition.parameters.find(p => p.id === 'method');
                const currentMethod = (canvasBlock.params[methodParam!.id] ?? methodParam!.defaultValue).toUpperCase();
                const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
                if (bodyRelevantMethods.includes(currentMethod)) {
                    processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
                } else {
                    processedParams[paramId] = "None"; // Body not applicable
                }
            } else {
                 processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
            }
          }
        } else if (blockScopedDefinedVariables.has(rawValue)) {
          // If the rawValue matches a defined variable, use the variable name directly
          processedParams[paramId] = rawValue;
        } else {
          // Otherwise, treat as a literal value based on its type
          if (paramDef.type === 'string' || paramDef.type === 'password' || paramDef.type === 'select') {
            processedParams[paramId] = formatPythonStringLiteral(rawValue);
          } else if (paramDef.type === 'number') {
            if (isNumeric(rawValue)) {
              processedParams[paramId] = rawValue; // It's a number literal
            } else {
              // Non-numeric value for a number field, could be an error or intended string, quote it.
              processedParams[paramId] = formatPythonStringLiteral(rawValue);
            }
          } else {
            // Fallback for other types (e.g. boolean, though not explicitly handled here)
            // Safest to treat as a string if unsure, or handle specific types
            processedParams[paramId] = formatPythonStringLiteral(rawValue);
          }
        }
      }
      
      // For custom_function 'args' parameter, it's a raw string from user, not to be quoted entirely
      if (blockDefinition.id === 'custom_function' && processedParams.args) {
        // The user is responsible for quoting string literals within the args string, e.g., "str_val", var_name, 123
        // We just pass it through. The template handles it.
        // However, `canvasBlock.params.args` should be used directly if present
         processedParams.args = canvasBlock.params.args ?? blockDefinition.parameters.find(p=>p.id === 'args')!.defaultValue;
      }


      try {
        const generatedBlockCode = blockDefinition.codeTemplate(processedParams);
        generatedBlockCode.split('\n').forEach(line => {
          lines.push(indent + line);
        });

        if (blockDefinition.id === 'define_variable') {
          const varName = canvasBlock.params.variableName;
          if (varName) {
            blockScopedDefinedVariables.add(varName.trim());
          }
        } else if (blockDefinition.id === 'read_file') {
          const varName = canvasBlock.params.variableName;
           if (varName) {
            blockScopedDefinedVariables.add(varName.trim());
          }
        } else if (blockDefinition.id === 'http_request') {
          const varName = canvasBlock.params.responseVariable;
           if (varName) {
            blockScopedDefinedVariables.add(varName.trim());
          }
        } else if (blockDefinition.id === 'custom_function' && canvasBlock.params.outputVar) {
           const varName = canvasBlock.params.outputVar;
           if (varName) {
            blockScopedDefinedVariables.add(varName.trim());
          }
        }


        if (blockDefinition.canHaveChildren) {
          if (canvasBlock.children && canvasBlock.children.length > 0) {
            lines.push(...generateCodeRecursive(canvasBlock.children, availableBlocks, indentLevel + 1, blockScopedDefinedVariables));
          } else {
            lines.push(indent + '    pass');
          }
        }
      } catch (error) {
        // My fix: provide more context on error
        console.error("Error generating code for block:", blockDefinition.name, "Instance:", canvasBlock.instanceId, "Params:", processedParams, "Error:", error);
        lines.push(indent + `# Error generating code for block ${blockDefinition.name} (ID: ${canvasBlock.instanceId})`);
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

  // Initialize with an empty set for top-level defined variables
  codeLines.push(...generateCodeRecursive(canvasBlocks, availableBlocks, 0, new Set<string>()));
  return codeLines.join('\n');
}
