# Plano do Projeto: Qual Melhor IA — Ollama Helper

> Extensão de navegador (Manifest V3) para destacar modelos de IA recomendados para a sua máquina ao navegar em `https://ollama.com/search` (e `/library`), com marcações e explicações em português sobre a finalidade de cada modelo.

---

## 1. Visão Geral do Projeto

- **Nome sugerido:** Qual Melhor IA — Ollama Helper
- **Padrão:** Web Extension **Manifest V3** (compatível com Google Chrome, Brave, Arc e Microsoft Edge, sem necessidade de bundlers complexos).
- **Escopo de atuação automática:**
  - `https://ollama.com/search*`
  - `https://ollama.com/library*`
- **Objetivos principais:**
  1. **Grifar visualmente** os cards e tamanhos de modelos que rodam com folga, boa velocidade ou no limite do hardware da máquina.
  2. **Traduzir e explicar em português** para que serve cada modelo, suas capacidades técnicas e qual variante de tamanho escolher.
  3. **Facilitar a filtragem e o uso prático**, adicionando uma barra de filtros rápidos no topo da página e um botão para copiar o comando `ollama run <modelo>:<tag>` recomendado em 1 clique.

---

## 2. Diagnóstico da Máquina Alvo (Apple M5 Max — 36 GB)

### Especificações Reais Detectadas
- **Processador / SoC:** Apple M5 Max — 18 núcleos (6 Super + 12 Performance) com GPU integrada e aceleração via Metal.
- **Memória Unificada (RAM/VRAM compartilhada):** **36 GB** (`38.654.705.664` bytes).
- **Memória útil estimada para LLMs no macOS:** **~26 GB a 28 GB livres** em uso normal (reservando ~8 GB para o macOS, navegador e apps ativos), podendo chegar a **~30 GB** ao ajustar o limite de memória com `sysctl iogpu.wired_limit_mb`.

### Matemática de Consumo de Memória no Ollama
Para a quantização padrão utilizada pelo Ollama (`Q4_K_M`, 4-bit), o consumo aproximado de memória unificada segue a fórmula:

```text
VRAM ≈ (Parâmetros em Bilhões × 0,65 GB) + KV Cache (~2 GB)
```

> **Observação:** Janelas de contexto muito grandes (ex.: 32k–128k tokens) aumentam o tamanho do *KV Cache*, reduzindo a margem disponível para modelos no limite superior.

### Tabela de Classificação e Grifo por Tamanho (`[x-test-size]`)

| Faixa de Parâmetros | Exemplos de Tags | Consumo Estimado (`Q4_K_M`) | Grifo / Destaque Visual | Badge Principal | Comportamento Esperado no M5 Max (36 GB) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🌟 Faixa Ouro / Sweet Spot (14B a 35B)** | `14b`, `22b`, `24b`, `27b`, `30b`, `32b`, `35b` | ~10 GB a 23 GB | **Verde Esmeralda** (borda e realce do card + pill destacada) | `✨ Ideal p/ seu M5 Max` | Máxima inteligência mantendo alta velocidade via Metal sem recorrer a swap. |
| **⚡ Faixa Rápida / Leve (0.5B a 12B)** | `1b`, `3b`, `7b`, `8b`, `9b`, `12b` | ~1 GB a 9 GB | **Azul / Ciano** | `⚡ Roda Muito Rápido` | Respostas quase instantâneas; ideal para agentes locais, autocomplete ou uso simultâneo com IDEs pesadas. |
| **⚠️ Faixa Limite (36B a 48B e MoE `8x7b`)** | `8x7b`, `36b`, `40b`, `48b` | ~25 GB a 31 GB | **Amarelo / Âmbar** | `⚠️ No Limite dos 36GB` | Roda, mas exige fechar aplicativos pesados e manter janela de contexto moderada. |
| **🚫 Faixa Inviável Localmente (70B+ e Nuvem)** | `70b`, `72b`, `123b`, `405b`, `671b`, `cloud` | > 45 GB (ou remoto) | **Vermelho / Card Esmaecido** | `🚫 Pesado p/ 36GB (Swap)` ou `☁️ Nuvem` | Causa *swap* intenso em disco e lentidão severa localmente, ou executa apenas via nuvem (`cloud`). |

---

## 3. Mapeamento do DOM de `https://ollama.com/search`

O frontend do Ollama utiliza atributos de teste `x-test-*` estáveis, o que torna a leitura dos cards resiliente a mudanças de classes CSS (Tailwind):

