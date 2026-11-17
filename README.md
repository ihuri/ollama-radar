# 🦙 Ollama Radar

Extensão de navegador (**Manifest V3**) que detecta o hardware da sua máquina, aprimora a página [ollama.com/search](https://ollama.com/search) (e `/library`) destacando automaticamente os modelos recomendados e adiciona explicações em português sobre **para que serve cada IA**.

---

## O que a extensão faz

- **Grifa modelos e tamanhos compatíveis com seu hardware** (calibrado por padrão para **Apple M5 Max • 18 núcleos • 36 GB RAM Unificada**):
  - **🌟 Verde Esmeralda (`14B` a `35B`):** Faixa ideal — máxima inteligência mantendo alta velocidade via Metal sem recorrer a swap.
  - **⚡ Azul / Ciano (`≤12B`):** Roda muito rápido — ideal para respostas instantâneas, autocomplete em IDEs e agentes em segundo plano.
  - **⚠️ Amarelo / Âmbar (`36B` a `48B` e `8x7B`):** No limite dos 36 GB — exige fechar apps pesados e manter contexto moderado.
  - **🚫 Vermelho / Esmaecido (`70B+`):** Pesado demais para 36 GB (causa *swap* intenso em disco).
  - **☁️ Roxo (`cloud`):** Execução remota na nuvem Ollama.
- **Marcações e explicações em português ("Para que serve:"):**
  - Traduz as tags nativas (`vision`, `tools`, `thinking`, `embedding`, `cloud`).
  - Exibe chips coloridos por finalidade (`💻 Código & Dev`, `🧠 Raciocínio & Lógica`, `💬 Chat & Texto Geral`, `👁️ Visão & OCR`, `📚 RAG / Embeddings`, `🤖 Agentes & Tools`).
  - Catálogo curado em PT-BR com mais de 40 modelos populares + classificador heurístico automático para lançamentos recentes.
- **Comando rápido em 1 clique:** Mostra o comando ideal para sua máquina (ex.: `ollama run qwen2.5-coder:32b`) com botão **Copiar comando**.
- **Barra de filtros rápidos no topo da página:** Filtre por compatibilidade com 36 GB ou por finalidade em português sem recarregar a busca.

---

## Como instalar no navegador (Chrome / Brave / Arc / Edge)

1. Abra a página de extensões do seu navegador:
   - **Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
   - **Arc:** `arc://extensions`
   - **Edge:** `edge://extensions`
2. Ative a opção **Modo do desenvolvedor** (*Developer mode*) no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz deste projeto (`Qual Melhor IA`).
5. Acesse [https://ollama.com/search](https://ollama.com/search) para ver os grifos, filtros e explicações em português.

> Para ajustar a quantidade de RAM caso utilize outro computador, clique no ícone da extensão na barra do navegador.

---

## Estrutura do Projeto

- [manifest.json](manifest.json) — Configuração Manifest V3 da extensão
- [src/data/hardware-profile.js](src/data/hardware-profile.js) — Cálculo de memória e classificação por tamanho
- [src/data/models-catalog-pt.js](src/data/models-catalog-pt.js) — Catálogo curado em PT-BR e classificador heurístico
- [src/content/content.js](src/content/content.js) — Varredura do DOM, `MutationObserver`, filtros e injeção de badges
- [src/styles/ollama-enhancer.css](src/styles/ollama-enhancer.css) — Estilos claros/escuros da interface injetada
- [src/popup/](src/popup/popup.html) — Popup de configuração de hardware e preferências
- [docs/plano-extensao-ollama.md](docs/plano-extensao-ollama.md) — Documento de planejamento detalhado
