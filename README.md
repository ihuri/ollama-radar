# 🦙 Ollama Radar

Extensão de navegador (**Manifest V3**) que identifica automaticamente o hardware da sua máquina (CPU, GPU, RAM total/livre e VRAM) e aprimora o site [ollama.com/search](https://ollama.com/search) (e `/library`) destacando os modelos de IA compatíveis com seu computador e adicionando explicações em português sobre **para que serve cada modelo**.

---

## Principais Recursos

### 1. Detecção Automática de Hardware
Ao abrir a extensão (ou clicar em **🔍 Detectar Hardware** no popup), o Ollama Radar consulta as APIs nativas do navegador para identificar o perfil real da máquina:
- **Memória RAM Total e Livre em Tempo Real (`chrome.system.memory`):** Lê a capacidade instalada e mostra quanta RAM está livre no momento.
- **Processador e Núcleos (`chrome.system.cpu`):** Identifica arquitetura (`arm64` / `x86_64`), modelo e quantidade de núcleos.
- **GPU / Memória Unificada (`WebGL`):**
  - **Apple Silicon (M1–M5):** Reconhece memória unificada compartilhada entre CPU e GPU (Metal) e reserva a margem do macOS automaticamente.
  - **GPUs Dedicadas (NVIDIA / AMD):** Identifica o modelo da placa de vídeo (ex.: RTX 3060, 4070, 4090, RX 7900) para estimar a VRAM dedicada disponível.
- **Ajuste Manual Opcional:** Caso queira simular outra máquina, é possível escolher perfis prontos (16 GB a 128 GB) ou definir RAM/VRAM manualmente no popup.

### 2. Grifo Dinâmico de Compatibilidade
Cada modelo e cada tag de tamanho (`0.5b`, `7b`, `14b`, `32b`, `70b`, `8x7b`, `e4b`, `cloud`, etc.) é classificado dinamicamente de acordo com o seu hardware detectado:
- **🌟 Verde Esmeralda (Ideal / *Sweet Spot*):** Melhor equilíbrio entre inteligência e velocidade dentro da sua VRAM/RAM útil.
- **⚡ Azul / Ciano (Muito Rápido):** Modelos leves que respondem quase instantaneamente e deixam memória livre para IDE e outros apps.
- **⚠️ Amarelo / Âmbar (No Limite):** Roda próximo do limite da sua máquina; recomenda-se fechar aplicativos pesados e usar contexto moderado.
- **🚫 Vermelho / Esmaecido (Pesado / *Swap*):** Excede sua memória útil e tende a causar lentidão severa por *swap* em disco.
- **☁️ Roxo (`cloud`):** Execução remota nos servidores da nuvem Ollama (sem consumir RAM local).

### 3. Marcações e Explicações em Português
- **Tradução das tags nativas:** `vision`, `tools`, `thinking`, `embedding` e `cloud`.
- **Chips por finalidade:** `💻 Código & Dev`, `🧠 Raciocínio & Lógica`, `💬 Chat & Texto Geral`, `👁️ Visão & OCR`, `📚 RAG / Embeddings`, `🤖 Agentes & Tools`.
- **Resumo "Para que serve:":** Catálogo curado em PT-BR com **50 modelos** populares + classificador heurístico automático para novos lançamentos.
- **Comando rápido em 1 clique:** Sugere o comando ideal para sua máquina (ex.: `ollama run <modelo>:<tag>`) com botão **Copiar comando**.
- **Barra de filtros rápidos no topo da página:** Filtre os resultados carregados por compatibilidade com seu hardware ou por área de uso em português.

---

## Como instalar no navegador (Chrome / Brave / Arc / Edge)

1. Abra a página de extensões do seu navegador:
   - **Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
   - **Arc:** `arc://extensions`
   - **Edge:** `edge://extensions`
2. Ative o **Modo do desenvolvedor** (*Developer mode*) no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*) e selecione a pasta raiz do projeto.
4. Clique no ícone `🦙` na barra do navegador para detectar seu hardware e acesse [https://ollama.com/search](https://ollama.com/search).

---

## Estrutura do Projeto

- [manifest.json](manifest.json) — Configuração Manifest V3 (`storage`, `scripting`, `activeTab`, `system.memory`, `system.cpu`) e ícones `🦙`
- [src/data/hardware-profile.js](src/data/hardware-profile.js) — Detecção automática de hardware, cálculo de memória e classificação por tamanho
- [src/data/models-catalog-pt.js](src/data/models-catalog-pt.js) — Catálogo curado em PT-BR (50 modelos) e classificador heurístico
- [src/content/content.js](src/content/content.js) — Varredura resiliente do DOM, `MutationObserver`, barra de filtros e injeção dos cards em PT-BR
- [src/styles/ollama-enhancer.css](src/styles/ollama-enhancer.css) — Estilos claros/escuros da interface injetada
- [src/popup/](src/popup/popup.html) — Popup com detecção de hardware, monitor de RAM livre e preferências
- [src/icons/](src/icons/icon128.png) — Ícones da extensão (`16x16`, `48x48`, `128x128`)
- [docs/plano-extensao-ollama.md](docs/plano-extensao-ollama.md) — Documento de planejamento inicial do projeto