| Elemento na Página | Seletor CSS | Função na Extensão |
| :--- | :--- | :--- |
| Card individual do modelo | `li[x-test-model]` | Container raiz para aplicar borda/grifo, esmaecimento, atributo de filtro e injeção dos blocos em PT-BR. |
| Nome / Título do modelo | `[x-test-search-response-title]` ou `[x-test-model-title]` | Chave de busca no catálogo curado (`models-catalog-pt.js`) e montagem do comando `ollama run`. |
| Badges de tamanho (parâmetros) | `span[x-test-size]` | Parsing numérico (`14b`, `32b`, `8x7b`, `cloud`, etc.) para colorir individualmente cada tamanho disponível. |
| Badges de capacidades | `span[x-test-capability]` | Tradução automática das tags nativas para português. |
| Descrição original | `p` dentro de `li[x-test-model]` | Entrada de texto para o motor heurístico quando o modelo não estiver no catálogo curado. |

### Suporte a Busca Dinâmica e Paginação (HTMX / Filtros)
A página `ollama.com/search` atualiza a listagem dinamicamente via HTMX ao digitar na busca, trocar categorias ou rolar/paginar:
- Será utilizado um `MutationObserver` observando a lista de resultados (`ul[role="list"]` ou container pai).
- Cada card processado receberá o atributo de controle `data-qmia-processed="true"` para evitar reprocessamento duplicado ou loops de mutação.
- Ao detectar novos cards no DOM, a extensão reaplica automaticamente os grifos, marcações em português e o filtro ativo na barra superior.

---

## 4. Sistema de Marcações em Português ("Para que serve cada modelo")

### 4.1 Tradução Direta das Capabilities Nativas (`[x-test-capability]`)
As tags nativas exibidas pelo Ollama recebem badge/rótulo traduzido ou tooltip explicativo:

| Tag Original (`[x-test-capability]`) | Marcação em Português | Significado |
| :--- | :--- | :--- |
| `vision` | `👁️ Visão (Imagens)` | Aceita imagens como entrada (OCR, leitura de telas, gráficos). |
| `tools` | `🛠️ Ferramentas & Agentes` | Suporta *function calling* / chamadas de ferramentas e automações. |
| `thinking` | `🧠 Raciocínio Profundo` | Gera cadeia de pensamento (*chain-of-thought*) antes da resposta final. |
| `embedding` | `📐 Embeddings / RAG` | Gera vetores numéricos para busca semântica e bases de conhecimento (não é chat). |
| `cloud` | `☁️ Apenas Nuvem` | Execução remota na nuvem Ollama (não consome memória local, mas requer conexão/conta). |

### 4.2 Camada Dupla de Identificação em Português

1. **Base Curada (`src/data/models-catalog-pt.js`)**
   Dicionário dedicado aos modelos mais populares e relevantes do ecossistema Ollama, incluindo:
   - **Código:** `qwen2.5-coder`, `codestral`, `deepseek-coder-v2`, `starcoder2`, `sqlcoder`
   - **Raciocínio / Matemática:** `deepseek-r1`, `qwen3`, `phi4`
   - **Chat Geral / Multitarefa:** `llama3.3`, `gemma3`, `mistral`, `command-r`
   - **Visão / Multimodal:** `llava`, `llama3.2-vision`
   - **Embeddings / RAG:** `nomic-embed-text`, `bge-m3`

   Cada entrada no catálogo curado armazena:
   - **Categoria(s) principal(is):** ex.: `Código & Dev`, `Raciocínio`.
   - **Resumo em português:** explicação direta e prática de para que serve o modelo.
   - **Tag recomendada para 36 GB:** ex.: `32b` para `qwen2.5-coder` ou `qwen3`, `27b` para `gemma3`, `14b`/`32b` para `deepseek-r1`.

2. **Motor Heurístico / Fallback Inteligente**
   Para modelos recém-lançados ou variantes da comunidade que não estejam no catálogo curado, o motor analisa palavras-chave no nome do modelo e na sua descrição original em inglês:
   - Palavras-chave mapeadas: `code`, `coder`, `math`, `reasoning`, `think`, `vision`, `ocr`, `embed`, `medical`, `sql`, `uncensored`, `roleplay`, `multilingual`, `agent`, `function calling`.
   - Gera automaticamente os chips de finalidade em PT-BR e uma frase explicativa traduzida sobre o foco principal do modelo, combinada com as tags `[x-test-capability]`.

### 4.3 Elementos Visuais Injetados em Cada Card
1. **Selo principal de compatibilidade no topo direito do card:**
   - Exemplo: `🏆 Recomendado p/ seu M5 Max (até 32B)` (ou `⚡ Leve e Rápido`, `⚠️ No Limite`, `🚫 Acima de 36GB`).
2. **Chips coloridos de finalidade em português:**
   - `💻 Código & Dev`
   - `🧠 Raciocínio & Matemática`
   - `💬 Chat & Texto Geral`
   - `👁️ Visão & OCR`
   - `📚 RAG / Vetores`
   - `🤖 Agentes`
