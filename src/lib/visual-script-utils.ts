
import type { Block, CanvasBlock } from '@/types/visual-script';
import { Terminal, FileText, Repeat, Puzzle, Webhook, FunctionSquare, Variable, MousePointerSquareDashed, Database, FileUp, FileDown, ScanText } from 'lucide-react';

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
        type: 'password',
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
        type: 'password',
        defaultValue: '',
        placeholder: 'Enter Password or variable name',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      { id: 'responseVariable', name: 'Store Response In', type: 'string', defaultValue: 'response_data', placeholder: 'Variable name' },
    ],
    codeTemplate: (params) => {
      const method = params.method.replace(/"/g, ''); 
      const responseVar = params.responseVariable; 

      let codeLines = [
        `# HTTP Request Block - Ensure 'requests' library is installed: pip install requests`,
        `# import requests # Uncomment if you run this code`,
        ``,
        `_url = ${params.url}`,
        `_headers = {}`,
        `_auth = None`,
        `_body_payload = None`,
        `_method_str = "${method.toLowerCase()}"`,
        ``,
      ];

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


      const authType = params.authType.replace(/"/g, '');
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
        codeLines.push(`_raw_body_input = ${params.body}`); // params.body is pre-processed
        codeLines.push(`_body_payload = _raw_body_input`);
        codeLines.push(``);
      }

      codeLines.push(`# Simulating the HTTP request:`);
      let reqArgs = [`_url`];
      reqArgs.push(`headers=_headers`);
      if (authType === 'Basic Auth') {
        reqArgs.push(`auth=_auth`);
      }

      if (bodyRelevantMethods.includes(method.toUpperCase())) {
        reqArgs.push(`data=_body_payload`);
      }

      codeLines.push(`${responseVar} = "--- SIMULATED RESPONSE ---" # Placeholder`);
      codeLines.push(`# try:`);
      codeLines.push(`#     response = requests.request(method=_method_str, ${reqArgs.join(', ')})`);
      codeLines.push(`#     response.raise_for_status()`);
      codeLines.push(`#     ${responseVar} = response.text`);
      codeLines.push(`# except requests.exceptions.RequestException as e:`);
      codeLines.push(`#     ${responseVar} = f"Error: {e}"`);
      codeLines.push(`#     print(${responseVar})`);
      codeLines.push(``);
      codeLines.push(`print(f"Simulated {method} to {_url}. Response in ${responseVar}: {{${responseVar}}}")`);

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
      const args = params.args ? params.args : ''; 
      const funcCall = `${params.functionName}(${args})`;
      if (params.outputVar) {
        return `${params.outputVar} = ${funcCall}`;
      }
      return funcCall;
    }
  },
  // PyAutoGUI Blocks
  {
    id: 'pyautogui_move_to',
    name: 'Move Mouse',
    description: 'Moves the mouse cursor to the specified X and Y coordinates.',
    icon: MousePointerSquareDashed,
    category: 'GUI Automation (PyAutoGUI)',
    parameters: [
      { id: 'x_coord', name: 'X Coordinate', type: 'number', defaultValue: '100', placeholder: 'e.g., 100 or var_x' },
      { id: 'y_coord', name: 'Y Coordinate', type: 'number', defaultValue: '100', placeholder: 'e.g., 100 or var_y' },
      { id: 'duration', name: 'Duration (seconds)', type: 'number', defaultValue: '0.25', placeholder: 'e.g., 0.5 or var_duration' },
    ],
    codeTemplate: (params) => `# Ensure 'pyautogui' is installed: pip install pyautogui\n# import pyautogui # Uncomment\npyautogui.moveTo(${params.x_coord}, ${params.y_coord}, duration=${params.duration})`,
  },
  {
    id: 'pyautogui_click',
    name: 'Click Mouse',
    description: 'Performs a mouse click at the current or specified coordinates.',
    icon: MousePointerSquareDashed,
    category: 'GUI Automation (PyAutoGUI)',
    parameters: [
      { id: 'x_coord', name: 'X Coordinate (optional)', type: 'string', defaultValue: '', placeholder: 'e.g., 100 or var_x (blank for current)' },
      { id: 'y_coord', name: 'Y Coordinate (optional)', type: 'string', defaultValue: '', placeholder: 'e.g., 100 or var_y (blank for current)' },
      { id: 'button', name: 'Button', type: 'select', defaultValue: 'left', options: [
          { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'middle', label: 'Middle' }
        ]
      },
    ],
    codeTemplate: (params) => {
      const x = params.x_coord && params.x_coord !== '""' ? `x=${params.x_coord}` : '';
      const y = params.y_coord && params.y_coord !== '""' ? `y=${params.y_coord}` : '';
      const clickArgs = [x,y, `button=${params.button}`].filter(Boolean).join(', ');
      return `# Ensure 'pyautogui' is installed: pip install pyautogui\n# import pyautogui # Uncomment\npyautogui.click(${clickArgs})`;
    },
  },
  {
    id: 'pyautogui_typewrite',
    name: 'Type Text',
    description: 'Types the given string of characters.',
    icon: ScanText, 
    category: 'GUI Automation (PyAutoGUI)',
    parameters: [
      { id: 'text_to_type', name: 'Text to Type', type: 'string', defaultValue: 'Hello!', placeholder: 'Enter text or variable name' },
      { id: 'interval', name: 'Interval (sec, per char)', type: 'number', defaultValue: '0.1', placeholder: 'e.g., 0.05 or var_interval' },
    ],
    codeTemplate: (params) => `# Ensure 'pyautogui' is installed: pip install pyautogui\n# import pyautogui # Uncomment\npyautogui.typewrite(${params.text_to_type}, interval=${params.interval})`,
  },
  {
    id: 'pyautogui_screenshot',
    name: 'Take Screenshot',
    description: 'Takes a screenshot and saves it to a file, or stores it in a variable.',
    icon: Puzzle, // Using a generic icon
    category: 'GUI Automation (PyAutoGUI)',
    parameters: [
      { id: 'filename', name: 'Filename (optional)', type: 'string', defaultValue: 'screenshot.png', placeholder: 'e.g., my_screenshot.png or var (blank to not save)' },
      { id: 'variableName', name: 'Store Image In (optional)', type: 'string', defaultValue: '', placeholder: 'Variable name for image object' },
    ],
    codeTemplate: (params) => {
      let code = `# Ensure 'pyautogui' is installed: pip install pyautogui\n# import pyautogui # Uncomment\n`;
      const filenameParam = params.filename === '""' ? '' : params.filename; // Handle empty string case
      if (params.variableName) {
        code += `${params.variableName} = pyautogui.screenshot(${filenameParam ? filenameParam : ''})\n`;
        code += `print(f"Screenshot taken and stored in variable '${params.variableName}'.")\n`;
        if (filenameParam) {
          code += `print(f"Also saved to file: {${filenameParam}}")`;
        }
      } else if (filenameParam) {
        code += `pyautogui.screenshot(${filenameParam})\n`;
        code += `print(f"Screenshot saved to file: {${filenameParam}}")`;
      } else {
        code += `pyautogui.screenshot()\n`;
        code += `print("Screenshot taken (not saved to file or variable).")`;
      }
      return code;
    },
  },
  // Pandas Blocks
  {
    id: 'pandas_read_csv',
    name: 'Read CSV (Pandas)',
    description: 'Reads a CSV file into a Pandas DataFrame.',
    icon: FileDown,
    category: 'Data Manipulation (Pandas)',
    parameters: [
      { id: 'filePath', name: 'File Path', type: 'string', defaultValue: 'data.csv', placeholder: 'e.g., /path/to/data.csv or var' },
      { id: 'variableName', name: 'Store DataFrame In', type: 'string', defaultValue: 'df', placeholder: 'Variable name for DataFrame' },
    ],
    codeTemplate: (params) => `# Ensure 'pandas' is installed: pip install pandas\n# import pandas as pd # Uncomment\n${params.variableName} = pd.read_csv(${params.filePath})\nprint(f"CSV file {${params.filePath}} loaded into DataFrame '${params.variableName}'.")`,
  },
  {
    id: 'pandas_to_csv',
    name: 'DataFrame to CSV (Pandas)',
    description: 'Writes a Pandas DataFrame to a CSV file.',
    icon: FileUp,
    category: 'Data Manipulation (Pandas)',
    parameters: [
      { id: 'dataFrameVariable', name: 'DataFrame Variable', type: 'string', defaultValue: 'df', placeholder: 'Name of DataFrame variable' },
      { id: 'filePath', name: 'Output File Path', type: 'string', defaultValue: 'output.csv', placeholder: 'e.g., /path/to/output.csv or var' },
      { id: 'includeIndex', name: 'Include Index', type: 'select', defaultValue: 'False', options: [
          { value: 'True', label: 'Yes' }, { value: 'False', label: 'No' }
        ]
      },
    ],
    codeTemplate: (params) => `# Ensure 'pandas' is installed: pip install pandas\n# import pandas as pd # Uncomment\n${params.dataFrameVariable}.to_csv(${params.filePath}, index=${params.includeIndex})\nprint(f"DataFrame '${params.dataFrameVariable}' saved to CSV file {${params.filePath}}.")`,
  },
  {
    id: 'pandas_df_head',
    name: 'Show DataFrame Head (Pandas)',
    description: 'Prints the first n rows of a DataFrame.',
    icon: Database,
    category: 'Data Manipulation (Pandas)',
    parameters: [
      { id: 'dataFrameVariable', name: 'DataFrame Variable', type: 'string', defaultValue: 'df', placeholder: 'Name of DataFrame variable' },
      { id: 'numRows', name: 'Number of Rows', type: 'number', defaultValue: '5', placeholder: 'e.g., 5 or var_rows' },
    ],
    codeTemplate: (params) => `# Ensure 'pandas' is installed: pip install pandas\n# import pandas as pd # Uncomment\nprint(f"First {${params.numRows}} rows of DataFrame '${params.dataFrameVariable}':")\nprint(${params.dataFrameVariable}.head(${params.numRows}))`,
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
  let blockScopedDefinedVariables = new Set(currentDefinedVariables);

  blocks.forEach(canvasBlock => {
    const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
    if (blockDefinition) {
      const processedParams: Record<string, string> = {};

      for (const paramDef of blockDefinition.parameters) {
        const paramId = paramDef.id;
        const rawValue = canvasBlock.params[paramId] ?? paramDef.defaultValue;

        if (paramId === 'variableName' || paramId === 'loopVariable' || paramId === 'responseVariable' || paramId === 'outputVar' || paramId === 'dataFrameVariable') {
          processedParams[paramId] = rawValue;
          continue;
        }
        
        // Special handling for pyautogui_click optional coordinates - allow empty string to mean None
        if (blockDefinition.id === 'pyautogui_click' && (paramId === 'x_coord' || paramId === 'y_coord')) {
            if (rawValue.trim() === '' || rawValue === '""') {
                 processedParams[paramId] = '""'; // Will be handled in template to convert to None or omit
            } else if (blockScopedDefinedVariables.has(rawValue)) {
                processedParams[paramId] = rawValue;
            } else if (isNumeric(rawValue)) {
                 processedParams[paramId] = rawValue;
            } else {
                 processedParams[paramId] = formatPythonStringLiteral(rawValue);
            }
            continue;
        }
         // Special handling for pyautogui_screenshot filename - allow empty for no save
        if (blockDefinition.id === 'pyautogui_screenshot' && paramId === 'filename') {
           if (rawValue.trim() === '' || rawValue === '""') {
             processedParams[paramId] = '""'; // Represents no file, handled in template
           } else if (blockScopedDefinedVariables.has(rawValue)) {
             processedParams[paramId] = rawValue;
           } else {
             processedParams[paramId] = formatPythonStringLiteral(rawValue);
           }
           continue;
        }


        if (blockDefinition.id === 'define_variable' && paramId === 'value') {
          if (blockScopedDefinedVariables.has(rawValue)) {
            processedParams[paramId] = rawValue;
          } else if (isNumeric(rawValue)) {
            processedParams[paramId] = rawValue;
          } else {
            processedParams[paramId] = formatPythonStringLiteral(rawValue);
          }
        } else if (paramDef.type === 'textarea') {
          if (blockScopedDefinedVariables.has(rawValue.trim())) {
             processedParams[paramId] = rawValue.trim();
          } else {
            if (blockDefinition.id === 'http_request' && paramId === 'body') {
                const methodParam = blockDefinition.parameters.find(p => p.id === 'method');
                const currentMethod = (canvasBlock.params[methodParam!.id] ?? methodParam!.defaultValue).toUpperCase();
                const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
                if (bodyRelevantMethods.includes(currentMethod)) {
                    processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
                } else {
                    processedParams[paramId] = "None"; 
                }
            } else {
                 processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
            }
          }
        } else if (blockScopedDefinedVariables.has(rawValue)) {
          processedParams[paramId] = rawValue;
        } else {
          if (paramDef.type === 'string' || paramDef.type === 'password' || paramDef.type === 'select') {
            processedParams[paramId] = formatPythonStringLiteral(rawValue);
          } else if (paramDef.type === 'number') {
            if (isNumeric(rawValue)) {
              processedParams[paramId] = rawValue; 
            } else {
              // If not numeric, treat as string, as it might be a variable placeholder for a number.
              // The template should then handle this, or an error would occur in Python.
              // For now, we will stringify it to avoid direct Python errors from non-quoted non-numbers.
              // Ideally, a more robust type checking or variable resolution would occur.
              processedParams[paramId] = formatPythonStringLiteral(rawValue);
            }
          } else {
            processedParams[paramId] = formatPythonStringLiteral(rawValue);
          }
        }
      }
      
      if (blockDefinition.id === 'custom_function' && processedParams.args) {
         // For custom_function args, we want to pass the raw string as user typed it,
         // as it might contain multiple arguments, some variables, some literals.
         // The template itself doesn't need further processing of this specific 'args' field.
         processedParams.args = canvasBlock.params.args ?? blockDefinition.parameters.find(p=>p.id === 'args')!.defaultValue;
      }


      try {
        const generatedBlockCode = blockDefinition.codeTemplate(processedParams);
        generatedBlockCode.split('\n').forEach(line => {
          lines.push(indent + line);
        });

        // Register defined variables for scope
        if (blockDefinition.id === 'define_variable') {
          const varName = canvasBlock.params.variableName;
          if (varName) blockScopedDefinedVariables.add(varName.trim());
        } else if (blockDefinition.id === 'read_file') {
          const varName = canvasBlock.params.variableName;
           if (varName) blockScopedDefinedVariables.add(varName.trim());
        } else if (blockDefinition.id === 'http_request') {
          const varName = canvasBlock.params.responseVariable;
           if (varName) blockScopedDefinedVariables.add(varName.trim());
        } else if (blockDefinition.id === 'custom_function' && canvasBlock.params.outputVar) {
           const varName = canvasBlock.params.outputVar;
           if (varName) blockScopedDefinedVariables.add(varName.trim());
        } else if (blockDefinition.id === 'pyautogui_screenshot' && canvasBlock.params.variableName) {
            const varName = canvasBlock.params.variableName;
            if (varName) blockScopedDefinedVariables.add(varName.trim());
        } else if (blockDefinition.id === 'pandas_read_csv') {
            const varName = canvasBlock.params.variableName;
            if (varName) blockScopedDefinedVariables.add(varName.trim());
        }


        if (blockDefinition.canHaveChildren) {
          if (canvasBlock.children && canvasBlock.children.length > 0) {
            lines.push(...generateCodeRecursive(canvasBlock.children, availableBlocks, indentLevel + 1, blockScopedDefinedVariables));
          } else {
            lines.push(indent + '    pass');
          }
        }
      } catch (error) {
        // Eu corrigi aqui para fornecer mais contexto sobre o erro
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
    '# Note: Some blocks might require specific libraries (e.g., requests for HTTP, pyautogui, pandas).',
    '# Make sure to install them using pip: pip install requests pyautogui pandas',
    ''
  ];

  codeLines.push(...generateCodeRecursive(canvasBlocks, availableBlocks, 0, new Set<string>()));
  return codeLines.join('\n');
}

