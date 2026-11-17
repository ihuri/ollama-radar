(function () {
  "use strict";

  if (window.__QMIA_CONTENT_INITIALIZED__) {
    if (typeof window.__QMIA_REFRESH__ === "function") {
      window.__QMIA_REFRESH__();
    }
    return;
  }
  window.__QMIA_CONTENT_INITIALIZED__ = true;

  const Hardware = window.QMIA_Hardware;
  const Catalog = window.QMIA_Catalog;

  if (!Hardware || !Catalog) {
    return;
  }

  const CAPABILITY_NAMES = new Set(["vision", "tools", "thinking", "embedding", "cloud"]);
  const SIZE_PILL_REGEX = /^(?:\d+(?:\.\d+)?b|\d{2,3}(?:\.\d+)?m|\d+(?:\.\d+)?x\d+(?:\.\d+)?b|e\d+b)$/i;
  const NON_MODEL_ROUTES = new Set([
    "",
    "search",
    "library",
    "models",
    "blog",
    "download",
    "signin",
    "signup",
    "login",
    "logout",
    "cloud",
    "docs",
    "pricing",
    "about",
    "settings",
    "account",
    "privacy",
    "terms",
    "api",
    "contact",
    "enterprise",
    "new",
    "c",
    "category",
    "categories",
    "tags",
    "auth",
    "oauth",
    "u",
    "user",
    "users"
  ]);

  const SIZE_TIER_CLASSES = [
    "qmia-size-pill",
    "qmia-size-sweet",
    "qmia-size-fast",
    "qmia-size-limit",
    "qmia-size-heavy",
    "qmia-size-cloud",
    "qmia-size-unknown"
  ];
  const CARD_TIER_CLASSES = [
    "qmia-card-enhanced",
    "qmia-card-sweet",
    "qmia-card-fast",
    "qmia-card-limit",
    "qmia-card-heavy",
    "qmia-card-cloud",
    "qmia-card-unknown",
    "qmia-dimmed"
  ];

  const state = {
    profile: { ...Hardware.DEFAULT_PROFILE },
    compatFilter: "all", // "all" | "sweet" | "runnable"
    categoryFilter: "all", // "all" | categoryId
    renderScheduled: false,
    observer: null
  };

  function getModelSlugFromHref(href) {
    if (!href) {
      return "";
    }
    let path = href;
    try {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        const parsed = new URL(href);
        if (!parsed.hostname.endsWith("ollama.com")) {
          return "";
        }
        path = parsed.pathname;
      }
    } catch (_) {
      return "";
    }

    const cleanPath = path.split(/[?#]/)[0];
    const libraryMatch = cleanPath.match(/^\/library\/([^/]+)\/?$/i);
    if (libraryMatch && libraryMatch[1]) {
      return Catalog.normalizeSlug(libraryMatch[1]);
    }

    const singleSegmentMatch = cleanPath.match(/^\/([a-z0-9][a-z0-9._-]*)\/?$/i);
    if (singleSegmentMatch && singleSegmentMatch[1]) {
      const candidate = singleSegmentMatch[1].toLowerCase();
      if (!NON_MODEL_ROUTES.has(candidate)) {
        return Catalog.normalizeSlug(candidate);
      }
    }

    const twoSegmentMatch = cleanPath.match(
      /^\/([a-z0-9][a-z0-9._-]*)\/([a-z0-9][a-z0-9._-]*)\/?$/i
    );
    if (twoSegmentMatch && twoSegmentMatch[1] && twoSegmentMatch[2]) {
      const ns = twoSegmentMatch[1].toLowerCase();
      if (!NON_MODEL_ROUTES.has(ns)) {
        return Catalog.normalizeSlug(`${twoSegmentMatch[1]}/${twoSegmentMatch[2]}`);
      }
    }

    return "";
  }

  function isCandidateModelLink(linkEl) {
    if (!linkEl || linkEl.closest("header, nav, footer, .qmia-toolbar, .qmia-info-box")) {
      return false;
    }
    const slug = getModelSlugFromHref(linkEl.getAttribute("href") || "");
    return Boolean(slug);
  }

  function countDistinctModelLinks(container) {
    const links = container.querySelectorAll("a[href]");
    const slugs = new Set();
    for (const a of links) {
      const slug = getModelSlugFromHref(a.getAttribute("href") || "");
      if (slug) {
        slugs.add(slug);
      }
    }
    return slugs.size;
  }

  function resolveCardContainer(linkEl) {
    const semanticContainer = linkEl.closest("li[x-test-model], li, article");
    if (
      semanticContainer &&
      !semanticContainer.closest("header, nav, footer") &&
      countDistinctModelLinks(semanticContainer) <= 1
    ) {
      return semanticContainer;
    }

    let current = linkEl;
    for (let depth = 0; depth < 4; depth += 1) {
      const parent = current.parentElement;
      if (!parent || parent === document.body || parent.tagName === "MAIN") {
        break;
      }
      const parentSlugCount = countDistinctModelLinks(parent);
      if (parentSlugCount > 1) {
        return current;
      }
      current = parent;
    }

    return linkEl;
  }

  function findModelCards() {
    const legacyCards = Array.from(document.querySelectorAll("li[x-test-model]"));
    if (legacyCards.length > 0) {
      return legacyCards;
    }

    const allLinks = Array.from(document.querySelectorAll('a[href^="/"], a[href*="ollama.com/"]'));
    const cards = [];
    const seen = new Set();

    for (const link of allLinks) {
      if (!isCandidateModelLink(link)) {
        continue;
      }
      const card = resolveCardContainer(link);
      if (!card || seen.has(card)) {
        continue;
      }
      const cardText = (card.textContent || "").trim();
      if (cardText.length < 15) {
        continue;
      }
      seen.add(card);
      cards.push(card);
    }

    return cards;
  }

  function extractDescriptionElement(card) {
    const paragraphs = Array.from(card.querySelectorAll("p"));
    for (const p of paragraphs) {
      if (p.closest(".qmia-info-box")) {
        continue;
      }
      if (p.querySelector("[x-test-pull-count], [x-test-updated]")) {
        continue;
      }
      const text = (p.textContent || "").trim();
      if (!text) {
        continue;
      }
      if (/^\d+(?:[.,]\d+)?[kmb]?\s*(?:pulls?|tags?)?$/i.test(text) || /^updated\s+/i.test(text)) {
        continue;
      }
      if (/^\$+$/.test(text)) {
        continue;
      }
      return p;
    }
    return null;
  }

  function detectDynamicPills(card) {
    const sizeEls = [];
    const capEls = [];
    const seenSize = new Set();
    const seenCap = new Set();

    for (const el of card.querySelectorAll("[x-test-size], span[x-test-size]")) {
      if (!el.closest(".qmia-info-box") && !seenSize.has(el)) {
        seenSize.add(el);
        sizeEls.push(el);
      }
    }

    for (const el of card.querySelectorAll("[x-test-capability], span[x-test-capability]")) {
      if (!el.closest(".qmia-info-box") && !seenCap.has(el)) {
        seenCap.add(el);
        capEls.push(el);
      }
    }

    const leafCandidates = card.querySelectorAll("span, div, a");
    for (const el of leafCandidates) {
      if (el.closest(".qmia-info-box, p, h1, h2, h3")) {
        continue;
      }
      if (el.tagName === "A" && getModelSlugFromHref(el.getAttribute("href") || "")) {
        continue;
      }
      if (el.children.length > 0) {
        continue;
      }

      const rawText =
        el.dataset.qmiaOrigCap || el.dataset.qmiaOrigText || (el.textContent || "").trim();
      if (!rawText || rawText.length > 24) {
        continue;
      }

      const lower = rawText.toLowerCase();
      if (CAPABILITY_NAMES.has(lower)) {
        if (!seenCap.has(el)) {
          seenCap.add(el);
          capEls.push(el);
        }
        continue;
      }

      if (SIZE_PILL_REGEX.test(lower) && !seenSize.has(el)) {
        seenSize.add(el);
        sizeEls.push(el);
      }
    }

    return { sizeEls, capEls };
  }

  function extractCardData(card) {
    const titleEl = card.querySelector(
      "[x-test-search-response-title], [x-test-model-title], h2, h3"
    );

    let slug = "";
    if (card.tagName === "A") {
      slug = getModelSlugFromHref(card.getAttribute("href") || "");
    }
    if (!slug) {
      const links = card.querySelectorAll("a[href]");
      for (const a of links) {
        slug = getModelSlugFromHref(a.getAttribute("href") || "");
        if (slug) {
          break;
        }
      }
    }

    let titleText = titleEl ? (titleEl.textContent || "").trim() : "";
    if (!titleText && slug) {
      titleText = slug;
    }
    if (!slug && titleText) {
      const cleanedTitle = titleText.replace(/\s+\d+\s*(?:mo|wk|w|d|h|y|m)\b.*$/i, "").trim();
      slug = Catalog.normalizeSlug(cleanedTitle);
    }

    const { sizeEls, capEls } = detectDynamicPills(card);

    const sizeTexts = sizeEls.map((el) => {
      if (!el.dataset.qmiaOrigText) {
        el.dataset.qmiaOrigText = (el.textContent || "").trim();
      }
      return el.dataset.qmiaOrigText;
    });

    const capTexts = capEls.map((el) => {
      if (!el.dataset.qmiaOrigCap) {
        el.dataset.qmiaOrigCap = (el.textContent || "").trim();
      }
      return el.dataset.qmiaOrigCap;
    });

    const descEl = extractDescriptionElement(card);
    let description = descEl ? (descEl.textContent || "").trim() : "";
    if (!description) {
      const lines = (card.textContent || "")
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 25 && !s.startsWith(slug));
      description = lines[0] || "";
    }

    return {
      slug,
      titleText,
      sizeEls,
      sizeTexts,
      capEls,
      capTexts,
      description
    };
  }

  function decorateSizePill(el, classification, highlightBadges) {
    const orig = el.dataset.qmiaOrigText || (el.textContent || "").trim();
    el.classList.remove(...SIZE_TIER_CLASSES);

    if (!highlightBadges) {
      el.textContent = orig;
      el.removeAttribute("title");
      return;
    }

    el.classList.add("qmia-size-pill", `qmia-size-${classification.tier}`);
    el.title = classification.tooltipPt;
    el.textContent =
      classification.tier !== "unknown" ? `${classification.icon} ${orig}` : orig;
  }

  function decorateCapabilityPill(el, showPortugueseNotes) {
    const orig = el.dataset.qmiaOrigCap || (el.textContent || "").trim();
    el.classList.remove("qmia-cap-pt");

    if (!showPortugueseNotes) {
      el.textContent = orig;
      el.removeAttribute("title");
      return;
    }

    const translated = Catalog.translateCapability(orig);
    if (translated) {
      el.textContent = translated.label;
      el.title = translated.tooltip;
      el.classList.add("qmia-cap-pt");
    } else {
      el.textContent = orig;
    }
  }

  function copyToClipboard(text, btn) {
    const onCopied = () => {
      btn.textContent = "✓ Copiado!";
      btn.classList.add("qmia-copied");
      setTimeout(() => {
        btn.textContent = "Copiar comando";
        btn.classList.remove("qmia-copied");
      }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onCopied).catch(() => {
        fallbackCopy(text);
        onCopied();
      });
      return;
    }

    fallbackCopy(text);
    onCopied();
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (_) {
      // Ignora erro caso bloqueado pelo navegador
    }
    document.body.removeChild(textarea);
  }

  function buildInfoBox(slug, infoPt, evaluation) {
    const box = document.createElement("div");
    box.className = "qmia-info-box";
    box.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const header = document.createElement("div");
    header.className = "qmia-info-header";

    const compatBadge = document.createElement("span");
    compatBadge.className = `qmia-compat-badge qmia-compat-${evaluation.overallTier}`;
    compatBadge.textContent = `${evaluation.overallMeta.icon} ${evaluation.overallMeta.badgePt}`;
    compatBadge.title = evaluation.overallMeta.tooltipPt;
    header.appendChild(compatBadge);

    const chipsWrap = document.createElement("div");
    chipsWrap.className = "qmia-chips";
    for (const catId of infoPt.categories) {
      const def = Catalog.CATEGORY_DEFS[catId];
      if (!def) {
        continue;
      }
      const chip = document.createElement("span");
      chip.className = `qmia-chip ${def.className}`;
      chip.textContent = def.label;
      chipsWrap.appendChild(chip);
    }
    header.appendChild(chipsWrap);
    box.appendChild(header);

    const purpose = document.createElement("p");
    purpose.className = "qmia-purpose";
    const strongLabel = document.createElement("strong");
    strongLabel.textContent = "Para que serve: ";
    purpose.appendChild(strongLabel);
    purpose.appendChild(document.createTextNode(infoPt.purposePt));
    box.appendChild(purpose);

    if (infoPt.highlightsPt && infoPt.highlightsPt.length > 0) {
      const highlightsRow = document.createElement("div");
      highlightsRow.className = "qmia-highlights";
      for (const h of infoPt.highlightsPt) {
        const tag = document.createElement("span");
        tag.className = "qmia-highlight-tag";
        tag.textContent = h;
        highlightsRow.appendChild(tag);
      }
      if (!infoPt.isCatalogMatch) {
        const autoTag = document.createElement("span");
        autoTag.className = "qmia-highlight-tag";
        autoTag.textContent = "Classificação automática";
        highlightsRow.appendChild(autoTag);
      }
      box.appendChild(highlightsRow);
    }

    if (slug) {
      const cmdRow = document.createElement("div");
      cmdRow.className = "qmia-cmd-row";

      const isEmbeddingOnly =
        infoPt.categories.length === 1 && infoPt.categories[0] === "embedding";
      const verb = isEmbeddingOnly ? "pull" : "run";
      const tagSuffix =
        evaluation.recommendedTag && evaluation.recommendedTag !== "latest"
          ? `:${evaluation.recommendedTag}`
          : "";
      const command = `ollama ${verb} ${slug}${tagSuffix}`;

      const codeEl = document.createElement("code");
      codeEl.className = "qmia-cmd-code";
      codeEl.textContent = command;
      cmdRow.appendChild(codeEl);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "qmia-copy-btn";
      copyBtn.textContent = "Copiar comando";
      copyBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        copyToClipboard(command, copyBtn);
      });
      cmdRow.appendChild(copyBtn);

      box.appendChild(cmdRow);
    }

    return box;
  }

  function processCard(card) {
    const profile = state.profile;
    const data = extractCardData(card);
    if (!data.slug && data.sizeTexts.length === 0) {
      return;
    }

    const infoPt = Catalog.getModelInfoPt(data.slug, data.description, data.capTexts);
    const isEmbedding = infoPt.categories.includes("embedding");
    const hasCloudBadge = data.capTexts.some((c) => c.toLowerCase() === "cloud");
    const inferredSizes =
      data.sizeTexts.length === 0
        ? Hardware.extractSizesFromText(`${data.titleText} ${data.description}`)
        : [];

    const evaluation = Hardware.evaluateModelSizes(
      data.sizeTexts,
      isEmbedding,
      infoPt.bestTag36Gb,
      profile,
      { hasCloudBadge, inferredSizes }
    );

    card.classList.remove(...CARD_TIER_CLASSES, "qmia-card-layout");
    if (profile.highlightBadges) {
      card.classList.add("qmia-card-enhanced", `qmia-card-${evaluation.overallTier}`);
      if (evaluation.overallTier === "heavy" && profile.dimHeavyModels) {
        card.classList.add("qmia-dimmed");
      }
    }

    data.sizeEls.forEach((el, idx) => {
      const item = evaluation.classifiedSizes[idx];
      const classification = item
        ? item.classification
        : Hardware.classifySizeTag(el.dataset.qmiaOrigText, profile);
      decorateSizePill(el, classification, profile.highlightBadges);
    });

    data.capEls.forEach((el) => {
      decorateCapabilityPill(el, profile.showPortugueseNotes);
    });

    const existingBox = card.querySelector(":scope > .qmia-info-box, .qmia-info-box");
    if (existingBox) {
      existingBox.remove();
    }

    if (profile.showPortugueseNotes) {
      card.classList.add("qmia-card-layout");
      const box = buildInfoBox(data.slug, infoPt, evaluation);
      card.appendChild(box);
    }

    card.dataset.qmiaProcessed = "true";
    card.dataset.qmiaTier = evaluation.overallTier;
    card.dataset.qmiaCategories = infoPt.categories.join(",");
  }

  function cardMatchesFilters(card) {
    const tier = card.dataset.qmiaTier || "unknown";
    const cats = (card.dataset.qmiaCategories || "").split(",").filter(Boolean);

    if (state.compatFilter === "sweet") {
      if (tier !== "sweet") {
        return false;
      }
    } else if (state.compatFilter === "runnable") {
      if (tier !== "sweet" && tier !== "fast" && tier !== "limit") {
        return false;
      }
    }

    if (state.categoryFilter !== "all") {
      if (!cats.includes(state.categoryFilter)) {
        return false;
      }
    }

    return true;
  }

  function applyFilters() {
    const cards = findModelCards();
    let visibleCount = 0;

    for (const card of cards) {
      const match = cardMatchesFilters(card);
      card.classList.toggle("qmia-hidden-by-filter", !match);
      if (match) {
        visibleCount += 1;
      }
    }

    const counter = document.querySelector(".qmia-counter");
    if (counter) {
      counter.textContent = `Exibindo ${visibleCount} de ${cards.length} modelos carregados`;
    }
  }

  function createFilterButton(label, isActive, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = isActive ? "qmia-filter-btn qmia-active" : "qmia-filter-btn";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function buildToolbar() {
    const profile = state.profile;
    const toolbar = document.createElement("div");
    toolbar.className = "qmia-toolbar";

    const topRow = document.createElement("div");
    topRow.className = "qmia-toolbar-top";

    const titleWrap = document.createElement("div");
    titleWrap.className = "qmia-toolbar-title";

    const titleText = document.createElement("span");
    titleText.textContent = "🦙 Ollama Radar";
    titleWrap.appendChild(titleText);

    const hwPill = document.createElement("span");
    hwPill.className = "qmia-hw-pill";
    hwPill.textContent = `🖥️ ${profile.chipName} • ${profile.totalRamGb} GB RAM (~${profile.usableVramGb} GB úteis)`;
    titleWrap.appendChild(hwPill);

    topRow.appendChild(titleWrap);

    const counter = document.createElement("span");
    counter.className = "qmia-counter";
    topRow.appendChild(counter);
    toolbar.appendChild(topRow);

    const filterRows = document.createElement("div");
    filterRows.className = "qmia-filter-rows";

    const compatGroup = document.createElement("div");
    compatGroup.className = "qmia-filter-group";
    const compatLabel = document.createElement("span");
    compatLabel.className = "qmia-filter-label";
    compatLabel.textContent = "Hardware:";
    compatGroup.appendChild(compatLabel);

    const compatOptions = [
      { id: "all", label: "Todos" },
      { id: "sweet", label: `🌟 Ideais p/ ${profile.totalRamGb}GB` },
      { id: "runnable", label: "✅ Rodam Localmente" }
    ];

    const compatButtons = [];
    for (const opt of compatOptions) {
      const btn = createFilterButton(opt.label, state.compatFilter === opt.id, () => {
        state.compatFilter = opt.id;
        compatButtons.forEach((item) =>
          item.el.classList.toggle("qmia-active", item.id === opt.id)
        );
        applyFilters();
      });
      compatButtons.push({ id: opt.id, el: btn });
      compatGroup.appendChild(btn);
    }
    filterRows.appendChild(compatGroup);

    const catGroup = document.createElement("div");
    catGroup.className = "qmia-filter-group";
    const catLabel = document.createElement("span");
    catLabel.className = "qmia-filter-label";
    catLabel.textContent = "Para que serve:";
    catGroup.appendChild(catLabel);

    const catOptions = [
      { id: "all", label: "Todas as áreas" },
      { id: "code", label: Catalog.CATEGORY_DEFS.code.shortLabel },
      { id: "reasoning", label: Catalog.CATEGORY_DEFS.reasoning.shortLabel },
      { id: "chat", label: Catalog.CATEGORY_DEFS.chat.shortLabel },
      { id: "vision", label: Catalog.CATEGORY_DEFS.vision.shortLabel },
      { id: "embedding", label: Catalog.CATEGORY_DEFS.embedding.shortLabel },
      { id: "agents", label: Catalog.CATEGORY_DEFS.agents.shortLabel }
    ];

    const catButtons = [];
    for (const opt of catOptions) {
      const btn = createFilterButton(opt.label, state.categoryFilter === opt.id, () => {
        state.categoryFilter = opt.id;
        catButtons.forEach((item) =>
          item.el.classList.toggle("qmia-active", item.id === opt.id)
        );
        applyFilters();
      });
      catButtons.push({ id: opt.id, el: btn });
      catGroup.appendChild(btn);
    }
    filterRows.appendChild(catGroup);

    toolbar.appendChild(filterRows);
    return toolbar;
  }

  function ensureToolbar(firstCard) {
    const listContainer =
      firstCard.closest("ul, ol, #searchresults") || firstCard.parentElement;
    if (!listContainer || !listContainer.parentElement) {
      return;
    }

    const existing = document.querySelector(".qmia-toolbar");
    if (existing) {
      const hwPill = existing.querySelector(".qmia-hw-pill");
      if (hwPill) {
        hwPill.textContent = `🖥️ ${state.profile.chipName} • ${state.profile.totalRamGb} GB RAM (~${state.profile.usableVramGb} GB úteis)`;
      }
      return;
    }

    const toolbar = buildToolbar();
    if (listContainer.id === "searchresults") {
      listContainer.insertBefore(toolbar, listContainer.firstChild);
    } else {
      listContainer.parentElement.insertBefore(toolbar, listContainer);
    }
  }

  function processAllCards(forceReprocess) {
    const cards = findModelCards();
    if (cards.length === 0) {
      return;
    }

    ensureToolbar(cards[0]);

    for (const card of cards) {
      if (forceReprocess || card.dataset.qmiaProcessed !== "true") {
        processCard(card);
      }
    }

    applyFilters();
  }

  function scheduleRender(forceReprocess) {
    if (state.renderScheduled && !forceReprocess) {
      return;
    }
    state.renderScheduled = true;
    window.setTimeout(() => {
      state.renderScheduled = false;
      processAllCards(forceReprocess);
    }, 60);
  }

  function startObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }

    state.observer = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some((mutation) => {
        if (mutation.target && mutation.target instanceof Element) {
          if (
            mutation.target.closest(".qmia-info-box") ||
            mutation.target.closest(".qmia-toolbar")
          ) {
            return false;
          }
        }
        return mutation.addedNodes && mutation.addedNodes.length > 0;
      });

      if (!hasRelevantMutation) {
        return;
      }

      const cards = findModelCards();
      const hasPending = cards.some((card) => card.dataset.qmiaProcessed !== "true");
      if (hasPending) {
        scheduleRender(false);
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function listenForProfileChanges() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes[Hardware.STORAGE_KEY]) {
          state.profile = {
            ...Hardware.DEFAULT_PROFILE,
            ...(changes[Hardware.STORAGE_KEY].newValue || {})
          };
          const oldToolbar = document.querySelector(".qmia-toolbar");
          if (oldToolbar) {
            oldToolbar.remove();
          }
          processAllCards(true);
        }
      });
    }
  }

  window.__QMIA_REFRESH__ = async function () {
    state.profile = await Hardware.loadProfile();
    processAllCards(true);
  };

  async function init() {
    state.profile = await Hardware.loadProfile();
    processAllCards(false);
    startObserver();
    listenForProfileChanges();
    document.addEventListener("htmx:afterSettle", () => scheduleRender(false));
    window.addEventListener("popstate", () => scheduleRender(false));
  }

  init();
})();
