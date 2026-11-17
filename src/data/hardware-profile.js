(function (global) {
  "use strict";

  const STORAGE_KEY = "qmia_hardware_profile_v1";

  const DEFAULT_PROFILE = Object.freeze({
    chipName: "Apple M5 Max",
    cpuCores: 18,
    totalRamGb: 36,
    usableVramGb: 28,
    sweetSpotMinGb: 8,
    sweetSpotMaxGb: 24,
    dimHeavyModels: true,
    showPortugueseNotes: true,
    highlightBadges: true
  });

  const HARDWARE_PRESETS = Object.freeze([
    {
      id: "mac-16",
      label: "16 GB RAM / VRAM (Entrada)",
      chipName: "Apple Silicon / GPU 16 GB",
      cpuCores: 10,
      totalRamGb: 16,
      usableVramGb: 11,
      sweetSpotMinGb: 3.5,
      sweetSpotMaxGb: 8.5
    },
    {
      id: "mac-24",
      label: "24 GB RAM Unificada",
      chipName: "Apple Silicon 24 GB",
      cpuCores: 12,
      totalRamGb: 24,
      usableVramGb: 17,
      sweetSpotMinGb: 5,
      sweetSpotMaxGb: 14
    },
    {
      id: "m5-max-36",
      label: "36 GB RAM Unificada (Seu Apple M5 Max)",
      chipName: "Apple M5 Max",
      cpuCores: 18,
      totalRamGb: 36,
      usableVramGb: 28,
      sweetSpotMinGb: 8,
      sweetSpotMaxGb: 24
    },
    {
      id: "mac-48",
      label: "48 GB RAM Unificada",
      chipName: "Apple Silicon 48 GB",
      cpuCores: 16,
      totalRamGb: 48,
      usableVramGb: 38,
      sweetSpotMinGb: 10,
      sweetSpotMaxGb: 33
    },
    {
      id: "mac-64",
      label: "64 GB RAM Unificada",
      chipName: "Apple Silicon 64 GB",
      cpuCores: 20,
      totalRamGb: 64,
      usableVramGb: 52,
      sweetSpotMinGb: 14,
      sweetSpotMaxGb: 46
    },
    {
      id: "mac-128",
      label: "128 GB RAM Unificada",
      chipName: "Apple Silicon Max / Ultra 128 GB",
      cpuCores: 24,
      totalRamGb: 128,
      usableVramGb: 104,
      sweetSpotMinGb: 18,
      sweetSpotMaxGb: 92
    }
  ]);

  const TIER_META = Object.freeze({
    sweet: {
      tier: "sweet",
      rank: 5,
      icon: "🌟",
      shortBadge: "Ideal p/ M5 Max",
      cardBadge: "Ideal para sua máquina",
      colorClass: "sweet"
    },
    fast: {
      tier: "fast",
      rank: 4,
      icon: "⚡",
      shortBadge: "Muito Rápido",
      cardBadge: "Roda muito rápido",
      colorClass: "fast"
    },
    limit: {
      tier: "limit",
      rank: 3,
      icon: "⚠️",
      shortBadge: "No Limite",
      cardBadge: "Roda no limite da RAM",
      colorClass: "limit"
    },
    cloud: {
      tier: "cloud",
      rank: 2,
      icon: "☁️",
      shortBadge: "Nuvem",
      cardBadge: "Execução apenas em nuvem",
      colorClass: "cloud"
    },
    heavy: {
      tier: "heavy",
      rank: 1,
      icon: "🚫",
      shortBadge: "Pesado (Swap)",
      cardBadge: "Pesado demais para 36 GB",
      colorClass: "heavy"
    },
    unknown: {
      tier: "unknown",
      rank: 0,
      icon: "ℹ️",
      shortBadge: "Tamanho variável",
      cardBadge: "Verifique as tags do modelo",
      colorClass: "unknown"
    }
  });

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function estimateDenseMemoryGb(paramsB) {
    if (paramsB <= 1) {
      return round1(paramsB * 0.65 + 0.4);
    }
    if (paramsB <= 4) {
      return round1(paramsB * 0.62 + 0.9);
    }
    if (paramsB <= 35) {
      return round1(paramsB * 0.62 + 2.0);
    }
    return round1(paramsB * 0.60 + 2.5);
  }

  /**
   * Interpreta tags de tamanho exibidas no Ollama (ex.: 14b, 32b, 8x7b, e4b, 300m, cloud).
   */
  function parseSizeTag(raw) {
    const clean = String(raw || "").trim().toLowerCase();
    if (!clean) {
      return { raw: clean, paramsB: null, isMoE: false, isCloud: false, estimatedGb: null };
    }

    if (clean === "cloud") {
      return { raw: clean, paramsB: null, isMoE: false, isCloud: true, estimatedGb: null };
    }

    // Gemma 3n effective parameter tags (e2b ~4.5 GB, e4b ~6.5 GB)
    if (clean === "e2b") {
      return { raw: clean, paramsB: 2, isMoE: false, isCloud: false, estimatedGb: 4.5 };
    }
    if (clean === "e4b") {
      return { raw: clean, paramsB: 4, isMoE: false, isCloud: false, estimatedGb: 6.5 };
    }

    // Mixture-of-Experts tags (e.g., 8x7b, 8x22b, 16x17b)
    const moeMatch = clean.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)b$/i);
    if (moeMatch) {
      const experts = Number.parseFloat(moeMatch[1]);
      const expertSizeB = Number.parseFloat(moeMatch[2]);
      const effectiveTotalB = round1(experts * expertSizeB * 0.84);
      const estimatedGb = round1(effectiveTotalB * 0.60 + 2.0);
      return {
        raw: clean,
        paramsB: effectiveTotalB,
        isMoE: true,
        isCloud: false,
        estimatedGb
      };
    }

    // Standard billion-parameter tags (e.g., 0.5b, 1.5b, 14b, 32b, 671b)
    const bMatch = clean.match(/^(\d+(?:\.\d+)?)b$/i);
    if (bMatch) {
      const paramsB = Number.parseFloat(bMatch[1]);
      return {
        raw: clean,
        paramsB,
        isMoE: false,
        isCloud: false,
        estimatedGb: estimateDenseMemoryGb(paramsB)
      };
    }

    // Million-parameter tags (e.g., 135m, 300m, 600m) — ignora 1M/2M de janela de contexto
    const mMatch = clean.match(/^(\d+(?:\.\d+)?)m$/i);
    if (mMatch) {
      const paramsM = Number.parseFloat(mMatch[1]);
      if (paramsM >= 10 && paramsM <= 999) {
        const paramsB = round1(paramsM / 1000);
        return {
          raw: clean,
          paramsB,
          isMoE: false,
          isCloud: false,
          estimatedGb: round1(Math.max(0.4, paramsB * 0.7 + 0.3))
        };
      }
    }

    return { raw: clean, paramsB: null, isMoE: false, isCloud: false, estimatedGb: null };
  }

  /**
   * Extrai menções explícitas de tamanho de parâmetros na descrição/título (ex.: "594B", "9B", "8x7B").
   */
  function extractSizesFromText(text) {
    const source = String(text || "");
    if (!source) {
      return [];
    }

    const found = [];
    const seen = new Set();

    const moeRegex = /\b(\d+(?:\.\d+)?x\d+(?:\.\d+)?)b\b/gi;
    let match;
    while ((match = moeRegex.exec(source)) !== null) {
      const tag = `${match[1].toLowerCase()}b`;
      if (!seen.has(tag)) {
        seen.add(tag);
        found.push(tag);
      }
    }

    const bRegex = /(?:^|[^a-z0-9.])(\d+(?:\.\d+)?)b\b/gi;
    while ((match = bRegex.exec(source)) !== null) {
      const num = Number.parseFloat(match[1]);
      if (num >= 0.3 && num <= 2000) {
        const tag = `${match[1]}b`.toLowerCase();
        if (!seen.has(tag)) {
          seen.add(tag);
          found.push(tag);
        }
      }
    }

    return found;
  }

  function buildTierResult(tierKey, parsed, profile, customTooltip) {
    const meta = TIER_META[tierKey] || TIER_META.unknown;
    const machineLabel = `${profile.chipName} (${profile.totalRamGb} GB)`;
    const memText = parsed.estimatedGb !== null ? `~${parsed.estimatedGb} GB de RAM/VRAM em Q4` : "";

    let badgePt = meta.cardBadge;
    let tooltipPt = customTooltip || meta.cardBadge;

    if (tierKey === "sweet") {
      badgePt = `Ideal p/ seu ${profile.chipName} (${profile.totalRamGb} GB)`;
      tooltipPt = `${meta.icon} Ideal para ${machineLabel}: consumo estimado ${memText}. Alta inteligência com velocidade nativa em Metal.`;
    } else if (tierKey === "fast") {
      badgePt = `Roda Muito Rápido no ${profile.chipName}`;
      tooltipPt = `${meta.icon} Leve e veloz em ${machineLabel}: consumo estimado ${memText}. Sobra memória para IDE, navegador e agentes.`;
    } else if (tierKey === "limit") {
      badgePt = `No Limite dos ${profile.totalRamGb} GB`;
      tooltipPt = `${meta.icon} Roda no limite em ${machineLabel}: consumo estimado ${memText}. Feche apps pesados e evite contexto muito longo.`;
    } else if (tierKey === "heavy") {
      badgePt = `Pesado p/ ${profile.totalRamGb} GB (Swap)`;
      tooltipPt = `${meta.icon} Excede a folga de ${profile.usableVramGb} GB úteis (${memText}). Tende a fazer swap em disco e ficar muito lento.`;
    } else if (tierKey === "cloud") {
      badgePt = "Execução em Nuvem";
      tooltipPt = `${meta.icon} Modelo executado remotamente na nuvem Ollama (não consome memória local).`;
    }

    return {
      ...meta,
      badgePt,
      tooltipPt,
      parsed
    };
  }

  /**
   * Classifica um único tamanho de modelo para o perfil de hardware informado.
   */
  function classifySizeTag(raw, profileInput) {
    const profile = { ...DEFAULT_PROFILE, ...(profileInput || {}) };
    const parsed = typeof raw === "string" ? parseSizeTag(raw) : raw;

    if (!parsed || (!parsed.isCloud && parsed.paramsB === null)) {
      return buildTierResult("unknown", parsed || parseSizeTag(""), profile);
    }

    if (parsed.isCloud) {
      return buildTierResult("cloud", parsed, profile);
    }

    const est = parsed.estimatedGb;
    const isDefault36Class = profile.usableVramGb >= 24 && profile.usableVramGb <= 32;

    // Na faixa 36 GB (Apple M5 Max), modelos < 13B entram na faixa "fast" e 13B-35B formam o Sweet Spot.
    if (isDefault36Class && !parsed.isMoE && parsed.paramsB < 13) {
      return buildTierResult("fast", parsed, profile);
    }

    if (est < profile.sweetSpotMinGb) {
      return buildTierResult("fast", parsed, profile);
    }

    if (est <= profile.sweetSpotMaxGb) {
      return buildTierResult("sweet", parsed, profile);
    }

    if (est <= profile.usableVramGb + 3) {
      return buildTierResult("limit", parsed, profile);
    }

    return buildTierResult("heavy", parsed, profile);
  }

  function compareBestCandidate(a, b) {
    const aParams = a.parsed.paramsB || 0;
    const bParams = b.parsed.paramsB || 0;
    return bParams - aParams;
  }

  /**
   * Avalia todas as tags de tamanho de um modelo, define o destaque do card
   * e seleciona a melhor tag recomendada para rodar na máquina.
   */
  function evaluateModelSizes(sizeStrings, isEmbedding, preferredTagHint, profileInput, options) {
    const profile = { ...DEFAULT_PROFILE, ...(profileInput || {}) };
    const opts = options || {};
    const hasCloudBadge = Boolean(opts.hasCloudBadge);
    const inferredSizes = Array.from(
      new Set((opts.inferredSizes || []).map((s) => String(s || "").trim()).filter(Boolean))
    );

    const uniqueSizes = Array.from(
      new Set((sizeStrings || []).map((s) => String(s || "").trim()).filter(Boolean))
    );

    const classified = uniqueSizes.map((tag) => ({
      tag,
      classification: classifySizeTag(tag, profile)
    }));

    if (classified.length === 0) {
      if (hasCloudBadge) {
        const inferredClassified = inferredSizes.map((tag) => ({
          tag,
          classification: classifySizeTag(tag, profile)
        }));
        const heavyInferred = inferredClassified
          .filter((item) => item.classification.tier === "heavy")
          .sort((a, b) => compareBestCandidate(a.classification, b.classification));

        let badgePt = "Disponível na Nuvem Ollama";
        let tooltipPt = "Modelo executado remotamente na nuvem Ollama (não consome memória local).";
        if (heavyInferred.length > 0) {
          const bigTag = heavyInferred[0].tag.toUpperCase();
          badgePt = `Nuvem Ollama (${bigTag} • inviável local em ${profile.totalRamGb} GB)`;
          tooltipPt = `☁️ Modelo de ${bigTag} disponível apenas via nuvem Ollama; excede os ${profile.totalRamGb} GB locais.`;
        } else if (inferredSizes.length > 0) {
          const firstTag = inferredSizes[0].toUpperCase();
          badgePt = `Nuvem Ollama (${firstTag} • execução remota)`;
          tooltipPt = `☁️ Modelo na nuvem Ollama (${firstTag} citado na descrição). Roda nos servidores sem consumir sua RAM.`;
        }

        return {
          overallTier: "cloud",
          overallMeta: {
            ...TIER_META.cloud,
            badgePt,
            tooltipPt
          },
          recommendedTag: "latest",
          recommendedClassification: classifySizeTag("cloud", profile),
          classifiedSizes: []
        };
      }

      if (inferredSizes.length > 0) {
        const inferredResult = evaluateModelSizes(
          inferredSizes,
          isEmbedding,
          preferredTagHint,
          profile,
          null
        );
        return {
          ...inferredResult,
          classifiedSizes: []
        };
      }

      if (isEmbedding) {
        return {
          overallTier: "fast",
          overallMeta: {
            ...TIER_META.fast,
            badgePt: `Leve p/ RAG no ${profile.chipName}`,
            tooltipPt: "Modelo de embeddings compacto (< 1.5 GB), roda instantaneamente localmente."
          },
          recommendedTag: preferredTagHint || "latest",
          recommendedClassification: null,
          classifiedSizes: []
        };
      }

      if (preferredTagHint) {
        const hintClass = classifySizeTag(preferredTagHint, profile);
        return {
          overallTier: hintClass.tier,
          overallMeta: hintClass,
          recommendedTag: preferredTagHint,
          recommendedClassification: hintClass,
          classifiedSizes: []
        };
      }

      return {
        overallTier: "unknown",
        overallMeta: TIER_META.unknown,
        recommendedTag: "latest",
        recommendedClassification: null,
        classifiedSizes: []
      };
    }

    // Ordena pelos melhores níveis suportados no hardware: sweet > fast > limit > cloud > heavy
    const byPriority = [...classified].sort((a, b) => {
      if (b.classification.rank !== a.classification.rank) {
        return b.classification.rank - a.classification.rank;
      }
      return compareBestCandidate(a.classification, b.classification);
    });

    const overallBest = byPriority[0];
    const hintNorm = preferredTagHint ? String(preferredTagHint).trim().toLowerCase() : "";
    const hintMatch = hintNorm
      ? classified.find((item) => item.tag.toLowerCase() === hintNorm)
      : null;

    let recommendedItem = null;
    if (
      hintMatch &&
      (hintMatch.classification.tier === "sweet" || hintMatch.classification.tier === "fast")
    ) {
      recommendedItem = hintMatch;
    } else {
      const sweetList = classified
        .filter((item) => item.classification.tier === "sweet")
        .sort((a, b) => compareBestCandidate(a.classification, b.classification));
      const fastList = classified
        .filter((item) => item.classification.tier === "fast")
        .sort((a, b) => compareBestCandidate(a.classification, b.classification));
      const limitList = classified
        .filter((item) => item.classification.tier === "limit")
        .sort((a, b) => (a.classification.parsed.paramsB || 0) - (b.classification.parsed.paramsB || 0));

      recommendedItem = sweetList[0] || fastList[0] || limitList[0] || byPriority[0];
    }

    const recommendedTag = recommendedItem ? recommendedItem.tag : "latest";
    const recTier = recommendedItem ? recommendedItem.classification.tier : overallBest.classification.tier;

    let summaryBadge = overallBest.classification.badgePt;
    if (recTier === "sweet") {
      summaryBadge = `Recomendado p/ seu ${profile.chipName} (tag :${recommendedTag})`;
    } else if (recTier === "fast") {
      summaryBadge = `Roda Liso e Rápido (tag :${recommendedTag})`;
    } else if (recTier === "limit") {
      summaryBadge = `No Limite dos ${profile.totalRamGb} GB (tag :${recommendedTag})`;
    } else if (recTier === "cloud") {
      summaryBadge = "Disponível na Nuvem Ollama";
    } else if (recTier === "heavy") {
      summaryBadge = `Acima dos ${profile.totalRamGb} GB (risco de swap)`;
    }

    return {
      overallTier: overallBest.classification.tier,
      overallMeta: {
        ...overallBest.classification,
        badgePt: summaryBadge
      },
      recommendedTag,
      recommendedClassification: recommendedItem ? recommendedItem.classification : null,
      classifiedSizes: classified
    };
  }

  function cleanRendererName(rawRenderer) {
    let name = String(rawRenderer || "").trim();
    if (!name) {
      return "";
    }

    const appleMatch = name.match(/Apple\s+M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
    if (appleMatch) {
      return appleMatch[0].replace(/\s+/g, " ");
    }

    const angleMetalMatch = name.match(/ANGLE Metal Renderer:\s*([^,)]+)/i);
    if (angleMetalMatch && angleMetalMatch[1]) {
      name = angleMetalMatch[1].trim();
    } else {
      const angleInner = name.match(/^ANGLE\s*\((?:[^,]+,\s*)?([^,)]+)/i);
      if (angleInner && angleInner[1]) {
        name = angleInner[1].trim();
      }
    }

    return name
      .replace(/\s*Direct3D\d+.*$/i, "")
      .replace(/\s*vs_\d+_\d+.*$/i, "")
      .replace(/\s*Unspecified Version.*$/i, "")
      .trim();
  }

  function detectGpuInfo() {
    try {
      if (typeof document === "undefined" || typeof document.createElement !== "function") {
        return { gpuName: "", isAppleSilicon: false };
      }
      const canvas = document.createElement("canvas");
      if (!canvas || typeof canvas.getContext !== "function") {
        return { gpuName: "", isAppleSilicon: false };
      }
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!gl) {
        return { gpuName: "", isAppleSilicon: false };
      }

      const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
      const rawRenderer = debugExt
        ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      const gpuName = cleanRendererName(rawRenderer);
      const isAppleSilicon = /apple\s+m\d+/i.test(gpuName) || /apple\s+gpu/i.test(gpuName);
      return { gpuName, isAppleSilicon };
    } catch (_) {
      return { gpuName: "", isAppleSilicon: false };
    }
  }

  const DEDICATED_GPU_VRAM_TABLE = [
    { pattern: /rtx\s*5090/i, vramGb: 32 },
    { pattern: /rtx\s*(?:4090|3090)/i, vramGb: 24 },
    { pattern: /rx\s*7900\s*xtx/i, vramGb: 24 },
    { pattern: /rx\s*7900\s*xt/i, vramGb: 20 },
    { pattern: /rtx\s*(?:5080|4080|4070\s*ti\s*super|4060\s*ti\s*16)/i, vramGb: 16 },
    { pattern: /rx\s*(?:7800|7900\s*gre|6800|6900)/i, vramGb: 16 },
    { pattern: /rtx\s*(?:4070|3080\s*ti|3080|3060\s*12)/i, vramGb: 12 },
    { pattern: /rtx\s*(?:4060|3070|3060|2080|2070|2060)/i, vramGb: 8 },
    { pattern: /rx\s*(?:7600|6600|6650)/i, vramGb: 8 }
  ];

  function estimateDedicatedVramGb(gpuName) {
    const clean = String(gpuName || "");
    if (!clean) {
      return null;
    }
    for (const entry of DEDICATED_GPU_VRAM_TABLE) {
      if (entry.pattern.test(clean)) {
        return entry.vramGb;
      }
    }
    return null;
  }

  function getLiveMemoryInfo() {
    return new Promise((resolve) => {
      try {
        if (
          typeof chrome !== "undefined" &&
          chrome.system &&
          chrome.system.memory &&
          typeof chrome.system.memory.getInfo === "function"
        ) {
          chrome.system.memory.getInfo((info) => {
            if ((chrome.runtime && chrome.runtime.lastError) || !info) {
              resolve(null);
              return;
            }
            const gib = 1024 * 1024 * 1024;
            const totalRamGb = Math.max(1, Math.round(info.capacity / gib));
            const availableRamGb = round1(Math.max(0, info.availableCapacity / gib));
            resolve({ totalRamGb, availableRamGb });
          });
          return;
        }
      } catch (_) {
        // API chrome.system.memory indisponível neste contexto
      }
      resolve(null);
    });
  }

  function getCpuInfo() {
    return new Promise((resolve) => {
      try {
        if (
          typeof chrome !== "undefined" &&
          chrome.system &&
          chrome.system.cpu &&
          typeof chrome.system.cpu.getInfo === "function"
        ) {
          chrome.system.cpu.getInfo((info) => {
            if ((chrome.runtime && chrome.runtime.lastError) || !info) {
              resolve(null);
              return;
            }
            resolve({
              modelName: String(info.modelName || "").trim(),
              archName: String(info.archName || "").trim(),
              numOfProcessors: Number(info.numOfProcessors) || null
            });
          });
          return;
        }
      } catch (_) {
        // API chrome.system.cpu indisponível neste contexto
      }
      resolve(null);
    });
  }

  async function detectMachineHardware() {
    const [memInfo, cpuInfo] = await Promise.all([getLiveMemoryInfo(), getCpuInfo()]);
    const gpuInfo = detectGpuInfo();

    const totalRamGb = memInfo ? memInfo.totalRamGb : DEFAULT_PROFILE.totalRamGb;
    const availableRamGb = memInfo ? memInfo.availableRamGb : null;
    const cpuCores =
      (cpuInfo && cpuInfo.numOfProcessors) ||
      (typeof navigator !== "undefined" && navigator.hardwareConcurrency) ||
      DEFAULT_PROFILE.cpuCores;

    const cpuModel = cpuInfo ? cpuInfo.modelName : "";
    const archName = cpuInfo ? cpuInfo.archName : "";
    const isAppleSilicon =
      gpuInfo.isAppleSilicon ||
      /apple/i.test(cpuModel) ||
      (/arm64|aarch64/i.test(archName) &&
        typeof navigator !== "undefined" &&
        /mac/i.test(navigator.platform || ""));

    let chipName = gpuInfo.gpuName || cpuModel || DEFAULT_PROFILE.chipName;
    if (isAppleSilicon && (!gpuInfo.gpuName || /^apple\s+gpu$/i.test(gpuInfo.gpuName))) {
      const appleCpuMatch = cpuModel.match(/Apple\s+M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
      chipName = appleCpuMatch ? appleCpuMatch[0] : "Apple Silicon";
    }

    let usableVramGb;
    if (isAppleSilicon) {
      usableVramGb = Math.max(4, Math.round(totalRamGb * 0.78));
    } else {
      const dedicatedVram = estimateDedicatedVramGb(chipName);
      if (dedicatedVram) {
        usableVramGb = Math.max(4, round1(dedicatedVram - 1));
        chipName = `${chipName} (${dedicatedVram} GB VRAM)`;
      } else {
        usableVramGb = Math.max(4, Math.round(totalRamGb * 0.65));
      }
    }

    const sweetSpotMinGb =
      totalRamGb >= 32 ? 8 : Math.max(2, round1(usableVramGb * 0.28));
    const sweetSpotMaxGb =
      isAppleSilicon && totalRamGb === 36 ? 24 : Math.max(4, round1(usableVramGb * 0.85));

    return {
      chipName,
      cpuCores,
      totalRamGb,
      availableRamGb,
      usableVramGb,
      sweetSpotMinGb,
      sweetSpotMaxGb,
      autoDetected: Boolean(memInfo || cpuInfo || gpuInfo.gpuName)
    };
  }

  function readStoredProfile() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              resolve(null);
              return;
            }
            resolve((result && result[STORAGE_KEY]) || null);
          });
          return;
        }
      } catch (_) {
        // Fallback para ambiente sem API de extensão
      }
      resolve(null);
    });
  }

  function writeStoredProfile(profile) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY]: profile }, () => {
            resolve(profile);
          });
          return;
        }
      } catch (_) {
        // Ignora fora do contexto da extensão
      }
      resolve(profile);
    });
  }

  async function loadProfile() {
    const stored = await readStoredProfile();
    if (stored) {
      return { ...DEFAULT_PROFILE, ...stored };
    }

    const hasSystemApi =
      typeof chrome !== "undefined" &&
      chrome.system &&
      chrome.system.memory &&
      typeof chrome.system.memory.getInfo === "function";

    if (hasSystemApi) {
      const detected = await detectMachineHardware();
      const initialProfile = { ...DEFAULT_PROFILE, ...detected };
      await writeStoredProfile(initialProfile);
      return initialProfile;
    }

    return { ...DEFAULT_PROFILE };
  }

  async function saveProfile(partialProfile) {
    const stored = await readStoredProfile();
    const current = { ...DEFAULT_PROFILE, ...(stored || {}) };
    const merged = { ...current, ...(partialProfile || {}) };
    return writeStoredProfile(merged);
  }

  global.QMIA_Hardware = {
    STORAGE_KEY,
    DEFAULT_PROFILE,
    HARDWARE_PRESETS,
    TIER_META,
    parseSizeTag,
    extractSizesFromText,
    classifySizeTag,
    evaluateModelSizes,
    detectMachineHardware,
    getLiveMemoryInfo,
    loadProfile,
    saveProfile
  };
})(typeof window !== "undefined" ? window : globalThis);
