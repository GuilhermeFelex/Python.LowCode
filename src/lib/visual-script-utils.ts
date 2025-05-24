
/**
 * @fileoverview Utilitários centrais para a funcionalidade do Visual Script.
 * Contém:
 * - Definições de todos os blocos de script disponíveis (`AVAILABLE_BLOCKS`).
 * - A lógica de geração de código Python a partir dos blocos visuais (`generatePythonCode`).
 * - Funções auxiliares para processar parâmetros e formatar strings Python.
 */
import type { Block, CanvasBlock, ParameterDefinition } from '@/types/visual-script';
import { Terminal, FileText, Repeat, Puzzle, Webhook, FunctionSquare, Variable, MousePointerSquareDashed, Database, FileUp, FileDown, ScanText, Power, Globe, LocateFixed, MousePointerClick, Type, Baseline } from 'lucide-react';

// Função auxiliar pra checar se uma string é um número válido.
// Útil pra decidir se um valor de parâmetro deve ser tratado como número ou string no Python.
function isNumeric(str: string): boolean {
  if (typeof str !== 'string') return false;
  // Verifica se não é uma string vazia e se pode ser convertida para um número finito.
  const num = Number(str);
  return str.trim() !== '' && !isNaN(num) && isFinite(num);
}

// Auxiliar para escapar strings para Python e garantir que sejam devidamente aspeadas.
function formatPythonStringLiteral(value: string): string {
  // Escapo barras invertidas, aspas duplas e quebras de linha.
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escapedValue}"`;
}

// Auxiliar para strings Python multilinhas (com aspas triplas).
function formatPythonMultilineStringLiteral(value: string): string {
  // Escapo barras invertidas e sequências de aspas triplas.
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""');
  return `"""${escapedValue}"""`;
}

