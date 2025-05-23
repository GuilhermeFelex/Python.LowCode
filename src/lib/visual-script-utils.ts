
import type { Block, CanvasBlock, ParameterDefinition } from '@/types/visual-script';
import { Terminal, FileText, Repeat, Puzzle, Webhook, FunctionSquare, Variable, MousePointerSquareDashed, Database, FileUp, FileDown, ScanText, Power, Globe, LocateFixed, MousePointerClick, Type, Baseline } from 'lucide-react';

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

// Helper function to process parameters for a block
function _processBlockParams(
  rawParams: Record<string, string>,
  paramDefinitions: ParameterDefinition[],
  definedVariables: Set<string>,
  blockDefinition: Block // Pass the whole blockDefinition for context like blockId and specific parameter needs
): Record<string, string> {
  const processedParams: Record<string, string> = {};
  const blockId = blockDefinition.id;

  // Parameters that are explicitly variable names (like where to store output or loop iterators)
  const directVariableNameParams = [
    'variableName', 'loopVariable', 'responseVariable', 'outputVar',
    'dataFrameVariable', 'driverVariable', 'elementVariable', 'textVariable'
  ];

  for (const paramDef of paramDefinitions) {
    const paramId = paramDef.id;
    let rawValue = rawParams[paramId] ?? paramDef.defaultValue;
    if (typeof rawValue === 'string') {
      rawValue = rawValue.trim();
    }

    if (directVariableNameParams.includes(paramId)) {
      processedParams[paramId] = rawValue; // Pass as is, it IS a variable name
      continue;
    }

    if (blockId === 'custom_function' && paramId === 'args') {
      processedParams[paramId] = rawParams.args ?? paramDef.defaultValue; // Pass raw string as user typed
      continue;
    }

    // Special handling for pyautogui_click optional coordinates
    if (blockId === 'pyautogui_click' && (paramId === 'x_coord' || paramId === 'y_coord')) {
      if (rawValue === '' || rawValue === '""') {
        processedParams[paramId] = '""'; // Represent empty as empty string for template
      } else if (definedVariables.has(rawValue)) {
        processedParams[paramId] = rawValue;
      } else if (isNumeric(rawValue)) {
        processedParams[paramId] = rawValue;
      } else {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
      continue;
    }

    // Special handling for pyautogui_screenshot filename
    if (blockId === 'pyautogui_screenshot' && paramId === 'filename') {
      if (rawValue === '' || rawValue === '""') {
        processedParams[paramId] = '""'; // Represent empty as empty string
      } else if (definedVariables.has(rawValue)) {
        processedParams[paramId] = rawValue;
      } else {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
      continue;
    }

    // Value for "Define Variable" block's 'value' parameter
    if (blockId === 'define_variable' && paramId === 'value') {
      if (definedVariables.has(rawValue)) {
        processedParams[paramId] = rawValue;
      } else if (isNumeric(rawValue)) {
        processedParams[paramId] = rawValue;
      } else {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
    }
    // Textarea parameters
    else if (paramDef.type === 'textarea') {
      if (definedVariables.has(rawValue)) {
        processedParams[paramId] = rawValue;
      } else {
        if (blockId === 'http_request' && paramId === 'body') {
          const methodParamDef = blockDefinition.parameters.find(p => p.id === 'method');
          const currentMethod = (rawParams[methodParamDef!.id] ?? methodParamDef!.defaultValue).toUpperCase();
          const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
          if (bodyRelevantMethods.includes(currentMethod) && rawValue.trim() !== '') {
            processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
          } else {
            processedParams[paramId] = "None";
          }
        } else {
          processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
        }
      }
    }
    // General case: if it's a defined variable, use it, otherwise format as literal
    else if (definedVariables.has(rawValue)) {
      processedParams[paramId] = rawValue;
    } else {
      if (paramDef.type === 'string' || paramDef.type === 'password' || paramDef.type === 'select') {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      } else if (paramDef.type === 'number') {
        if (isNumeric(rawValue)) {
          processedParams[paramId] = rawValue;
        } else {
          processedParams[paramId] = formatPythonStringLiteral(rawValue); // Fallback for non-numeric in number field
        }
      } else {
        processedParams[paramId] = formatPythonStringLiteral(rawValue); // Default
      }
    }
  }
  return processedParams;
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
    category: 'File I/O',
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
      codeLines.push(`_raw_headers_input = ${params.headers}`); // Already formatted as multiline string or variable
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

      let finalReqArgsString = `method=_method_str, url=_url, headers=_headers`;
      if (authType === 'Basic Auth') {
        finalReqArgsString += `, auth=_auth`;
      }

      // Only add data/json if body_payload is not None (which is how empty/irrelevant bodies are now represented)
      if (bodyRelevantMethods.includes(method.toUpperCase()) && params.body !== 'None') {
         // We assume _body_payload might be a JSON string or a dict.
         // For simplicity, requests.request can often handle this with 'data'.
         // If specific 'json=' kwarg is needed, user must ensure _body_payload is a dict.
        finalReqArgsString += `, data=_body_payload`;
      }

      codeLines.push(`${responseVar} = "--- SIMULATED RESPONSE ---" # Placeholder`);
      codeLines.push(`# try:`);
      codeLines.push(`#     response = requests.request(${finalReqArgsString})`);
      codeLines.push(`#     response.raise_for_status() # Raises an exception for bad status codes`);
      codeLines.push(`#     # Try to parse as JSON, fallback to text`);
      codeLines.push(`#     try:`);
      codeLines.push(`#         ${responseVar} = response.json()`);
      codeLines.push(`#     except requests.exceptions.JSONDecodeError:`);
      codeLines.push(`#         ${responseVar} = response.text`);
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
      if (params.outputVar && params.outputVar.trim() !== '""' && params.outputVar.trim() !== '') {
        return `${params.outputVar} = ${funcCall}`;
      }
      return funcCall;
    }
  },
  {
    id: 'pyautogui_move_to',
    name: 'Move Mouse',
    description: 'Moves the mouse cursor to the specified X and Y coordinates.',
    icon: MousePointerSquareDashed,
    category: 'PyAutoGUI',
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
    icon: MousePointerClick,
    category: 'PyAutoGUI',
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
    category: 'PyAutoGUI',
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
    icon: Puzzle,
    category: 'PyAutoGUI',
    parameters: [
      { id: 'filename', name: 'Filename (optional)', type: 'string', defaultValue: 'screenshot.png', placeholder: 'e.g., my_screenshot.png or var (blank to not save)' },
      { id: 'variableName', name: 'Store Image In (optional)', type: 'string', defaultValue: '', placeholder: 'Variable name for image object' },
    ],
    codeTemplate: (params) => {
      let code = `# Ensure 'pyautogui' is installed: pip install pyautogui\n# import pyautogui # Uncomment\n`;
      const filenameParam = params.filename === '""' ? '' : params.filename;
      const variableNameParam = params.variableName === '""' ? '' : params.variableName;

      if (variableNameParam) {
        code += `${variableNameParam} = pyautogui.screenshot(${filenameParam ? filenameParam : ''})\n`;
        code += `print(f"Screenshot taken and stored in variable '${variableNameParam}'.")\n`;
        if (filenameParam) {
          code += `print(f"Also saved to file: {${filenameParam}}")`;
        }
      } else if (filenameParam) {
        code += `pyautogui.screenshot(${filenameParam})\n`;
        code += `print(f"Screenshot saved to file: {${filenameParam}}")`;
      } else {
        code += `image_obj = pyautogui.screenshot()\n`;
        code += `print("Screenshot taken (image object stored in 'image_obj', not saved to file).")`;
      }
      return code;
    },
  },
  {
    id: 'pandas_read_csv',
    name: 'Read CSV (Pandas)',
    description: 'Reads a CSV file into a Pandas DataFrame.',
    icon: FileDown,
    category: 'Pandas',
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
    category: 'Pandas',
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
    category: 'Pandas',
    parameters: [
      { id: 'dataFrameVariable', name: 'DataFrame Variable', type: 'string', defaultValue: 'df', placeholder: 'Name of DataFrame variable' },
      { id: 'numRows', name: 'Number of Rows', type: 'number', defaultValue: '5', placeholder: 'e.g., 5 or var_rows' },
    ],
    codeTemplate: (params) => `# Ensure 'pandas' is installed: pip install pandas\n# import pandas as pd # Uncomment\nprint(f"First {${params.numRows}} rows of DataFrame '${params.dataFrameVariable}':")\nprint(${params.dataFrameVariable}.head(${params.numRows}))`,
  },
  {
    id: 'selenium_initialize_driver',
    name: 'Initialize WebDriver',
    description: 'Initializes a Selenium WebDriver instance for a chosen browser.',
    icon: Power,
    category: 'Selenium',
    parameters: [
      {
        id: 'browser',
        name: 'Browser',
        type: 'select',
        defaultValue: 'Chrome',
        options: [
          { value: 'Chrome', label: 'Chrome' },
          { value: 'Firefox', label: 'Firefox' },
          { value: 'Edge', label: 'Edge' },
          { value: 'Safari', label: 'Safari (macOS only)' },
        ]
      },
      { id: 'driverVariable', name: 'Store WebDriver In', type: 'string', defaultValue: 'driver', placeholder: 'Variable name for WebDriver' },
    ],
    codeTemplate: (params) => {
      const browser = params.browser.replace(/"/g, '');
      let driverInitCode = `# Ensure 'selenium' and 'webdriver-manager' are installed: pip install selenium webdriver-manager\n`;
      driverInitCode += `# from selenium import webdriver\n`;
      driverInitCode += `# from selenium.webdriver.common.by import By # Often needed for find_element\n`;
      driverInitCode += `\n`;
      driverInitCode += `# --- Initializing WebDriver for ${browser} ---\n`;
      driverInitCode += `print("Attempting to initialize Selenium WebDriver for ${browser}...")\n`;
      driverInitCode += `${params.driverVariable} = None # Default to None\n`;
      driverInitCode += `try:\n`;
      if (browser === 'Chrome') {
        driverInitCode += `    from selenium.webdriver.chrome.service import Service as ChromeService\n`;
        driverInitCode += `    from webdriver_manager.chrome import ChromeDriverManager\n`;
        driverInitCode += `    ${params.driverVariable} = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()))\n`;
      } else if (browser === 'Firefox') {
        driverInitCode += `    from selenium.webdriver.firefox.service import Service as FirefoxService\n`;
        driverInitCode += `    from webdriver_manager.firefox import GeckoDriverManager\n`;
        driverInitCode += `    ${params.driverVariable} = webdriver.Firefox(service=FirefoxService(GeckoDriverManager().install()))\n`;
      } else if (browser === 'Edge') {
        driverInitCode += `    from selenium.webdriver.edge.service import Service as EdgeService\n`;
        driverInitCode += `    from webdriver_manager.microsoft import EdgeChromiumDriverManager\n`;
        driverInitCode += `    ${params.driverVariable} = webdriver.Edge(service=EdgeService(EdgeChromiumDriverManager().install()))\n`;
      } else if (browser === 'Safari') {
        driverInitCode += `    # SafariDriver is usually pre-installed on macOS. Enable 'Allow Remote Automation' in Safari's Develop menu.\n`;
        driverInitCode += `    ${params.driverVariable} = webdriver.Safari()\n`;
      }
      driverInitCode += `    print(f"Selenium WebDriver for ${browser} initialized and stored in variable '${params.driverVariable}'.")\n`;
      driverInitCode += `except Exception as e:\n`;
      driverInitCode += `    print(f"Error initializing Selenium WebDriver for ${browser}: {{e}}")\n`;
      driverInitCode += `    print("Please ensure Selenium and webdriver-manager are installed, and you have internet access for driver download.")\n`;
      return driverInitCode;
    }
  },
  {
    id: 'selenium_open_url',
    name: 'Open URL',
    description: 'Navigates the browser to the specified URL.',
    icon: Globe,
    category: 'Selenium',
    parameters: [
      { id: 'driverVariable', name: 'WebDriver Instance', type: 'string', defaultValue: 'driver', placeholder: 'Variable holding WebDriver' },
      { id: 'url', name: 'URL to Open', type: 'string', defaultValue: 'https://www.example.com', placeholder: 'https://...' },
    ],
    codeTemplate: (params) => `if ${params.driverVariable}:\n    print(f"Navigating to URL: {${params.url}}")\n    ${params.driverVariable}.get(${params.url})\nelse:\n    print("WebDriver instance (${params.driverVariable}) not available. Skipping Open URL.")`
  },
  {
    id: 'selenium_find_element',
    name: 'Find Element',
    description: 'Finds a web element by a specified selector strategy.',
    icon: LocateFixed,
    category: 'Selenium',
    parameters: [
      { id: 'driverVariable', name: 'WebDriver Instance', type: 'string', defaultValue: 'driver', placeholder: 'Variable holding WebDriver' },
      {
        id: 'findBy',
        name: 'Find By',
        type: 'select',
        defaultValue: 'ID',
        options: [
          { value: 'ID', label: 'ID' },
          { value: 'NAME', label: 'Name' },
          { value: 'XPATH', label: 'XPath' },
          { value: 'CSS_SELECTOR', label: 'CSS Selector' },
          { value: 'CLASS_NAME', label: 'Class Name' },
          { value: 'LINK_TEXT', label: 'Link Text' },
          { value: 'PARTIAL_LINK_TEXT', label: 'Partial Link Text' },
          { value: 'TAG_NAME', label: 'Tag Name' },
        ]
      },
      { id: 'selectorValue', name: 'Selector Value', type: 'string', defaultValue: 'myElementId', placeholder: 'e.g., element_id or //div[@id="main"]' },
      { id: 'elementVariable', name: 'Store Element In', type: 'string', defaultValue: 'web_element', placeholder: 'Variable name for found element' },
    ],
    codeTemplate: (params) => {
      const findBy = params.findBy.replace(/"/g, '');
      let code = `if ${params.driverVariable}:\n`;
      code += `    print(f"Attempting to find element by ${findBy}: {${params.selectorValue}}")\n`;
      code += `    ${params.elementVariable} = None # Default to None\n`;
      code += `    try:\n`;
      code += `        # Ensure 'By' is imported: from selenium.webdriver.common.by import By\n`;
      code += `        ${params.elementVariable} = ${params.driverVariable}.find_element(By.${findBy}, ${params.selectorValue})\n`;
      code += `        print(f"Element found and stored in variable '{params.elementVariable}'.")\n`;
      code += `    except Exception as e:\n`;
      code += `        print(f"Error finding element by ${findBy} ({${params.selectorValue}}): {{e}}")\n`;
      code += `else:\n`;
      code += `    print("WebDriver instance (${params.driverVariable}) not available. Skipping Find Element.")\n`;
      return code;
    }
  },
  {
    id: 'selenium_click_element',
    name: 'Click Element',
    description: 'Clicks a previously found web element.',
    icon: MousePointerClick,
    category: 'Selenium',
    parameters: [
      { id: 'elementVariable', name: 'Element to Click', type: 'string', defaultValue: 'web_element', placeholder: 'Variable holding the element' },
    ],
    codeTemplate: (params) => `if ${params.elementVariable}:\n    print(f"Attempting to click element '{params.elementVariable}'.")\n    try:\n        ${params.elementVariable}.click()\n        print("Element clicked.")\n    except Exception as e:\n        print(f"Error clicking element '{params.elementVariable}': {{e}}")\nelse:\n    print(f"Element variable '${params.elementVariable}' is None or not available. Skipping click.")`
  },
  {
    id: 'selenium_send_keys',
    name: 'Send Keys to Element',
    description: 'Sends keystrokes to a web element (e.g., typing in an input field).',
    icon: Type,
    category: 'Selenium',
    parameters: [
      { id: 'elementVariable', name: 'Element to Type In', type: 'string', defaultValue: 'web_element', placeholder: 'Variable holding the element' },
      { id: 'textToSend', name: 'Text to Send', type: 'string', defaultValue: 'Hello, Selenium!', placeholder: 'Enter text or variable name' },
    ],
    codeTemplate: (params) => `if ${params.elementVariable}:\n    print(f"Attempting to send keys {${params.textToSend}} to element '{params.elementVariable}'.")\n    try:\n        ${params.elementVariable}.send_keys(${params.textToSend})\n        print("Keys sent.")\n    except Exception as e:\n        print(f"Error sending keys to element '{params.elementVariable}': {{e}}")\nelse:\n    print(f"Element variable '${params.elementVariable}' is None or not available. Skipping send keys.")`
  },
  {
    id: 'selenium_get_text',
    name: 'Get Text from Element',
    description: 'Retrieves the text content of a web element.',
    icon: Baseline,
    category: 'Selenium',
    parameters: [
      { id: 'elementVariable', name: 'Element to Get Text From', type: 'string', defaultValue: 'web_element', placeholder: 'Variable holding the element' },
      { id: 'textVariable', name: 'Store Text In', type: 'string', defaultValue: 'element_text', placeholder: 'Variable name for the extracted text' },
    ],
    codeTemplate: (params) => `if ${params.elementVariable}:\n    print(f"Attempting to get text from element '{params.elementVariable}'.")\n    ${params.textVariable} = None # Default to None\n    try:\n        ${params.textVariable} = ${params.elementVariable}.text\n        print(f"Text retrieved: {{${params.textVariable}}}. Stored in '{params.textVariable}'.")\n    except Exception as e:\n        print(f"Error getting text from element '{params.elementVariable}': {{e}}")\nelse:\n    print(f"Element variable '${params.elementVariable}' is None or not available. Skipping get text.")\n`
  },
  {
    id: 'selenium_close_driver',
    name: 'Close WebDriver',
    description: 'Closes the browser and terminates the WebDriver session.',
    icon: Power, // Re-using Power icon
    category: 'Selenium',
    parameters: [
      { id: 'driverVariable', name: 'WebDriver Instance', type: 'string', defaultValue: 'driver', placeholder: 'Variable holding WebDriver' },
    ],
    codeTemplate: (params) => `if '${params.driverVariable}' in locals() and ${params.driverVariable}:\n    print(f"Closing WebDriver instance '{params.driverVariable}'.")\n    try:\n        ${params.driverVariable}.quit()\n        print("WebDriver closed.")\n    except Exception as e:\n        print(f"Error closing WebDriver: {{e}}")\nelse:\n    print(f"WebDriver instance '${params.driverVariable}' not found or already closed. Skipping close.")`
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
      const processedParams = _processBlockParams(
        canvasBlock.params,
        blockDefinition.parameters,
        blockScopedDefinedVariables,
        blockDefinition
      );

      // Add newly defined variables to scope
      // Note: processedParams[paramId] already holds the clean variable name for these cases.
      const varDefiningParamIds = ['variableName', 'responseVariable', 'outputVar', 'dataFrameVariable', 'driverVariable', 'elementVariable', 'textVariable'];
      blockDefinition.parameters.forEach(pDef => {
        if (varDefiningParamIds.includes(pDef.id)) {
          const varName = processedParams[pDef.id];
          if (varName && varName.trim() !== '' && varName.trim() !== '""') {
            // Check if it's an output variable from a relevant block
            if (
              (pDef.id === 'variableName' && ['define_variable', 'read_file', 'pyautogui_screenshot', 'pandas_read_csv'].includes(blockDefinition.id)) ||
              (pDef.id === 'responseVariable' && blockDefinition.id === 'http_request') ||
              (pDef.id === 'outputVar' && blockDefinition.id === 'custom_function') ||
              (pDef.id === 'dataFrameVariable' && blockDefinition.id === 'pandas_read_csv') || // Note: pandas_read_csv uses 'variableName'
              (pDef.id === 'driverVariable' && blockDefinition.id === 'selenium_initialize_driver') ||
              (pDef.id === 'elementVariable' && blockDefinition.id === 'selenium_find_element') ||
              (pDef.id === 'textVariable' && blockDefinition.id === 'selenium_get_text')
            ) {
              blockScopedDefinedVariables.add(varName);
            }
          }
        }
      });


      try {
        const generatedBlockCode = blockDefinition.codeTemplate(processedParams);
        generatedBlockCode.split('\n').forEach(line => {
          lines.push(indent + line);
        });

        if (blockDefinition.canHaveChildren) {
          // Add loop variable to scope for children
          if (blockDefinition.id === 'loop_range' && processedParams.loopVariable) {
            blockScopedDefinedVariables.add(processedParams.loopVariable.trim());
          }
          if (canvasBlock.children && canvasBlock.children.length > 0) {
            lines.push(...generateCodeRecursive(canvasBlock.children, availableBlocks, indentLevel + 1, blockScopedDefinedVariables));
          } else {
            lines.push(indent + '    pass');
          }
        }
      } catch (error) {
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
    '# Note: Some blocks might require specific libraries (e.g., requests, pyautogui, pandas, selenium).',
    '# Make sure to install them using pip: pip install requests pyautogui pandas selenium webdriver-manager',
    ''
  ];

  codeLines.push(...generateCodeRecursive(canvasBlocks, availableBlocks, 0, new Set<string>()));
  return codeLines.join('\n');
}