3. **Caixa de resumo em português ("Para que serve:") + Comando rápido:**
   - Texto objetivo explicando o caso de uso ideal.
   - Recomendação do comando exato para a máquina (ex.: `ollama run qwen2.5-coder:32b`) com botão **Copiar Comando** em 1 clique e feedback visual (`Copiado!`).

---

## 5. Barra de Filtros Rápidos no Topo de `ollama.com/search`

Será injetada uma barra compacta e responsiva logo acima da lista de modelos (`ul[role="list"]`), permitindo filtrar os resultados já carregados na página sem recarregá-la:

- **Filtros por Compatibilidade de Hardware:**
  - `[Todos]`
  - `[🌟 Ideais p/ 36GB (14B–32B)]`
  - `[✅ Todos que rodam (≤35B)]`
- **Filtros por Finalidade em Português:**
  - `💻 Código`
  - `🧠 Raciocínio`
  - `💬 Chat`
  - `👁️ Visão`
  - `📚 Embeddings`

> Os filtros podem ser combinados (ex.: *Ideais p/ 36GB* + *Código*), exibindo um contador dinâmico de quantos modelos visíveis correspondem aos critérios.

---

## 6. Arquitetura e Estrutura de Arquivos da Extensão

Projeto estruturado em **Manifest V3 puro** (HTML, CSS e JavaScript vanilla modular), garantindo carregamento instantâneo e instalação direta via *"Carregar sem compactação"* (*Load unpacked*) no navegador:

```text
Qual Melhor IA/
├── docs/
│   └── plano-extensao-ollama.md
├── manifest.json
├── src/
│   ├── content/
│   │   └── content.js
│   ├── data/
│   │   ├── hardware-profile.js
│   │   └── models-catalog-pt.js
│   ├── styles/
│   │   └── ollama-enhancer.css
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
└── README.md
```

### Responsabilidade de Cada Módulo
- `manifest.json`: Permissões mínimas (`storage`), declaração dos content scripts e CSS para `https://ollama.com/search*` e `https://ollama.com/library*`, além da definição do popup.
- `src/data/hardware-profile.js`: Regras de cálculo de VRAM/RAM, faixas de classificação (Ouro, Rápida, Limite, Inviável) calibradas por padrão para **Apple M5 Max (36 GB)** e leitura/salvamento de perfil personalizado via `chrome.storage.local`.
- `src/data/models-catalog-pt.js`: Base curada em português dos principais modelos e motor heurístico de fallback para classificação de novos modelos.
- `src/content/content.js`: Varredura do DOM via seletores `x-test-*`, `MutationObserver`, grifo dos cards e badges `span[x-test-size]`, injeção das marcações em PT-BR, barra de filtros rápidos e botão de cópia do comando `ollama run`.
- `src/styles/ollama-enhancer.css`: Estilos isolados com prefixo `qmia-` para evitar conflitos com o Tailwind CSS do Ollama, com suporte ao tema claro e escuro do site.
- `src/popup/*`: Interface simples para visualizar o perfil detectado (**Apple M5 Max — 36 GB**), ajustar a memória alvo (caso o usuário queira reservar mais/menos RAM ou usar em outro computador) e ativar/desativar realces ou esmaecimento de modelos pesados.
- `README.md`: Guia rápido em português com passo a passo para carregar a extensão no Chrome/Brave/Arc/Edge.

---

## 7. Roadmap de Implementação (Etapas)

1. **Etapa 1 — Setup do `manifest.json` (MV3) e estilos CSS (`src/styles/ollama-enhancer.css`)**
   - Configurar o manifesto Manifest V3 e os estilos das faixas de destaque, selos, chips de categoria, caixa "Para que serve:" e barra de filtros.
2. **Etapa 2 — Motor de Hardware (`src/data/hardware-profile.js`)**
   - Implementar o parser de tamanhos (`0.5b`, `7b`, `32b`, `8x7b`, `cloud`, etc.), estimativa de uso de memória e classificação calibrada para 36 GB (com suporte a ajuste via popup).
3. **Etapa 3 — Catálogo em Português + Classificador Heurístico (`src/data/models-catalog-pt.js`)**
   - Preencher a base curada dos principais modelos em PT-BR e criar as regras heurísticas para modelos desconhecidos + tradução das capabilities.
4. **Etapa 4 — Content Script (`src/content/content.js`)**
   - Implementar o processamento de `li[x-test-model]`, `MutationObserver`, grifo de `[x-test-size]`, injeção da barra de filtros e cópia de comando `ollama run` com 1 clique.
5. **Etapa 5 — Popup de Configuração (`src/popup/*`) e `README.md`**
   - Criar o popup de gerenciamento rápido e documentar a instalação local no navegador.
