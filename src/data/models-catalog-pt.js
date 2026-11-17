(function (global) {
  "use strict";

  const CAPABILITY_LABELS_PT = Object.freeze({
    vision: {
      label: "👁️ Visão (Imagens)",
      tooltip: "Lê imagens, prints de tela, gráficos, documentos e faz OCR."
    },
    tools: {
      label: "🛠️ Ferramentas & Agentes",
      tooltip: "Suporta Function Calling para usar APIs, scripts e agentes MCP."
    },
    thinking: {
      label: "🧠 Raciocínio Profundo",
      tooltip: "Gera cadeia de pensamento (Chain-of-Thought) antes da resposta final."
    },
    embedding: {
      label: "📐 Embeddings / RAG",
      tooltip: "Gera vetores numéricos para busca semântica e RAG (não é modelo de chat)."
    },
    cloud: {
      label: "☁️ Apenas Nuvem",
      tooltip: "Roda nos servidores da nuvem Ollama sem consumir RAM local."
    }
  });

  const CATEGORY_DEFS = Object.freeze({
    code: {
      id: "code",
      label: "💻 Código & Dev",
      shortLabel: "💻 Código",
      className: "qmia-chip-code"
    },
    reasoning: {
      id: "reasoning",
      label: "🧠 Raciocínio & Lógica",
      shortLabel: "🧠 Raciocínio",
      className: "qmia-chip-reasoning"
    },
    chat: {
      id: "chat",
      label: "💬 Chat & Texto Geral",
      shortLabel: "💬 Chat",
      className: "qmia-chip-chat"
    },
    vision: {
      id: "vision",
      label: "👁️ Visão & OCR",
      shortLabel: "👁️ Visão",
      className: "qmia-chip-vision"
    },
    embedding: {
      id: "embedding",
      label: "📚 RAG / Embeddings",
      shortLabel: "📚 Embeddings",
      className: "qmia-chip-embedding"
    },
    agents: {
      id: "agents",
      label: "🤖 Agentes & Tools",
      shortLabel: "🤖 Agentes",
      className: "qmia-chip-agents"
    },
    specialized: {
      id: "specialized",
      label: "🎯 Especializado",
      shortLabel: "🎯 Especializado",
      className: "qmia-chip-specialized"
    }
  });

  const MODELS_CATALOG_PT = Object.freeze({
    "qwen2.5-coder": {
      categories: ["code"],
      purposePt:
        "Um dos melhores modelos locais para programação: escreve, refatora, corrige bugs e gera testes em dezenas de linguagens (Python, PHP/Laravel, JS/TS, SQL). A versão 32B é referência absoluta em 36 GB.",
      highlightsPt: ["Programação & Debug", "Refatoração", "Autocomplete / FIM"],
      bestTag36Gb: "32b"
    },
    "qwen3-coder": {
      categories: ["code", "agents"],
      purposePt:
        "Modelo focado em engenharia de software agêntica: resolve tarefas multi-arquivo, entende repositórios grandes e executa ferramentas de código com precisão.",
      highlightsPt: ["Agentes de Código", "Contexto Longo", "Tool Calling"],
      bestTag36Gb: "30b"
    },
    "deepseek-r1": {
      categories: ["reasoning", "code"],
      purposePt:
        "Modelo de raciocínio profundo (estilo OpenAI o1): pensa passo a passo antes de responder. Excelente para arquitetura de software, matemática, lógica complexa e depuração difícil.",
      highlightsPt: ["Cadeia de Pensamento", "Matemática & Lógica", "Debug Avançado"],
      bestTag36Gb: "32b"
    },
    "qwen3": {
      categories: ["chat", "reasoning", "agents"],
      purposePt:
        "Família versátil da Alibaba com modo híbrido de raciocínio ('thinking'), ótimo suporte a português, uso de ferramentas/agentes e código. As versões 14B, 30B (MoE) e 32B voam no M5 Max.",
      highlightsPt: ["Multiuso & PT-BR", "Modo Thinking", "Agentes / Tools"],
      bestTag36Gb: "32b"
    },
    "qwen2.5": {
      categories: ["chat", "code"],
      purposePt:
        "Modelo generalista muito equilibrado para conversação em português, resumos, análise de dados estruturados (JSON), redação e programação geral.",
      highlightsPt: ["Excelente em PT-BR", "JSON Estruturado", "Uso Geral"],
      bestTag36Gb: "32b"
    },
    "llama3.3": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelo flagship da Meta (70B). Atenção: o 70B padrão excede 36 GB e causa swap lento; prefira modelos 24B–32B para rodar com fluidez no seu Mac.",
      highlightsPt: ["Conversa Avançada", "Inglês / Multilíngue", "Pesado p/ 36GB"],
      bestTag36Gb: "70b"
    },
    "llama3.2": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelos ultraleves da Meta (1B e 3B) otimizados para velocidade extrema em tarefas simples: resumos curtos, classificação de texto e automações rápidas em segundo plano.",
      highlightsPt: ["Ultrarrápido (1B–3B)", "Baixíssimo Consumo", "Automações Leves"],
      bestTag36Gb: "3b"
    },
    "llama3.2-vision": {
      categories: ["vision", "chat"],
      purposePt:
        "Versão multimodal do Llama 3.2 capaz de ler imagens, extrair texto de documentos/prints (OCR), interpretar gráficos e responder perguntas sobre fotos.",
      highlightsPt: ["Leitura de Imagens", "OCR & Gráficos", "Multimodal"],
      bestTag36Gb: "11b"
    },
    "llama3.1": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelo clássico da Meta com janela de contexto de 128k tokens e ótimo suporte a ferramentas (tool calling). A variante 8B roda instantaneamente no M5 Max.",
      highlightsPt: ["Contexto 128k", "Function Calling", "Muito Rápido (8B)"],
      bestTag36Gb: "8b"
    },
    "llama4": {
      categories: ["chat", "vision", "agents"],
      purposePt:
        "Nova geração MoE multimodal da Meta (Scout 16x17B e Maverick). Exige muita memória (65+ GB) e tende a causar swap em máquinas de 36 GB.",
      highlightsPt: ["Multimodal Nativo", "Arquitetura MoE", "Exige +64 GB RAM"],
      bestTag36Gb: "16x17b"
    },
    "gemma3": {
      categories: ["chat", "vision"],
      purposePt:
        "Modelo recente do Google com ótima compreensão de português, raciocínio limpo e visão multimodal integrada (a partir de 4B). O tamanho 27B é um dos melhores para 36 GB.",
      highlightsPt: ["Visão Integrada", "Ótimo em PT-BR", "Ideal em 27B"],
      bestTag36Gb: "27b"
    },
    "gemma3n": {
      categories: ["chat", "vision"],
      purposePt:
        "Versão ultraeficiente do Gemma 3 projetada para dispositivos locais e notebooks, entregando ótima qualidade consumindo pouca memória (tags e2b e e4b).",
      highlightsPt: ["Eficiência Extrema", "Roda com Folga", "Uso Diário Leve"],
      bestTag36Gb: "e4b"
    },
    "gemma2": {
      categories: ["chat"],
      purposePt:
        "Modelo consolidado do Google conhecido por respostas claras, boa escrita criativa e explicações didáticas. A versão 27B aproveita muito bem o M5 Max.",
      highlightsPt: ["Escrita & Didática", "Respostas Limpas", "Ideal em 27B"],
      bestTag36Gb: "27b"
    },
    "mistral": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelo 7B ágil e confiável da Mistral AI, ótimo para seguir instruções, responder rapidamente e executar chamadas de ferramentas sem pesar na memória.",
      highlightsPt: ["Rápido (7B)", "Tool Calling", "Baixo Consumo"],
      bestTag36Gb: "7b"
    },
    "mistral-small": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelo intermediário de altíssima qualidade da Mistral (22B/24B). Excelente equilíbrio para tarefas empresariais, código, agentes e textos em múltiplos idiomas.",
      highlightsPt: ["Sweet Spot (24B)", "Agentes & JSON", "Alta Qualidade"],
      bestTag36Gb: "24b"
    },
    "mistral-nemo": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelo de 12B desenvolvido pela Mistral + NVIDIA com suporte robusto a múltiplos idiomas, janela de 128k e uso de ferramentas, rodando com extrema folga em 36 GB.",
      highlightsPt: ["12B Ágil", "Contexto 128k", "Multilíngue"],
      bestTag36Gb: "12b"
    },
    "mixtral": {
      categories: ["chat", "code"],
      purposePt:
        "Modelo Mixture-of-Experts (8x7B) rápido na inferência, porém ocupa ~26–30 GB na RAM. Roda no limite em 36 GB fechando outros aplicativos pesados.",
      highlightsPt: ["MoE 8x7B", "No Limite (36GB)", "Bom Custo-Benefício"],
      bestTag36Gb: "8x7b"
    },
    "phi4": {
      categories: ["reasoning", "code", "chat"],
      purposePt:
        "Modelo de 14B da Microsoft com desempenho surpreendente em lógica, matemática, ciência e código para o seu tamanho — voa no Apple M5 Max.",
      highlightsPt: ["14B Super Compacto", "Lógica & Matemática", "Altíssima Velocidade"],
      bestTag36Gb: "14b"
    },
    "phi4-mini": {
      categories: ["chat", "agents"],
      purposePt:
        "Versão compacta (3.8B) da família Phi-4 focada em raciocínio leve, classificação, automações rápidas e suporte a funções em hardware modesto.",
      highlightsPt: ["Compacto (3.8B)", "Rápido p/ Agentes", "Consumo Mínimo"],
      bestTag36Gb: "3.8b"
    },
    "codestral": {
      categories: ["code"],
      purposePt:
        "Modelo dedicado da Mistral para programação (22B), suportando mais de 80 linguagens e preenchimento de código (Fill-in-the-Middle) para IDEs como Continue/Zed/VS Code.",
      highlightsPt: ["IDE / Autocomplete", "+80 Linguagens", "Ideal em 22B"],
      bestTag36Gb: "22b"
    },
    "devstral": {
      categories: ["code", "agents"],
      purposePt:
        "Modelo de 24B criado especificamente para agentes de engenharia de software (como OpenHands / Cline), capaz de navegar por codebases, editar arquivos e corrigir issues.",
      highlightsPt: ["Agentes SWE", "Edição Multi-arquivo", "Ideal em 24B"],
      bestTag36Gb: "24b"
    },
    "deepseek-coder-v2": {
      categories: ["code"],
      purposePt:
        "Modelo MoE especializado em código e matemática (16B roda com muita folga e velocidade; 236B é apenas para servidores robustos).",
      highlightsPt: ["Especialista em Código", "16B Muito Rápido", "SQL & Scripts"],
      bestTag36Gb: "16b"
    },
    "deepseek-v3": {
      categories: ["chat", "code", "reasoning"],
      purposePt:
        "Modelo gigante de 671B de parâmetros da DeepSeek. Impossível rodar localmente em 36 GB — indicado apenas para servidores multi-GPU ou execução via nuvem.",
      highlightsPt: ["671B Gigante", "Inviável Local (36GB)", "Uso via Nuvem"],
      bestTag36Gb: "671b"
    },
    "starcoder2": {
      categories: ["code"],
      purposePt:
        "Modelo aberto treinado em mais de 600 linguagens de programação para autocomplete rápido (FIM) em editores de código locais.",
      highlightsPt: ["Autocomplete IDE", "Leve (3B–15B)", "600+ Linguagens"],
      bestTag36Gb: "15b"
    },
    "codellama": {
      categories: ["code"],
      purposePt:
        "Clássico da Meta para geração e explicação de código. Embora superado por Qwen2.5-Coder e Codestral, ainda é útil e rápido nas variantes 7B, 13B e 34B.",
      highlightsPt: ["Geração de Código", "Opções 13B / 34B", "Estável"],
      bestTag36Gb: "34b"
    },
    "codegemma": {
      categories: ["code"],
      purposePt:
        "Variante do Gemma ajustada pelo Google para autocompletar código e responder dúvidas rápidas de programação com baixíssima latência (7B).",
      highlightsPt: ["Autocomplete Rápido", "7B Leve", "Chat de Código"],
      bestTag36Gb: "7b"
    },
    "qwen2.5vl": {
      categories: ["vision", "agents"],
      purposePt:
        "Um dos melhores modelos de visão open-source: lê PDFs, notas fiscais, telas de interface, gráficos e localiza elementos na imagem com precisão. A versão 32B roda ótima em 36 GB.",
      highlightsPt: ["OCR Avançado", "Leitura de UI/Telas", "Ideal em 32B"],
      bestTag36Gb: "32b"
    },
    "llava": {
      categories: ["vision", "chat"],
      purposePt:
        "Modelo multimodal pioneiro que combina visão computacional e chat para descrever imagens, analisar capturas de tela e responder perguntas visuais.",
      highlightsPt: ["Descrição de Imagens", "Multimodal Clássico", "Opções 7B / 13B"],
      bestTag36Gb: "13b"
    },
    "minicpm-v": {
      categories: ["vision"],
      purposePt:
        "Modelo multimodal compacto (8B) com excelente taxa de acerto em OCR e leitura de imagens consumindo apenas ~6 GB de memória.",
      highlightsPt: ["Visão Compacta (8B)", "OCR Eficiente", "Baixo Consumo"],
      bestTag36Gb: "8b"
    },
    "moondream": {
      categories: ["vision"],
      purposePt:
        "Modelo de visão ultrapequeno (1.8B) ideal para rodar em segundo plano classificando imagens, gerando legendas e detectando objetos rapidamente.",
      highlightsPt: ["Ultraleve (1.8B)", "Automação Visual", "Consumo Mínimo"],
      bestTag36Gb: "1.8b"
    },
    "nomic-embed-text": {
      categories: ["embedding"],
      purposePt:
        "Modelo de embeddings de alta qualidade e contexto longo (8192 tokens) para construir sistemas RAG, busca semântica em PDFs e bancos vetoriais locais.",
      highlightsPt: ["Busca Semântica / RAG", "Contexto 8k", "Ultraleve (<1 GB)"],
      bestTag36Gb: "latest"
    },
    "mxbai-embed-large": {
      categories: ["embedding"],
      purposePt:
        "Embeddings vetoriais de altíssima precisão (Mixedbread) para indexar documentos, código e bases de conhecimento locais em sistemas RAG.",
      highlightsPt: ["Alta Precisão RAG", "Indexação de Docs", "Leve (~700 MB)"],
      bestTag36Gb: "latest"
    },
    "bge-m3": {
      categories: ["embedding"],
      purposePt:
        "Modelo de embeddings multilíngue (excelente em português!) com suporte a textos longos (8k) para busca semântica e RAG em documentos em PT-BR.",
      highlightsPt: ["Ótimo em Português", "RAG Multilíngue", "Leve (~1.2 GB)"],
      bestTag36Gb: "latest"
    },
    "snowflake-arctic-embed": {
      categories: ["embedding"],
      purposePt:
        "Família de embeddings da Snowflake focada em recuperação empresarial de alta velocidade e precisão para bancos vetoriais (pgvector, Qdrant, Chroma).",
      highlightsPt: ["RAG Empresarial", "Várias Escalas", "Alta Velocidade"],
      bestTag36Gb: "335m"
    },
    "all-minilm": {
      categories: ["embedding"],
      purposePt:
        "Embeddings minúsculos e ultrarrápidos (~45 MB) para deduplicação, clustering de frases e busca vetorial com latência praticamente zero.",
      highlightsPt: ["Extremamente Leve", "Latência Zero", "Frases Curtas"],
      bestTag36Gb: "latest"
    },
    "command-r": {
      categories: ["chat", "agents"],
      purposePt:
        "Modelo de 35B da Cohere especializado em RAG empresarial, respostas fundamentadas com citações e uso avançado de ferramentas. Roda no limite superior do sweet spot (35B).",
      highlightsPt: ["RAG com Citações", "Uso Corporativo", "Tool Use (35B)"],
      bestTag36Gb: "35b"
    },
    "command-r-plus": {
      categories: ["chat", "agents"],
      purposePt:
        "Versão expandida (104B) do Command-R para RAG e agentes corporativos complexos. Excede os 36 GB de memória e não é recomendada para uso local.",
      highlightsPt: ["104B Pesado", "RAG Corporativo", "Inviável Local (36GB)"],
      bestTag36Gb: "104b"
    },
    "sqlcoder": {
      categories: ["code", "specialized"],
      purposePt:
        "Modelo treinado especificamente para converter perguntas em linguagem natural em queries SQL complexas (PostgreSQL, MySQL, SQL Server).",
      highlightsPt: ["Texto para SQL", "Análise de Dados", "Leve (7B–15B)"],
      bestTag36Gb: "15b"
    },
    "qwq": {
      categories: ["reasoning", "code"],
      purposePt:
        "Modelo de raciocínio de 32B da equipe Qwen que brilha em problemas matemáticos, programação competitiva e decisões passo a passo — encaixa perfeitamente nos 36 GB.",
      highlightsPt: ["Raciocínio 32B", "Ideal p/ M5 Max", "Lógica & Código"],
      bestTag36Gb: "32b"
    },
    "openthinker": {
      categories: ["reasoning"],
      purposePt:
        "Modelo open-source de raciocínio destilado (7B e 32B) treinado para pensar de forma estruturada em ciência, matemática e programação.",
      highlightsPt: ["Open Reasoning", "Opção 32B Ideal", "Ciência & Código"],
      bestTag36Gb: "32b"
    },
    "cogito": {
      categories: ["reasoning", "agents"],
      purposePt:
        "Modelo híbrido da Deep Cogito que alterna entre respostas diretas rápidas e reflexão profunda antes de responder, além de suportar ferramentas (até 32B no M5 Max).",
      highlightsPt: ["Raciocínio Híbrido", "Tool Calling", "Até 32B Fluido"],
      bestTag36Gb: "32b"
    },
    "dolphin3": {
      categories: ["chat", "code", "specialized"],
      purposePt:
        "Assistente geral sem censura/restrições excessivas (base Llama 3.1 8B), útil para pesquisa red-team, escrita criativa livre e experimentação local.",
      highlightsPt: ["Sem Filtros (Uncensored)", "8B Rápido", "Escrita & Pesquisa"],
      bestTag36Gb: "8b"
    },
    "aya-expanse": {
      categories: ["chat", "specialized"],
      purposePt:
        "Modelo da Cohere altamente otimizado para 23 idiomas — incluindo português — ótimo para tradução, resumo e redação natural fora do inglês.",
      highlightsPt: ["Foco Multilíngue", "Forte em Português", "8B e 32B"],
      bestTag36Gb: "32b"
    },
    "olmo2": {
      categories: ["chat"],
      purposePt:
        "Modelo 100% aberto da AllenAI (dados, pesos e código abertos), ótimo para pesquisa acadêmica, auditoria de LLMs e tarefas gerais em 7B, 13B e 32B.",
      highlightsPt: ["Totalmente Open Source", "Pesquisa Acadêmica", "Ideal em 32B"],
      bestTag36Gb: "32b"
    },
    "smollm2": {
      categories: ["chat"],
      purposePt:
        "Micro-modelos da Hugging Face (135M a 1.7B) feitos para rodar com consumo mínimo em automações simples, testes unitários ou classificação local instantânea.",
      highlightsPt: ["Micro LLM (135M–1.7B)", "Instantâneo", "Consumo Quase Zero"],
      bestTag36Gb: "1.7b"
    },
    "deepseek-v4.1-flash": {
      categories: ["reasoning", "vision", "agents"],
      purposePt:
        "Modelo rápido da família DeepSeek v4.1 focado em alta vazão, visão, raciocínio e uso de ferramentas. Disponível apenas via execução remota na nuvem Ollama.",
      highlightsPt: ["Nuvem Ollama", "Alta Velocidade", "Visão & Tools"],
      bestTag36Gb: "cloud"
    },
    "glm-5.3": {
      categories: ["code", "reasoning", "agents"],
      purposePt:
        "Modelo principal (flagship) da Z.ai voltado para programação avançada e tarefas agênticas de longo prazo com raciocínio profundo. Executa via nuvem Ollama.",
      highlightsPt: ["Coding Flagship", "Agentes Longos", "Nuvem Ollama"],
      bestTag36Gb: "cloud"
    },
    "glm-5.3-flash": {
      categories: ["code", "vision", "reasoning", "agents"],
      purposePt:
        "Modelo multimodal nativo da Z.ai com 18B parâmetros ativos, focado em código, visão e agentes com excelente custo-benefício via nuvem Ollama.",
      highlightsPt: ["Multimodal + Código", "18B Ativos", "Nuvem Ollama"],
      bestTag36Gb: "cloud"
    },
    "inkling-2-small": {
      categories: ["code", "vision", "reasoning", "agents"],
      purposePt:
        "Modelo Mixture-of-Experts gigante de 594B (17B ativos) com contexto de até 1M de tokens, visão e foco em engenharia de código e conhecimento. Roda na nuvem Ollama (inviável localmente em 36 GB).",
      highlightsPt: ["MoE 594B (17B ativos)", "Contexto 1M", "Apenas Nuvem"],
      bestTag36Gb: "cloud"
    },
    "mimo-v2.6": {
      categories: ["code", "vision", "reasoning", "agents"],
      purposePt:
        "Modelo de 9B da Xiaomi MiMo (destilado do Qwen 9B) voltado para programação, workflows de agentes, visão e raciocínio. Roda com extrema folga e rapidez no seu Apple M5 Max.",
      highlightsPt: ["9B Ultrarrápido", "Código & Agentes", "Roda Liso no M5 Max"],
      bestTag36Gb: "9b"
    }
  });

  const SLUG_ALIASES = Object.freeze({
    "qwen2.5-vl": "qwen2.5vl",
    "llama-3.3": "llama3.3",
    "llama-3.2": "llama3.2",
    "llama-3.1": "llama3.1",
    "gemma-3": "gemma3",
    "gemma-2": "gemma2"
  });

  const HEURISTIC_RULES = Object.freeze([
    {
      category: "embedding",
      keywords: ["embed", "embedding", "vector", "retrieval", "semantic search", "rag", "bge", "minilm"],
      capability: "embedding",
      highlight: "Busca Semântica / RAG",
      phrasePt: "gerar vetores (embeddings) para busca semântica, RAG e indexação de documentos"
    },
    {
      category: "code",
      keywords: ["code", "coder", "coding", "codestral", "devstral", "starcoder", "sql", "programming", "software", "fim", "developer"],
      capability: null,
      highlight: "Programação & Código",
      phrasePt: "geração, refatoração, depuração e autocompletar de código"
    },
    {
      category: "reasoning",
      keywords: ["reason", "reasoning", "thinking", "think", "math", "logic", "qwq", "r1", "olympiad", "step-by-step", "science"],
      capability: "thinking",
      highlight: "Raciocínio & Lógica",
      phrasePt: "resolução de problemas complexos, matemática e raciocínio passo a passo"
    },
    {
      category: "vision",
      keywords: ["vision", "visual", "llava", "ocr", "image", "images", "multimodal", "screenshot", "moondream", "vl"],
      capability: "vision",
      highlight: "Visão & OCR",
      phrasePt: "análise de imagens, leitura de documentos/prints (OCR) e tarefas multimodais"
    },
    {
      category: "agents",
      keywords: ["tool", "tools", "agent", "agentic", "function calling", "mcp", "workflow"],
      capability: "tools",
      highlight: "Agentes & Ferramentas",
      phrasePt: "chamadas de ferramentas (function calling) e automações em agentes"
    },
    {
      category: "specialized",
      keywords: ["medical", "medicine", "health", "clinical", "legal", "finance", "uncensored", "roleplay", "story", "multilingual", "translate", "guard", "safety"],
      capability: null,
      highlight: "Domínio Especializado",
      phrasePt: "tarefas específicas de domínio (como tradução, área médica/jurídica, segurança ou escrita livre)"
    }
  ]);

  function normalizeSlug(slug) {
    const clean = String(slug || "")
      .trim()
      .toLowerCase()
      .replace(/^\/?(?:library\/)?/, "")
      .split(/[?#:]/)[0];
    return SLUG_ALIASES[clean] || clean;
  }

  function translateCapability(cap) {
    const key = String(cap || "").trim().toLowerCase();
    return CAPABILITY_LABELS_PT[key] || null;
  }

  function buildHeuristicEntry(slug, description, capabilities) {
    const text = `${slug} ${description || ""}`.toLowerCase();
    const caps = new Set((capabilities || []).map((c) => String(c || "").trim().toLowerCase()));

    const categories = [];
    const highlightsPt = [];
    const phrasesPt = [];

    for (const rule of HEURISTIC_RULES) {
      const matchedCap = rule.capability && caps.has(rule.capability);
      const matchedKeyword = rule.keywords.some((kw) => {
        if (kw.length <= 3) {
          return new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, "i").test(text);
        }
        return text.includes(kw);
      });

      if (matchedCap || matchedKeyword) {
        if (!categories.includes(rule.category)) {
          categories.push(rule.category);
        }
        if (!highlightsPt.includes(rule.highlight)) {
          highlightsPt.push(rule.highlight);
        }
        if (!phrasesPt.includes(rule.phrasePt)) {
          phrasesPt.push(rule.phrasePt);
        }
      }
    }

    if (categories.length === 0) {
      categories.push("chat");
      highlightsPt.push("Conversação & Texto Geral");
      phrasesPt.push("conversação geral, resumos, redação e assistência cotidiana");
    } else if (!categories.includes("embedding") && !categories.includes("chat")) {
      if (text.includes("chat") || text.includes("assistant") || text.includes("instruct")) {
        categories.push("chat");
      }
    }

    let purposePt;
    if (categories.includes("embedding") && phrasesPt.length === 1) {
      purposePt = `Modelo dedicado para ${phrasesPt[0]} (não responde como chat).`;
    } else if (phrasesPt.length === 1) {
      purposePt = `Modelo indicado principalmente para ${phrasesPt[0]}.`;
    } else {
      const last = phrasesPt[phrasesPt.length - 1];
      const head = phrasesPt.slice(0, -1).join(", ");
      purposePt = `Modelo versátil focado em ${head} e ${last}.`;
    }

    if (caps.has("cloud") && !text.includes("local")) {
      highlightsPt.push("Suporte a Nuvem");
    }

    return {
      categories,
      purposePt,
      highlightsPt: highlightsPt.slice(0, 3),
      bestTag36Gb: null,
      isCatalogMatch: false
    };
  }

  /**
   * Obtém informações em português do catálogo curado ou do classificador heurístico.
   */
  function getModelInfoPt(modelSlug, originalDescription, capabilities) {
    const slug = normalizeSlug(modelSlug);
    const curated = MODELS_CATALOG_PT[slug];

    if (curated) {
      const caps = new Set((capabilities || []).map((c) => String(c || "").trim().toLowerCase()));
      const categories = [...curated.categories];
      if (caps.has("vision") && !categories.includes("vision")) {
        categories.push("vision");
      }
      if (caps.has("tools") && !categories.includes("agents")) {
        categories.push("agents");
      }
      if (caps.has("thinking") && !categories.includes("reasoning")) {
        categories.push("reasoning");
      }
      if (caps.has("embedding") && !categories.includes("embedding")) {
        categories.push("embedding");
      }

      return {
        slug,
        categories,
        purposePt: curated.purposePt,
        highlightsPt: curated.highlightsPt,
        bestTag36Gb: curated.bestTag36Gb || null,
        isCatalogMatch: true
      };
    }

    return {
      slug,
      ...buildHeuristicEntry(slug, originalDescription, capabilities)
    };
  }

  global.QMIA_Catalog = {
    CAPABILITY_LABELS_PT,
    CATEGORY_DEFS,
    MODELS_CATALOG_PT,
    normalizeSlug,
    translateCapability,
    getModelInfoPt
  };
})(typeof window !== "undefined" ? window : globalThis);
