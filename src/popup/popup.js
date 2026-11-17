(function () {
  "use strict";

  const Hardware = window.QMIA_Hardware;
  if (!Hardware) {
    return;
  }

  const presetSelect = document.getElementById("preset-select");
  const totalRamInput = document.getElementById("total-ram-input");
  const usableVramInput = document.getElementById("usable-vram-input");
  const machineSummary = document.getElementById("machine-summary");
  const machineDetail = document.getElementById("machine-detail");
  const liveRamInfo = document.getElementById("live-ram-info");
  const toggleHighlights = document.getElementById("toggle-highlights");
  const togglePt = document.getElementById("toggle-pt");
  const toggleDim = document.getElementById("toggle-dim");
  const saveStatus = document.getElementById("save-status");
  const detectBtn = document.getElementById("detect-btn");

  let statusTimer = null;

  function showSavedNotice(msg) {
    saveStatus.textContent = msg || "✓ Configurações salvas e aplicadas nas abas abertas.";
    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }
    statusTimer = window.setTimeout(() => {
      saveStatus.textContent = "";
    }, 2200);
  }

  function populatePresets() {
    presetSelect.innerHTML = "";
    for (const preset of Hardware.HARDWARE_PRESETS) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      presetSelect.appendChild(option);
    }
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "Personalizado";
    presetSelect.appendChild(customOpt);
  }

  function matchPresetId(profile) {
    const found = Hardware.HARDWARE_PRESETS.find(
      (p) =>
        p.totalRamGb === Number(profile.totalRamGb) &&
        p.usableVramGb === Number(profile.usableVramGb)
    );
    return found ? found.id : "custom";
  }

  function renderProfile(profile) {
    machineSummary.textContent = `${profile.chipName} • ${profile.totalRamGb} GB RAM (${profile.cpuCores} núcleos)`;
    machineDetail.textContent = `RAM útil p/ IA: ~${profile.usableVramGb} GB • Faixa ideal: ${profile.sweetSpotMinGb}–${profile.sweetSpotMaxGb} GB`;

    presetSelect.value = matchPresetId(profile);
    totalRamInput.value = profile.totalRamGb;
    usableVramInput.value = profile.usableVramGb;
    toggleHighlights.checked = Boolean(profile.highlightBadges);
    togglePt.checked = Boolean(profile.showPortugueseNotes);
    toggleDim.checked = Boolean(profile.dimHeavyModels);
  }

  async function applyAndSave(partial) {
    const updated = await Hardware.saveProfile(partial);
    renderProfile(updated);
    showSavedNotice();
    await ensureInjectedInActiveTab(true);
  }

  presetSelect.addEventListener("change", () => {
    const preset = Hardware.HARDWARE_PRESETS.find((p) => p.id === presetSelect.value);
    if (!preset) {
      return;
    }
    applyAndSave({
      chipName: preset.chipName,
      cpuCores: preset.cpuCores,
      totalRamGb: preset.totalRamGb,
      usableVramGb: preset.usableVramGb,
      sweetSpotMinGb: preset.sweetSpotMinGb,
      sweetSpotMaxGb: preset.sweetSpotMaxGb
    });
  });

  function onCustomRamChange() {
    const total = Math.max(8, Math.min(512, Number.parseInt(totalRamInput.value, 10) || 36));
    const usable = Math.max(
      4,
      Math.min(total, Number.parseInt(usableVramInput.value, 10) || Math.round(total * 0.78))
    );
    const sweetMax = Math.max(4, Math.round(usable * 0.85 * 10) / 10);
    const sweetMin = Math.max(2, Math.round(usable * 0.28 * 10) / 10);

    applyAndSave({
      chipName: total === 36 ? "Apple M5 Max" : `Máquina ${total} GB`,
      totalRamGb: total,
      usableVramGb: usable,
      sweetSpotMinGb: sweetMin,
      sweetSpotMaxGb: sweetMax
    });
  }

  totalRamInput.addEventListener("change", () => {
    const total = Math.max(8, Math.min(512, Number.parseInt(totalRamInput.value, 10) || 36));
    usableVramInput.value = Math.max(4, Math.round(total * 0.78));
    onCustomRamChange();
  });

  usableVramInput.addEventListener("change", onCustomRamChange);

  toggleHighlights.addEventListener("change", () => {
    applyAndSave({ highlightBadges: toggleHighlights.checked });
  });

  togglePt.addEventListener("change", () => {
    applyAndSave({ showPortugueseNotes: togglePt.checked });
  });

  toggleDim.addEventListener("change", () => {
    applyAndSave({ dimHeavyModels: toggleDim.checked });
  });

  async function refreshLiveMemoryBanner() {
    if (!liveRamInfo || typeof Hardware.getLiveMemoryInfo !== "function") {
      return;
    }
    const mem = await Hardware.getLiveMemoryInfo();
    if (mem && typeof mem.availableRamGb === "number") {
      liveRamInfo.textContent = `🟢 RAM livre agora: ${mem.availableRamGb} GB de ${mem.totalRamGb} GB`;
    } else {
      liveRamInfo.textContent = "";
    }
  }

  if (detectBtn) {
    detectBtn.addEventListener("click", async () => {
      detectBtn.disabled = true;
      detectBtn.textContent = "⏳ Detectando...";
      try {
        const detected = await Hardware.detectMachineHardware();
        await applyAndSave(detected);
        await refreshLiveMemoryBanner();
        showSavedNotice(
          `✓ Hardware detectado: ${detected.chipName} • ${detected.totalRamGb} GB RAM!`
        );
      } finally {
        detectBtn.disabled = false;
        detectBtn.textContent = "🔍 Detectar Hardware";
      }
    });
  }

  async function ensureInjectedInActiveTab(silentIfAlreadyLoaded) {
    try {
      if (
        typeof chrome === "undefined" ||
        !chrome.tabs ||
        !chrome.tabs.query ||
        !chrome.scripting
      ) {
        return;
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.id || !activeTab.url) {
        return;
      }
      if (!/^https:\/\/([a-z0-9-]+\.)?ollama\.com\//i.test(activeTab.url)) {
        return;
      }

      const probe = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => Boolean(window.__QMIA_CONTENT_INITIALIZED__)
      });
      const alreadyLoaded = Boolean(probe && probe[0] && probe[0].result);

      if (alreadyLoaded) {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => {
            if (typeof window.__QMIA_REFRESH__ === "function") {
              window.__QMIA_REFRESH__();
            }
          }
        });
        if (!silentIfAlreadyLoaded) {
          showSavedNotice("✓ Atualizado na aba atual do ollama.com.");
        }
        return;
      }

      await chrome.scripting.insertCSS({
        target: { tabId: activeTab.id },
        files: ["src/styles/ollama-enhancer.css"]
      });
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: [
          "src/data/hardware-profile.js",
          "src/data/models-catalog-pt.js",
          "src/content/content.js"
        ]
      });
      showSavedNotice("✓ Extensão injetada na aba aberta do ollama.com!");
    } catch (_) {
      // Ignora caso a aba não permita script ou ainda esteja carregando
    }
  }

  async function init() {
    populatePresets();
    const profile = await Hardware.loadProfile();
    renderProfile(profile);
    await refreshLiveMemoryBanner();
    await ensureInjectedInActiveTab(true);
  }

  init();
})();
