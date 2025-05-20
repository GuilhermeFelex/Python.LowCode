# Visual Script - Construtor Visual de Scripts Python

Bem-vindo ao **Visual Script**! Esta é uma aplicação Next.js projetada para permitir que você construa visualmente scripts Python usando blocos arrastáveis. É uma ferramenta intuitiva para aprender programação ou prototipar scripts de forma rápida.

## Como Funciona

A interface da aplicação é dividida em três seções principais:

1.  **Painel de Blocos (Esquerda)**:
    *   Contém uma lista de blocos de código disponíveis, organizados por categorias (Ex: Saída, Lógica, E/S de Arquivo, Rede).
    *   Cada categoria pode ser expandida ou recolhida usando um controle de acordeão.
    *   Você pode arrastar blocos deste painel para a Tela Principal.
    *   No topo deste painel, há botões para:
        *   **Simular**: Imprime o código gerado no console do navegador (simulando a execução).
        *   **Copiar Código**: Copia o código Python gerado para a área de transferência.
        *   **Salvar Arquivo**: Baixa o código Python gerado como um arquivo `.py`.

2.  **Tela Principal (Centro)**:
    *   É a área onde você constrói seu script.
    *   Arraste blocos do Painel de Blocos para esta tela.
    *   Os blocos podem ser encaixados em sequência.
    *   Blocos de controle de fluxo (como "Loop") podem ter outros blocos aninhados dentro deles em uma área designada.
    *   Cada bloco no canvas pode ser recolhido ou expandido para economizar espaço, clicando no ícone de seta no cabeçalho do bloco.
    *   Você pode remover blocos do canvas clicando no ícone "X" no cabeçalho do bloco.
    *   Parâmetros de cada bloco (como mensagens para imprimir ou URLs para requisições HTTP) podem ser editados diretamente nos campos de entrada do bloco.

3.  **Visualizador de Código (Direita)**:
    *   Exibe o código Python correspondente à sua construção visual em tempo real.
    *   Este painel é redimensionável: você pode arrastar sua borda esquerda para ajustar a largura conforme necessário.

## Funcionalidades Principais

*   **Construção Visual**: Arraste, solte e configure blocos para criar scripts.
*   **Geração de Código em Tempo Real**: Veja o código Python ser gerado instantaneamente.
*   **Blocos Configuráveis**: Muitos blocos possuem parâmetros que você pode ajustar.
*   **Aninhamento de Blocos**: Crie estruturas lógicas como loops com blocos internos.
*   **Recolher/Expandir Blocos**: Gerencie o espaço no canvas minimizando blocos individuais.
*   **Categorias de Blocos Recolhíveis**: Organize o painel de blocos com seções expansíveis.
*   **Simulação e Exportação**: Teste seu script (simulado no console) e salve-o.
*   **Interface Intuitiva**: Design limpo com componentes ShadCN UI e Tailwind CSS.
*   **Painel de Código Redimensionável**: Ajuste a largura do visualizador de código.

## Como Rodar Localmente

Para executar esta aplicação em seu ambiente local, siga os passos abaixo:

### Pré-requisitos

*   Node.js (versão `18.x` ou superior recomendada)
*   `npm` (geralmente vem com o Node.js) ou `yarn`

### Passos para Instalação e Execução

1.  **Clone o Repositório** (se você ainda não o fez):
    ```bash
    git clone <url_do_repositorio>
    cd <nome_do_diretorio_do_projeto>
    ```

2.  **Instale as Dependências**:
    Abra seu terminal na pasta do projeto e execute:
    ```bash
    npm install
    ```
    Ou, se você usa `yarn`:
    ```bash
    yarn install
    ```

3.  **Inicie o Servidor de Desenvolvimento**:
    Após a instalação das dependências, inicie o servidor Next.js:
    ```bash
    npm run dev
    ```
    Ou, com `yarn`:
    ```bash
    yarn dev
    ```
    Isso iniciará a aplicação em modo de desenvolvimento, geralmente na porta `9002`.

4.  **Acesse no Navegador**:
    Abra seu navegador e acesse:
    `http://localhost:9002`

    Você deverá ver a interface do Visual Script pronta para uso.

### (Opcional) Para Usuários do VS Code

Este projeto inclui um arquivo de configuração `/.vscode/launch.json`. Você pode usar a aba "Run and Debug" (Executar e Depurar) do VS Code para iniciar o servidor de desenvolvimento:

1.  Clique no ícone de "Run and Debug" na barra lateral (ou pressione `Ctrl+Shift+D` / `Cmd+Shift+D`).
2.  Selecione "**Run Next.js dev server (Local & Web IDEs)**" no menu suspenso.
3.  Pressione o botão de play (F5).
4.  Isso iniciará o servidor e deve abrir automaticamente a aplicação no seu navegador.

---

Divirta-se construindo seus scripts Python visualmente!