// Esta é a função que "inteligentemente" processa os parâmetros de um bloco.
// Ela decide se o valor de um parâmetro é uma variável já definida ou um literal.
function _processBlockParams(
  rawParams: Record<string, string>, // Os valores como vieram do input do usuário.
  paramDefinitions: ParameterDefinition[], // As definições dos parâmetros para este bloco.
  definedVariables: Set<string>, // Um conjunto com nomes de variáveis já definidas no escopo.
  blockDefinition: Block // A definição completa do bloco, pra ter contexto (ID do bloco, etc.).
): Record<string, string> {
  const processedParams: Record<string, string> = {};
  const blockId = blockDefinition.id;

  // Lista de IDs de parâmetros que SÃO nomes de variáveis por natureza
  // (ex: onde guardar o resultado de algo, ou o nome da variável de um loop).
  const directVariableNameParams = [
    'variableName', 'loopVariable', 'responseVariable', 'outputVar',
    'dataFrameVariable', 'driverVariable', 'elementVariable', 'textVariable'
  ];

  for (const paramDef of paramDefinitions) {
    const paramId = paramDef.id;
    let rawValue = rawParams[paramId] ?? paramDef.defaultValue; // Pego o valor do usuário ou o padrão.
    if (typeof rawValue === 'string') {
      rawValue = rawValue.trim(); // Limpo espaços em branco.
    }

    // Se o ID do parâmetro está na lista 'directVariableNameParams',
    // eu assumo que o 'rawValue' É o nome da variável.
    if (directVariableNameParams.includes(paramId)) {
      processedParams[paramId] = rawValue; // Passo como está.
      continue;
    }

    // Caso especial: argumentos da função customizada.
    // O usuário digita a lista de argumentos como uma string, então passo direto.
    if (blockId === 'custom_function' && paramId === 'args') {
      processedParams[paramId] = rawParams.args ?? paramDef.defaultValue;
      continue;
    }

    // Caso especial: coordenadas opcionais do pyautogui_click.
    // Se estiver vazio, represento como string vazia no template.
    // Senão, verifico se é variável, número ou string literal.
    if (blockId === 'pyautogui_click' && (paramId === 'x_coord' || paramId === 'y_coord')) {
      if (rawValue === '' || rawValue === '""') {
        processedParams[paramId] = '""';
      } else if (definedVariables.has(rawValue)) {
        processedParams[paramId] = rawValue;
      } else if (isNumeric(rawValue)) {
        processedParams[paramId] = rawValue;
      } else {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
      continue;
    }

    // Caso especial: nome do arquivo do pyautogui_screenshot.
    // Similar ao de cima, mas pra nome de arquivo.
    if (blockId === 'pyautogui_screenshot' && paramId === 'filename') {
      if (rawValue === '' || rawValue === '""') {
        processedParams[paramId] = '""';
      } else if (definedVariables.has(rawValue)) {
        processedParams[paramId] = rawValue;
      } else {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
      continue;
    }

    // Para o bloco "Define Variable", o parâmetro "value".
    if (blockId === 'define_variable' && paramId === 'value') {
      if (definedVariables.has(rawValue)) { // Se 'rawValue' é uma variável existente.
        processedParams[paramId] = rawValue;
      } else if (isNumeric(rawValue)) { // Se é um número.
        processedParams[paramId] = rawValue;
      } else { // Senão, é uma string literal.
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
    }
    // Parâmetros do tipo textarea (ex: corpo do HTTP, headers).
    else if (paramDef.type === 'textarea') {
      if (definedVariables.has(rawValue)) { // Se o conteúdo TODO da textarea é um nome de variável.
        processedParams[paramId] = rawValue;
      } else {
        // Tratamento especial para o corpo da requisição HTTP.
        // Se o método não espera corpo (GET, DELETE), ou se o corpo estiver vazio, uso None.
        if (blockId === 'http_request' && paramId === 'body') {
          const methodParamDef = blockDefinition.parameters.find(p => p.id === 'method');
          const currentMethod = (rawParams[methodParamDef!.id] ?? methodParamDef!.defaultValue).toUpperCase();
          const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
          if (bodyRelevantMethods.includes(currentMethod) && rawValue.trim() !== '') {
            processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
          } else {
            processedParams[paramId] = "None"; // Representa corpo vazio/não aplicável.
          }
        } else {
          // Para outras textareas, formato como string multilinhas.
          processedParams[paramId] = formatPythonMultilineStringLiteral(rawValue);
        }
      }
    }
    // Caso geral: se for uma variável definida, uso ela. Senão, formato como literal.
    else if (definedVariables.has(rawValue)) {
      processedParams[paramId] = rawValue;
    } else {
      if (paramDef.type === 'string' || paramDef.type === 'password' || paramDef.type === 'select') {
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      } else if (paramDef.type === 'number') {
        if (isNumeric(rawValue)) {
          processedParams[paramId] = rawValue;
        } else {
          // Fallback para campos numéricos que contenham texto não numérico (ex: nome de variável não reconhecido).
          // Trato como string, pode não ser o ideal, mas evita erro de sintaxe Python.
          processedParams[paramId] = formatPythonStringLiteral(rawValue);
        }
      } else {
        // Fallback padrão: tratar como string literal.
        processedParams[paramId] = formatPythonStringLiteral(rawValue);
      }
    }
  }
  return processedParams;
}

// Array com a definição de todos os blocos disponíveis na aplicação.
export const AVAILABLE_BLOCKS: Block[] = [
  {
    id: 'print_message',
    name: 'Print Message',
    description: 'Imprime uma mensagem no console.',
    icon: Terminal,
    category: 'Output',
    parameters: [
      { id: 'message', name: 'Mensagem', type: 'string', defaultValue: 'Hello World', placeholder: 'Digite a mensagem ou nome da variável' },
    ],
    codeTemplate: (params) => `print(${params.message})`,
  },
  {
    id: 'read_file',
    name: 'Read File',
    description: 'Lê o conteúdo de um arquivo especificado.',
    icon: FileText,
    category: 'File I/O',
    parameters: [
      { id: 'filePath', name: 'Caminho do Arquivo', type: 'string', defaultValue: './meu_arquivo.txt', placeholder: 'ex: /caminho/para/arquivo.txt ou variável' },
      { id: 'variableName', name: 'Armazenar em Variável', type: 'string', defaultValue: 'conteudo_arquivo', placeholder: 'Nome da variável' },
    ],
    codeTemplate: (params) => `${params.variableName} = open(${params.filePath}, "r").read()`,
  },
  {
    id: 'loop_range',
    name: 'Loop (Range)',
    description: 'Repete ações um determinado número de vezes.',
    icon: Repeat,
    category: 'Logic',
    parameters: [
      { id: 'count', name: 'Iterações', type: 'number', defaultValue: '5', placeholder: 'ex: 10 ou variável' },
      { id: 'loopVariable', name: 'Variável do Loop', type: 'string', defaultValue: 'i', placeholder: 'ex: i' },
    ],
    canHaveChildren: true, // Indica que este bloco pode conter outros blocos aninhados.
    codeTemplate: (params) => `for ${params.loopVariable} in range(${params.count}):`,
  },
  {
    id: 'define_variable',
    name: 'Define Variable',
    description: 'Define uma variável com um valor.',
    icon: Variable,
    category: 'Data',
    parameters: [
      { id: 'variableName', name: 'Nome da Variável', type: 'string', defaultValue: 'minha_var', placeholder: 'ex: idade' },
      { id: 'value', name: 'Valor', type: 'string', defaultValue: '""', placeholder: 'ex: "João", 42, ou outra_variavel' },
    ],
    codeTemplate: (params) => `${params.variableName} = ${params.value}`,
  },
  {
    id: 'http_request',
    name: 'HTTP Request',
    description: 'Faz uma requisição HTTP para uma URL usando um método, headers, body e autenticação especificados.',
    icon: Webhook,
    category: 'Network',
    parameters: [
      {
        id: 'method',
        name: 'Método',
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
      { id: 'url', name: 'URL', type: 'string', defaultValue: 'https://api.example.com/data', placeholder: 'https://... ou variável' },
      { id: 'headers', name: 'Headers (chave: valor, um por linha, ou nome de var. para dict)', type: 'textarea', defaultValue: '', placeholder: 'Content-Type: application/json\nAuthorization: Bearer token_var\nOU\nmeu_dict_headers_var' },
      {
        id: 'body',
        name: 'Body (ex: JSON string, ou nome de var. para dados/dict)',
        type: 'textarea',
        defaultValue: '',
        placeholder: '{\n  "key": "value"\n}\nOU\nminha_var_body_dados',
        condition: { paramId: 'method', paramValue: ['POST', 'PUT', 'PATCH'] } // Só mostra se método for POST, PUT ou PATCH.
      },
      {
        id: 'authType',
        name: 'Autenticação',
        type: 'select',
        defaultValue: 'None',
        options: [
          { value: 'None', label: 'Nenhuma' },
          { value: 'Bearer Token', label: 'Bearer Token' },
          { value: 'Basic Auth', label: 'Basic Auth (usuário:senha)' },
        ]
      },
      {
        id: 'authToken',
        name: 'Bearer Token',
        type: 'password', // Tipo password pra esconder o valor.
        defaultValue: '',
        placeholder: 'Digite o Bearer Token ou nome da variável',
        condition: { paramId: 'authType', paramValue: 'Bearer Token' } // Só mostra se authType for Bearer Token.
      },
      {
        id: 'authBasicUser',
        name: 'Usuário Basic Auth',
        type: 'string',
        defaultValue: '',
        placeholder: 'Digite o Usuário ou nome da variável',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      {
        id: 'authBasicPass',
        name: 'Senha Basic Auth',
        type: 'password',
        defaultValue: '',
        placeholder: 'Digite a Senha ou nome da variável',
        condition: { paramId: 'authType', paramValue: 'Basic Auth' }
      },
      { id: 'responseVariable', name: 'Armazenar Resposta Em', type: 'string', defaultValue: 'dados_resposta', placeholder: 'Nome da variável' },
    ],
    codeTemplate: (params) => {
      // O .replace é pra remover aspas literais do valor do select, caso o _processBlockParams as adicione.
      const method = params.method.replace(/"/g, '');
      const responseVar = params.responseVariable;

      // Construo o código Python linha por linha. Fica mais fácil de ler.
      let codeLines = [
        `# Bloco de Requisição HTTP - Certifique-se que a biblioteca 'requests' está instalada: pip install requests`,
        `# import requests # Descomente se for rodar este código fora daqui`,
        ``,
        `_url = ${params.url}`, // url, headers, body, etc. já vêm processados (var ou literal)
        `_headers = {}`,
        `_auth = None`,
        `_body_payload = None`,
        `_method_str = "${method.toLowerCase()}"`, // Garanto que o método esteja em minúsculas para o requests.
        ``,
      ];

      // Lógica para processar os headers.
      // O usuário pode digitar "chave: valor" ou o nome de um dicionário.
      codeLines.push(`# Processando Headers:`);
      codeLines.push(`_raw_headers_input = ${params.headers}`);
      codeLines.push(`if isinstance(_raw_headers_input, dict):`); // Se já for um dict (variável).
      codeLines.push(`    _headers = _raw_headers_input`);
      codeLines.push(`elif isinstance(_raw_headers_input, str) and _raw_headers_input.strip():`); // Se for string.
      codeLines.push(`    for header_line in _raw_headers_input.strip().split('\\n'):`); // Divido por linha.
      codeLines.push(`        if ':' in header_line:`);
      codeLines.push(`            key, value = header_line.split(':', 1)`);
      codeLines.push(`            _headers[key.strip()] = value.strip()`);
      codeLines.push(``);

      // Lógica de autenticação.
      const authType = params.authType.replace(/"/g, '');
      if (authType === 'Bearer Token') {
        codeLines.push(`# Autenticação: Bearer Token`);
        codeLines.push(`_bearer_token = ${params.authToken}`);
        codeLines.push(`_headers['Authorization'] = f"Bearer {_bearer_token}"`);
      } else if (authType === 'Basic Auth') {
        codeLines.push(`# Autenticação: Basic Auth`);
        codeLines.push(`_basic_user = ${params.authBasicUser}`);
        codeLines.push(`_basic_pass = ${params.authBasicPass}`);
        // A lib requests espera uma tupla (user, pass) para basic auth.
        codeLines.push(`_auth = (_basic_user, _basic_pass)`);
      }
      codeLines.push(``);

      // Lógica para o corpo da requisição (payload).
      const bodyRelevantMethods = ['POST', 'PUT', 'PATCH'];
      if (bodyRelevantMethods.includes(method.toUpperCase())) {
        codeLines.push(`# Corpo da Requisição para ${method}:`);
        codeLines.push(`_raw_body_input = ${params.body}`); // params.body já foi processado.
        codeLines.push(`_body_payload = _raw_body_input`);
        codeLines.push(``);
      }

      // Monto os argumentos para a função requests.request.
      let finalReqArgsString = `method=_method_str, url=_url, headers=_headers`;
      if (authType === 'Basic Auth') {
        finalReqArgsString += `, auth=_auth`;
      }

      // Só adiciono 'data' ou 'json' se o _body_payload não for None (que é como represento corpos vazios/irrelevantes).
      if (bodyRelevantMethods.includes(method.toUpperCase()) && params.body !== 'None') {
         // Assumo que _body_payload pode ser uma string JSON ou um dict.
         // A lib requests geralmente lida bem com isso usando 'data'.
         // Se precisar especificamente do kwarg 'json=', o usuário teria que garantir que _body_payload é um dict.
        finalReqArgsString += `, data=_body_payload`;
      }

      // Código simulado da requisição.
      // O ideal seria ter uma forma de executar isso de verdade, mas por enquanto é só simulação.
      codeLines.push(`${responseVar} = "--- RESPOSTA SIMULADA ---" # Placeholder`);
      codeLines.push(`# try:`);
      codeLines.push(`#     response = requests.request(${finalReqArgsString})`);
      codeLines.push(`#     response.raise_for_status() # Levanta uma exceção para códigos de status ruins (4xx ou 5xx)`);
      codeLines.push(`#     # Tenta decodificar como JSON, se falhar, usa o texto puro.`);
      codeLines.push(`#     try:`);
      codeLines.push(`#         ${responseVar} = response.json()`);
      codeLines.push(`#     except requests.exceptions.JSONDecodeError:`);
      codeLines.push(`#         ${responseVar} = response.text`);
      codeLines.push(`# except requests.exceptions.RequestException as e:`);
      codeLines.push(`#     ${responseVar} = f"Erro: {e}"`);
      codeLines.push(`#     print(${responseVar})`);
      codeLines.push(``);
      codeLines.push(`print(f"Simulado {method} para {_url}. Resposta em ${responseVar}: {{${responseVar}}}")`);

      return codeLines.join('\n');
    },
  },
  {
    id: 'custom_function',
    name: 'Custom Function',
    description: 'Representa uma chamada de função Python customizada.',
    icon: FunctionSquare,
    category: 'Advanced',
    parameters: [
      { id: 'functionName', name: 'Nome da Função', type: 'string', defaultValue: 'minha_funcao_customizada', placeholder: 'Nome da função ou variável' },
      { id: 'args', name: 'Argumentos (sep. por vírgula, use vars ou literais)', type: 'string', defaultValue: '', placeholder: 'var_arg, "literal_string", 123' },
      { id: 'outputVar', name: 'Armazenar Resultado Em (opcional)', type: 'string', defaultValue: '', placeholder: 'variavel_resultado' },
    ],
    codeTemplate: (params) => {
      const args = params.args ? params.args : ''; // Se não tiver args, string vazia.
      const funcCall = `${params.functionName}(${args})`;
      // Se o usuário especificou uma variável de saída, atribuo o resultado.
      if (params.outputVar && params.outputVar.trim() !== '""' && params.outputVar.trim() !== '') {
        return `${params.outputVar} = ${funcCall}`;
      }
      return funcCall; // Senão, só chamo a função.
    }
  },
  // Blocos PyAutoGUI
  {
    id: 'pyautogui_move_to',
    name: 'Move Mouse',
    description: 'Move o cursor do mouse para as coordenadas X e Y especificadas.',
    icon: MousePointerSquareDashed,
    category: 'PyAutoGUI',
    parameters: [
      { id: 'x_coord', name: 'Coordenada X', type: 'number', defaultValue: '100', placeholder: 'ex: 100 ou var_x' },
      { id: 'y_coord', name: 'Coordenada Y', type: 'number', defaultValue: '100', placeholder: 'ex: 100 ou var_y' },
      { id: 'duration', name: 'Duração (segundos)', type: 'number', defaultValue: '0.25', placeholder: 'ex: 0.5 ou var_duracao' },
    ],
    codeTemplate: (params) => `# Certifique-se que 'pyautogui' está instalado: pip install pyautogui\n# import pyautogui # Descomente\npyautogui.moveTo(${params.x_coord}, ${params.y_coord}, duration=${params.duration})`,
  },
  {
    id: 'pyautogui_click',
    name: 'Click Mouse',
    description: 'Realiza um clique do mouse nas coordenadas atuais ou especificadas.',
    icon: MousePointerClick,
    category: 'PyAutoGUI',
    parameters: [
      { id: 'x_coord', name: 'Coordenada X (opcional)', type: 'string', defaultValue: '', placeholder: 'ex: 100 ou var_x (vazio para atual)' },
      { id: 'y_coord', name: 'Coordenada Y (opcional)', type: 'string', defaultValue: '', placeholder: 'ex: 100 ou var_y (vazio para atual)' },
      { id: 'button', name: 'Botão', type: 'select', defaultValue: 'left', options: [
          { value: 'left', label: 'Esquerdo' }, { value: 'right', label: 'Direito' }, { value: 'middle', label: 'Meio' }
        ]
      },
    ],
    codeTemplate: (params) => {
      // Monto os argumentos do clique. Só adiciono x e y se forem fornecidos.
      const x = params.x_coord && params.x_coord !== '""' ? `x=${params.x_coord}` : '';
      const y = params.y_coord && params.y_coord !== '""' ? `y=${params.y_coord}` : '';
      const clickArgs = [x,y, `button=${params.button}`].filter(Boolean).join(', '); // filter(Boolean) remove os vazios.
      return `# Certifique-se que 'pyautogui' está instalado: pip install pyautogui\n# import pyautogui # Descomente\npyautogui.click(${clickArgs})`;
    },
  },
  {
    id: 'pyautogui_typewrite',
    name: 'Type Text',
    description: 'Digita a string de caracteres fornecida.',
    icon: ScanText, // Ícone de scan, achei que combinava.
    category: 'PyAutoGUI',
    parameters: [
      { id: 'text_to_type', name: 'Texto para Digitar', type: 'string', defaultValue: 'Olá!', placeholder: 'Digite o texto ou nome da variável' },
      { id: 'interval', name: 'Intervalo (seg, por char)', type: 'number', defaultValue: '0.1', placeholder: 'ex: 0.05 ou var_intervalo' },
    ],
    codeTemplate: (params) => `# Certifique-se que 'pyautogui' está instalado: pip install pyautogui\n# import pyautogui # Descomente\npyautogui.typewrite(${params.text_to_type}, interval=${params.interval})`,
  },
  {
    id: 'pyautogui_screenshot',
    name: 'Take Screenshot',
    description: 'Tira um print da tela e salva em um arquivo, ou armazena em uma variável.',
    icon: Puzzle, // Ícone de quebra-cabeça, pra representar uma "peça" da tela.
    category: 'PyAutoGUI',
    parameters: [
      { id: 'filename', name: 'Nome do Arquivo (opcional)', type: 'string', defaultValue: 'screenshot.png', placeholder: 'ex: meu_screenshot.png ou var (vazio para não salvar)' },
      { id: 'variableName', name: 'Armazenar Imagem Em (opcional)', type: 'string', defaultValue: '', placeholder: 'Nome da variável para o objeto da imagem' },
    ],
    codeTemplate: (params) => {
      let code = `# Certifique-se que 'pyautogui' está instalado: pip install pyautogui\n# import pyautogui # Descomente\n`;
      // Se o nome do arquivo ou da variável for uma string vazia no template, trato como não fornecido.
      const filenameParam = params.filename === '""' ? '' : params.filename;
      const variableNameParam = params.variableName === '""' ? '' : params.variableName;

      if (variableNameParam) { // Se quer armazenar na variável.
        code += `${variableNameParam} = pyautogui.screenshot(${filenameParam ? filenameParam : ''})\n`; // Se filename for fornecido, passa pro screenshot.
        code += `print(f"Screenshot tirado e armazenado na variável '${variableNameParam}'.")\n`;
        if (filenameParam) {
          code += `print(f"Também salvo no arquivo: {${filenameParam}}")`;
        }
      } else if (filenameParam) { // Se só quer salvar no arquivo.
        code += `pyautogui.screenshot(${filenameParam})\n`;
        code += `print(f"Screenshot salvo no arquivo: {${filenameParam}}")`;
      } else { // Se não especificou nem arquivo nem variável (o screenshot é feito, mas não armazenado explicitamente).
        code += `image_obj = pyautogui.screenshot()\n`; // O usuário precisaria saber que o objeto está em 'image_obj'.
        code += `print("Screenshot tirado (objeto da imagem armazenado em 'image_obj', não salvo em arquivo).")`;
      }
      return code;
    },
  },
  // Blocos Pandas
  {
    id: 'pandas_read_csv',
    name: 'Read CSV (Pandas)',
    description: 'Lê um arquivo CSV para um DataFrame do Pandas.',
    icon: FileDown,
    category: 'Pandas',
    parameters: [
      { id: 'filePath', name: 'Caminho do Arquivo', type: 'string', defaultValue: 'dados.csv', placeholder: 'ex: /caminho/para/dados.csv ou var' },
      { id: 'variableName', name: 'Armazenar DataFrame Em', type: 'string', defaultValue: 'df', placeholder: 'Nome da variável para o DataFrame' },
    ],
    codeTemplate: (params) => `# Certifique-se que 'pandas' está instalado: pip install pandas\n# import pandas as pd # Descomente\n${params.variableName} = pd.read_csv(${params.filePath})\nprint(f"Arquivo CSV {${params.filePath}} carregado no DataFrame '${params.variableName}'.")`,
  },
  {
    id: 'pandas_to_csv',
    name: 'DataFrame to CSV (Pandas)',
    description: 'Escreve um DataFrame do Pandas para um arquivo CSV.',
    icon: FileUp,
    category: 'Pandas',
    parameters: [
      { id: 'dataFrameVariable', name: 'Variável do DataFrame', type: 'string', defaultValue: 'df', placeholder: 'Nome da variável do DataFrame' },
      { id: 'filePath', name: 'Caminho do Arquivo de Saída', type: 'string', defaultValue: 'saida.csv', placeholder: 'ex: /caminho/para/saida.csv ou var' },
      { id: 'includeIndex', name: 'Incluir Índice', type: 'select', defaultValue: 'False', options: [
          { value: 'True', label: 'Sim' }, { value: 'False', label: 'Não' }
        ]
      },
    ],
    codeTemplate: (params) => `# Certifique-se que 'pandas' está instalado: pip install pandas\n# import pandas as pd # Descomente\n${params.dataFrameVariable}.to_csv(${params.filePath}, index=${params.includeIndex})\nprint(f"DataFrame '${params.dataFrameVariable}' salvo no arquivo CSV {${params.filePath}}.")`,
  },
  {
    id: 'pandas_df_head',
    name: 'Show DataFrame Head (Pandas)',
    description: 'Imprime as primeiras n linhas de um DataFrame.',
    icon: Database,
    category: 'Pandas',
    parameters: [
      { id: 'dataFrameVariable', name: 'Variável do DataFrame', type: 'string', defaultValue: 'df', placeholder: 'Nome da variável do DataFrame' },
      { id: 'numRows', name: 'Número de Linhas', type: 'number', defaultValue: '5', placeholder: 'ex: 5 ou var_linhas' },
    ],
    codeTemplate: (params) => `# Certifique-se que 'pandas' está instalado: pip install pandas\n# import pandas as pd # Descomente\nprint(f"Primeiras {${params.numRows}} linhas do DataFrame '${params.dataFrameVariable}':")\nprint(${params.dataFrameVariable}.head(${params.numRows}))`,
  },
  // Blocos Selenium
  {
    id: 'selenium_initialize_driver',
    name: 'Initialize WebDriver',
    description: 'Inicializa uma instância do Selenium WebDriver para o navegador escolhido.',
    icon: Power,
    category: 'Selenium',
    parameters: [
      {
        id: 'browser',
        name: 'Navegador',
        type: 'select',
        defaultValue: 'Chrome',
        options: [
          { value: 'Chrome', label: 'Chrome' },
          { value: 'Firefox', label: 'Firefox' },
          { value: 'Edge', label: 'Edge' },
          { value: 'Safari', label: 'Safari (apenas macOS)' },
        ]
      },
      { id: 'driverVariable', name: 'Armazenar WebDriver Em', type: 'string', defaultValue: 'driver', placeholder: 'Nome da variável para o WebDriver' },
    ],
    codeTemplate: (params) => {
      const browser = params.browser.replace(/"/g, ''); // Tiro aspas do valor do select
      let driverInitCode = `# Certifique-se que 'selenium' e 'webdriver-manager' estão instalados: pip install selenium webdriver-manager\n`;
      driverInitCode += `# from selenium import webdriver\n`;
      driverInitCode += `# from selenium.webdriver.common.by import By # Frequentemente necessário para find_element\n`;
      driverInitCode += `\n`;
      driverInitCode += `# --- Inicializando WebDriver para ${browser} ---\n`;
      driverInitCode += `print("Tentando inicializar o Selenium WebDriver para ${browser}...")\n`;
      driverInitCode += `${params.driverVariable} = None # Inicializo como None por segurança\n`;
      driverInitCode += `try:\n`;
      // A biblioteca webdriver-manager cuida do download e configuração do driver correto.
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
        // O SafariDriver geralmente já vem instalado no macOS.
        // O usuário precisa habilitar "Permitir Automação Remota" no menu Desenvolvedor do Safari.
        driverInitCode += `    ${params.driverVariable} = webdriver.Safari()\n`;
      }
      driverInitCode += `    print(f"Selenium WebDriver para ${browser} inicializado e armazenado na variável '${params.driverVariable}'.")\n`;
      driverInitCode += `except Exception as e:\n`; // Capturo qualquer erro na inicialização.
      driverInitCode += `    print(f"Erro ao inicializar Selenium WebDriver para ${browser}: {{e}}")\n`;
      driverInitCode += `    print("Por favor, certifique-se que Selenium e webdriver-manager estão instalados e que você tem acesso à internet para o download do driver.")\n`;
      return driverInitCode;
    }
  },
  {
    id: 'selenium_open_url',
    name: 'Open URL',
    description: 'Navega o browser para a URL especificada.',
    icon: Globe,
    category: 'Selenium',
    parameters: [
      { id: 'driverVariable', name: 'Instância do WebDriver', type: 'string', defaultValue: 'driver', placeholder: 'Variável com o WebDriver' },
      { id: 'url', name: 'URL para Abrir', type: 'string', defaultValue: 'https://www.example.com', placeholder: 'https://...' },
    ],
    codeTemplate: (params) => `if ${params.driverVariable}: # Verifico se o driver existe
    print(f"Navegando para URL: {${params.url}}")
    ${params.driverVariable}.get(${params.url})
else:
    print("Instância do WebDriver (${params.driverVariable}) não disponível. Pulando Open URL.")`
  },
  {
    id: 'selenium_find_element',
    name: 'Find Element',
    description: 'Encontra um elemento web por uma estratégia de seletor especificada.',
    icon: LocateFixed,
    category: 'Selenium',
    parameters: [
      { id: 'driverVariable', name: 'Instância do WebDriver', type: 'string', defaultValue: 'driver', placeholder: 'Variável com o WebDriver' },
      {
        id: 'findBy',
        name: 'Encontrar Por',
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
      { id: 'selectorValue', name: 'Valor do Seletor', type: 'string', defaultValue: 'meuElementoId', placeholder: 'ex: elemento_id ou //div[@id="main"]' },
      { id: 'elementVariable', name: 'Armazenar Elemento Em', type: 'string', defaultValue: 'elemento_web', placeholder: 'Nome da variável para o elemento encontrado' },
    ],
    codeTemplate: (params) => {
      const findBy = params.findBy.replace(/"/g, ''); // Tiro aspas do valor do select
      let code = `if ${params.driverVariable}:\n`;
      code += `    print(f"Tentando encontrar elemento por ${findBy}: {${params.selectorValue}}")\n`;
      code += `    ${params.elementVariable} = None # Inicializo como None\n`;
      code += `    try:\n`;
      code += `        # Certifique-se que 'By' está importado: from selenium.webdriver.common.by import By\n`;
      code += `        ${params.elementVariable} = ${params.driverVariable}.find_element(By.${findBy}, ${params.selectorValue})\n`;
      code += `        print(f"Elemento encontrado e armazenado na variável '${params.elementVariable}'.")\n`;
      code += `    except Exception as e:\n`;
      code += `        print(f"Erro ao encontrar elemento por ${findBy} ({${params.selectorValue}}): {{e}}")\n`;
      code += `else:\n`;
      code += `    print("Instância do WebDriver (${params.driverVariable}) não disponível. Pulando Find Element.")\n`;
      return code;
    }
  },
  {
    id: 'selenium_click_element',
    name: 'Click Element',
    description: 'Clica em um elemento web previamente encontrado.',
    icon: MousePointerClick, // Reutilizando o ícone de clique.
    category: 'Selenium',
    parameters: [
      { id: 'elementVariable', name: 'Elemento para Clicar', type: 'string', defaultValue: 'elemento_web', placeholder: 'Variável com o elemento' },
    ],
    codeTemplate: (params) => `if ${params.elementVariable}: # Verifico se a variável do elemento existe e não é None
    print(f"Tentando clicar no elemento '{params.elementVariable}'.")
    try:
        ${params.elementVariable}.click()
        print("Elemento clicado.")
    except Exception as e:
        print(f"Erro ao clicar no elemento '{params.elementVariable}': {{e}}")
else:
    print(f"Variável do elemento '${params.elementVariable}' é None ou não está disponível. Pulando clique.")`
  },
  {
    id: 'selenium_send_keys',
    name: 'Send Keys to Element',
    description: 'Envia teclas para um elemento web (ex: digitar em um campo de input).',
    icon: Type, // Ícone de "tipo", pra representar digitação.
    category: 'Selenium',
    parameters: [
      { id: 'elementVariable', name: 'Elemento para Digitar', type: 'string', defaultValue: 'elemento_web', placeholder: 'Variável com o elemento' },
      { id: 'textToSend', name: 'Texto para Enviar', type: 'string', defaultValue: 'Olá, Selenium!', placeholder: 'Digite o texto ou nome da variável' },
    ],
    codeTemplate: (params) => `if ${params.elementVariable}:
    print(f"Tentando enviar teclas {${params.textToSend}} para o elemento '{params.elementVariable}'.")
    try:
        ${params.elementVariable}.send_keys(${params.textToSend})
        print("Teclas enviadas.")
    except Exception as e:
        print(f"Erro ao enviar teclas para o elemento '{params.elementVariable}': {{e}}")
else:
    print(f"Variável do elemento '${params.elementVariable}' é None ou não está disponível. Pulando envio de teclas.")`
  },
  {
    id: 'selenium_get_text',
    name: 'Get Text from Element',
    description: 'Recupera o conteúdo de texto de um elemento web.',
    icon: Baseline, // Ícone pra texto.
    category: 'Selenium',
    parameters: [
      { id: 'elementVariable', name: 'Elemento para Obter Texto', type: 'string', defaultValue: 'elemento_web', placeholder: 'Variável com o elemento' },
      { id: 'textVariable', name: 'Armazenar Texto Em', type: 'string', defaultValue: 'texto_elemento', placeholder: 'Nome da variável para o texto extraído' },
    ],
    codeTemplate: (params) => `if ${params.elementVariable}:
    print(f"Tentando obter texto do elemento '{params.elementVariable}'.")
    ${params.textVariable} = None # Inicializo como None
    try:
        ${params.textVariable} = ${params.elementVariable}.text
        print(f"Texto recuperado: {{${params.textVariable}}}. Armazenado em '{params.textVariable}'.")
    except Exception as e:
        print(f"Erro ao obter texto do elemento '{params.elementVariable}': {{e}}")
else:
    print(f"Variável do elemento '${params.elementVariable}' é None ou não está disponível. Pulando obtenção de texto.")\n`
  },
  {
    id: 'selenium_close_driver',
    name: 'Close WebDriver',
    description: 'Fecha o navegador e encerra a sessão do WebDriver.',
    icon: Power, // Reutilizando o ícone de Power.
    category: 'Selenium',
    parameters: [
      { id: 'driverVariable', name: 'Instância do WebDriver', type: 'string', defaultValue: 'driver', placeholder: 'Variável com o WebDriver' },
    ],
    codeTemplate: (params) => `if '${params.driverVariable}' in locals() and ${params.driverVariable}: # Verifico se a variável existe e foi inicializada.
    print(f"Fechando instância do WebDriver '{params.driverVariable}'.")
    try:
        ${params.driverVariable}.quit() # .quit() fecha todas as janelas e encerra o processo do driver.
        print("WebDriver fechado.")
    except Exception as e:
        print(f"Erro ao fechar WebDriver: {{e}}")
else:
    print(f"Instância do WebDriver '${params.driverVariable}' não encontrada ou já fechada. Pulando fechamento.")`
  },
];

// Função principal para gerar o código Python recursivamente.
// Percorre os blocos (e seus filhos), processa os parâmetros e monta o código.
function generateCodeRecursive(
  blocks: CanvasBlock[], // Blocos atuais a serem processados.
  availableBlocks: Block[], // Todos os tipos de blocos disponíveis.
  indentLevel = 0, // Nível de indentação atual (para blocos aninhados).
  currentDefinedVariables: Set<string> // Variáveis definidas no escopo pai.
): string[] {
  const lines: string[] = [];
  const indent = '    '.repeat(indentLevel); // 4 espaços por nível de indentação.
  // Crio uma cópia do Set de variáveis para este escopo, pra não afetar escopos paralelos.
  let blockScopedDefinedVariables = new Set(currentDefinedVariables);

  blocks.forEach(canvasBlock => {
    const blockDefinition = availableBlocks.find(b => b.id === canvasBlock.blockTypeId);
    if (blockDefinition) {
      // Processo os parâmetros ANTES de gerar o código do bloco.
      const processedParams = _processBlockParams(
        canvasBlock.params,
        blockDefinition.parameters,
        blockScopedDefinedVariables, // Passo as variáveis já definidas neste escopo.
        blockDefinition
      );

      // Adiciono novas variáveis definidas por este bloco ao escopo.
      // A lógica de _processBlockParams já garante que processedParams[pDef.id] é o nome da variável.
      const varDefiningParamIds = ['variableName', 'responseVariable', 'outputVar', 'dataFrameVariable', 'driverVariable', 'elementVariable', 'textVariable'];
      blockDefinition.parameters.forEach(pDef => {
        if (varDefiningParamIds.includes(pDef.id)) {
          const varName = processedParams[pDef.id];
          // Adiciono ao Set se for um nome de variável válido.
          if (varName && varName.trim() !== '' && varName.trim() !== '""') {
            // Checagens específicas para garantir que estou adicionando apenas variáveis de "saída" relevantes.
            if (
              (pDef.id === 'variableName' && ['define_variable', 'read_file', 'pyautogui_screenshot', 'pandas_read_csv'].includes(blockDefinition.id)) ||
              (pDef.id === 'responseVariable' && blockDefinition.id === 'http_request') ||
              (pDef.id === 'outputVar' && blockDefinition.id === 'custom_function') ||
              (pDef.id === 'dataFrameVariable' && blockDefinition.id === 'pandas_read_csv') || // Pandas usa 'variableName' atualmente.
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

        // Se o bloco pode ter filhos (ex: loop), gero o código deles recursivamente.
        if (blockDefinition.canHaveChildren) {
          // Caso especial: adiciono a variável do loop ao escopo dos filhos do loop.
          if (blockDefinition.id === 'loop_range' && processedParams.loopVariable) {
            // Preciso de uma cópia do Set pra não vazar a variável do loop para fora do loop.
            const loopScopedVariables = new Set(blockScopedDefinedVariables);
            loopScopedVariables.add(processedParams.loopVariable.trim());
            if (canvasBlock.children && canvasBlock.children.length > 0) {
              lines.push(...generateCodeRecursive(canvasBlock.children, availableBlocks, indentLevel + 1, loopScopedVariables));
            } else {
              lines.push(indent + '    pass'); // Bloco 'pass' se o loop estiver vazio.
            }
          } else {
            // Para outros blocos com filhos, passo o escopo atual.
            if (canvasBlock.children && canvasBlock.children.length > 0) {
              lines.push(...generateCodeRecursive(canvasBlock.children, availableBlocks, indentLevel + 1, blockScopedDefinedVariables));
            } else {
              lines.push(indent + '    pass'); // 'pass' se o bloco pai estiver vazio.
            }
          }
        }
      } catch (error) {
        // Capturo erros durante a geração do template de um bloco específico.
        // Isso ajuda a não quebrar toda a geração de código se um template estiver com problema.
        console.error("Erro ao gerar código para o bloco:", blockDefinition.name, "Instância:", canvasBlock.instanceId, "Params:", processedParams, "Erro:", error);
        lines.push(indent + `# ERRO ao gerar código para o bloco ${blockDefinition.name} (ID: ${canvasBlock.instanceId})`);
      }
    }
  });
  return lines;
}

export function generatePythonCode(canvasBlocks: CanvasBlock[], availableBlocks: Block[]): string {
  if (!canvasBlocks.length) {
    return '# Arraste e solte blocos para gerar código Python.';
  }

  // Cabeçalho padrão do código gerado.
  const codeLines: string[] = [
    '# Código Gerado pelo Visual Script',
    '# Nota: Alguns blocos podem requerer bibliotecas específicas (ex: requests, pyautogui, pandas, selenium).',
    '# Certifique-se de instalá-las usando pip: pip install requests pyautogui pandas selenium webdriver-manager',
    ''
  ];

  // Chamo a função recursiva pra gerar o corpo do código.
  // Começo com um Set vazio de variáveis definidas.
  codeLines.push(...generateCodeRecursive(canvasBlocks, availableBlocks, 0, new Set<string>()));
  return codeLines.join('\n');
}
