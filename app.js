document.addEventListener("DOMContentLoaded", () => {
  // ─────────────────────────────────────────────────────────
  // DOM Elements
  // ─────────────────────────────────────────────────────────
  const videoUrlInput       = document.getElementById("video-url");
  const btnPaste            = document.getElementById("btn-paste");
  const btnClear            = document.getElementById("btn-clear");
  const btnDownload         = document.getElementById("btn-download");
  const btnRefresh          = document.getElementById("btn-refresh");
  const statusPanel         = document.getElementById("status-panel");
  const statusText          = document.getElementById("status-text");
  const serverStatus        = document.getElementById("server-status");

  // Custom Server Configuration elements
  const btnToggleCustom     = document.getElementById("btn-toggle-custom");
  const customServerWrapper = document.getElementById("custom-server-wrapper");
  const customServerUrlInput= document.getElementById("custom-server-url");
  const btnSaveCustom       = document.getElementById("btn-save-custom");

  const videoFormatSelect   = document.getElementById("video-format");
  const videoQualitySelect  = document.getElementById("video-quality");
  const qualityWrapper      = document.getElementById("quality-wrapper");

  // ─────────────────────────────────────────────────────────
  // CORS Proxy list — wraps Cobalt API calls so Techloq only
  // sees generic proxy traffic instead of the Cobalt domains.
  // ─────────────────────────────────────────────────────────
  const CORS_PROXIES = [
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => url, // direct (last resort, may be blocked by Techloq)
  ];

  // ─────────────────────────────────────────────────────────
  // Default Cobalt v10 community instances (verified working)
  // ─────────────────────────────────────────────────────────
  const DEFAULT_ENDPOINTS = [
    "https://rue-cobalt.xenon.zone", // Primary (Working with Techloq!)
    "https://dog.kittycat.boo",
    "https://cobaltapi.kittycat.boo"
  ];

  // Runtime list
  let cobaltEndpoints = [...DEFAULT_ENDPOINTS];

  // Load custom server from localStorage if set
  let customServer = localStorage.getItem("custom_cobalt_server") || "";

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  // Build a proxied URL for a given Cobalt endpoint
  function proxiedUrl(endpoint, proxyIdx) {
    const builder = CORS_PROXIES[proxyIdx];
    return builder(endpoint);
  }

  // POST to a Cobalt endpoint through the chosen CORS proxy.
  async function cobaltPost(endpoint, payload, proxyIdx) {
    const isAllOrigins = proxyIdx === 1; // allorigins.win index

    if (isAllOrigins) {
      // allorigins only supports GET — encode the POST as a GET
      // through corsproxy.io instead for this fallback
      proxyIdx = 0;
    }

    const targetUrl = proxiedUrl(endpoint, proxyIdx);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Accept":       "application/json",
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.substring(0, 120)}`);
    }

    return response.json();
  }

  // Update the server-status badge
  function setServerBadge(text, type = "ok") {
    if (!serverStatus) return;
    serverStatus.textContent = text;
    serverStatus.className = "server-badge " + type;
  }

  // Combine custom server with default/loaded servers
  function getActiveEndpoints() {
    const list = [];
    if (customServer) {
      list.push(customServer);
    }
    // Filter out duplicates
    cobaltEndpoints.forEach(ep => {
      if (!list.includes(ep)) {
        list.push(ep);
      }
    });
    return list;
  }

  // Update server status text on screen
  function updateBadgeStatus() {
    const activeList = getActiveEndpoints();
    if (customServer) {
      setServerBadge(`⚙️ Manual + ${activeList.length - 1} listos`, "ok");
    } else {
      setServerBadge(`${activeList.length} servidores listos`, "ok");
    }
  }

  // ─────────────────────────────────────────────────────────
  // Refresh servers — fetch live list from servers.json (same-origin)
  // ─────────────────────────────────────────────────────────
  async function refreshServers() {
    if (btnRefresh) {
      btnRefresh.disabled = true;
      btnRefresh.textContent = "⏳ Actualizando...";
    }
    setServerBadge("Actualizando...", "loading");

    try {
      // Fetch the same-origin servers.json which Techloq won't block
      const res = await fetch("servers.json?nocache=" + Date.now());
      if (!res.ok) throw new Error("No se pudo cargar servers.json");

      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        cobaltEndpoints = list.map(url => url.replace(/\/$/, ""));
        updateBadgeStatus();
        console.log("Servidores actualizados desde el repositorio:", cobaltEndpoints);
      } else {
        throw new Error("Formato de lista inválido");
      }
    } catch (err) {
      console.warn("No se pudo actualizar la lista, usando locales:", err.message);
      cobaltEndpoints = [...DEFAULT_ENDPOINTS];
      setServerBadge(`⚠️ Servidores locales`, "warn");
      setTimeout(() => updateBadgeStatus(), 2000);
    } finally {
      if (btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.textContent = "🔄 Actualizar servidores";
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Custom Server Configuration Controls
  // ─────────────────────────────────────────────────────────
  if (btnToggleCustom) {
    btnToggleCustom.addEventListener("click", () => {
      const isHidden = customServerWrapper.style.display === "none";
      customServerWrapper.style.display = isHidden ? "flex" : "none";
    });
  }

  // Populate custom server URL input on load
  if (customServerUrlInput) {
    customServerUrlInput.value = customServer;
  }

  // Save custom server URL
  if (btnSaveCustom) {
    btnSaveCustom.addEventListener("click", () => {
      let val = customServerUrlInput.value.trim().replace(/\/$/, "");
      if (val) {
        if (!val.startsWith("http://") && !val.startsWith("https://")) {
          val = "https://" + val;
        }
        localStorage.setItem("custom_cobalt_server", val);
        customServer = val;
        customServerUrlInput.value = val;
        alert("✅ Servidor personalizado guardado.");
      } else {
        localStorage.removeItem("custom_cobalt_server");
        customServer = "";
        customServerUrlInput.value = "";
        alert("🗑️ Servidor personalizado removido.");
      }
      updateBadgeStatus();
    });
  }

  // ─────────────────────────────────────────────────────────
  // Format/Quality toggle
  // ─────────────────────────────────────────────────────────
  videoFormatSelect.addEventListener("change", () => {
    const isMp3 = videoFormatSelect.value === "mp3";
    qualityWrapper.style.display = isMp3 ? "none" : "flex";
  });

  // ─────────────────────────────────────────────────────────
  // Input field: show/hide paste and clear buttons
  // ─────────────────────────────────────────────────────────
  videoUrlInput.addEventListener("input", () => {
    const hasValue = videoUrlInput.value.trim().length > 0;
    btnDownload.disabled = !hasValue;
    if (hasValue) {
      btnPaste.style.display = "none";
      btnClear.style.display = "block";
      btnClear.style.right = "12px";
    } else {
      btnPaste.style.display = "block";
      btnClear.style.display = "none";
    }
  });

  // ─────────────────────────────────────────────────────────
  // Paste button
  // ─────────────────────────────────────────────────────────
  btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        videoUrlInput.value = text;
        videoUrlInput.dispatchEvent(new Event("input"));
      }
    } catch (err) {
      console.warn("Clipboard error:", err);
      alert("No se pudo leer el portapapeles. Pega el enlace manualmente.");
    }
  });

  // ─────────────────────────────────────────────────────────
  // Clear button
  // ─────────────────────────────────────────────────────────
  btnClear.addEventListener("click", () => {
    videoUrlInput.value = "";
    videoUrlInput.dispatchEvent(new Event("input"));
  });

  // ─────────────────────────────────────────────────────────
  // Refresh button
  // ─────────────────────────────────────────────────────────
  if (btnRefresh) {
    btnRefresh.addEventListener("click", refreshServers);
  }

  // ─────────────────────────────────────────────────────────
  // Download button
  // ─────────────────────────────────────────────────────────
  btnDownload.addEventListener("click", async () => {
    const url = videoUrlInput.value.trim();
    if (!url) return;

    const format  = videoFormatSelect.value;
    const isMp3   = format === "mp3";
    let quality   = videoQualitySelect.value;
    if (quality === "best") quality = "max";

    const payload = isMp3
      ? { url, downloadMode: "audio", audioFormat: "mp3" }
      : { url, videoQuality: quality };

    setUiLoadingState(true);
    statusText.textContent = "Conectando con el servidor...";

    let success   = false;
    let lastError = null;

    const endpointsToTry = getActiveEndpoints();

    // Try every endpoint × every CORS proxy until one works
    outer:
    for (let proxyIdx = 0; proxyIdx < CORS_PROXIES.length; proxyIdx++) {
      for (let i = 0; i < endpointsToTry.length; i++) {
        const endpoint = endpointsToTry[i];
        const host     = new URL(endpoint).hostname;
        const proxyName = proxyIdx === 0 ? "corsproxy.io" :
                          proxyIdx === 1 ? "allorigins" : "directo";
        statusText.textContent = `Intentando: ${host} (via ${proxyName})...`;

        try {
          const data = await cobaltPost(endpoint, payload, proxyIdx);

          if (data.url) {
            statusText.textContent = "¡Listo! Iniciando descarga...";

            // Trigger native browser download
            const link = document.createElement("a");
            link.href = data.url;
            link.setAttribute("download", data.filename || "");
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
              videoUrlInput.value = "";
              videoUrlInput.dispatchEvent(new Event("input"));
            }, 1000);

            success = true;
            break outer;
          } else if (data.text) {
            throw new Error(data.text);
          } else if (data.error) {
            throw new Error(data.error.code || "error desconocido");
          } else {
            throw new Error("No se pudo obtener el enlace de descarga.");
          }
        } catch (err) {
          console.warn(`Falló ${host} via proxy[${proxyIdx}]:`, err.message);
          lastError = err;
        }
      }
    }

    if (!success) {
      alert(
        "⚠️ Error al descargar.\n\n" +
        (lastError ? lastError.message : "Todos los servidores están fuera de servicio.") +
        "\n\nPrueba presionar «🔄 Actualizar servidores» o configurar uno manualmente."
      );
      statusText.textContent = "Ocurrió un error.";
    }

    setTimeout(() => setUiLoadingState(false), 1500);
  });

  // ─────────────────────────────────────────────────────────
  // Techloq PowerShell Console Bypass Tool
  // ─────────────────────────────────────────────────────────
  const btnToggleBypass   = document.getElementById("btn-toggle-bypass");
  const bypassWrapper     = document.getElementById("bypass-wrapper");
  const bypassCodeText    = document.getElementById("bypass-code-text");
  const btnCopyBypass     = document.getElementById("btn-copy-bypass");

  const POWERSHELL_TEMPLATE = `& "C:\\Users\\israe\\.gemini\\antigravity\\yt-dlp.exe" --no-check-certificate -P "C:\\Users\\israe\\Downloads" "[URL]"`;

  function updateBypassCommand() {
    if (!bypassCodeText) return;
    const currentUrl = videoUrlInput.value.trim();
    const urlToUse = currentUrl || "https://www.youtube.com/watch?v=...";
    bypassCodeText.textContent = POWERSHELL_TEMPLATE.replace("[URL]", urlToUse);
  }

  if (btnToggleBypass) {
    btnToggleBypass.addEventListener("click", () => {
      const isHidden = bypassWrapper.style.display === "none";
      bypassWrapper.style.display = isHidden ? "flex" : "none";
      updateBypassCommand();
    });
  }

  // Update console command when input url changes
  videoUrlInput.addEventListener("input", updateBypassCommand);

  if (btnCopyBypass) {
    btnCopyBypass.addEventListener("click", async () => {
      try {
        const textToCopy = bypassCodeText.textContent;
        await navigator.clipboard.writeText(textToCopy);
        
        const oldText = btnCopyBypass.textContent;
        btnCopyBypass.textContent = "✓ Copiado";
        btnCopyBypass.classList.add("ok");
        
        setTimeout(() => {
          btnCopyBypass.textContent = oldText;
          btnCopyBypass.classList.remove("ok");
        }, 1500);
      } catch (err) {
        console.warn("Clipboard error:", err);
        alert("No se pudo copiar automáticamente. Por favor selecciónalo y cópialo manualmente.");
      }
    });
  }

  const btnCopyUpdate = document.getElementById("btn-copy-update");
  const bypassUpdateText = document.getElementById("bypass-update-text");

  if (btnCopyUpdate && bypassUpdateText) {
    btnCopyUpdate.addEventListener("click", async () => {
      try {
        const textToCopy = bypassUpdateText.textContent;
        await navigator.clipboard.writeText(textToCopy);
        
        const oldText = btnCopyUpdate.textContent;
        btnCopyUpdate.textContent = "✓ Copiado";
        btnCopyUpdate.classList.add("ok");
        
        setTimeout(() => {
          btnCopyUpdate.textContent = oldText;
          btnCopyUpdate.classList.remove("ok");
        }, 1500);
      } catch (err) {
        console.warn("Clipboard error:", err);
        alert("No se pudo copiar automáticamente. Por favor selecciónalo y cópialo manualmente.");
      }
    });
  }


  // ─────────────────────────────────────────────────────────
  // UI loading state helper
  // ─────────────────────────────────────────────────────────
  function setUiLoadingState(isLoading) {
    videoUrlInput.disabled       = isLoading;
    btnPaste.disabled            = isLoading;
    btnClear.disabled            = isLoading;
    btnDownload.disabled         = isLoading;
    videoFormatSelect.disabled   = isLoading;
    videoQualitySelect.disabled  = isLoading;
    if (btnRefresh) btnRefresh.disabled = isLoading;
    if (btnSaveCustom) btnSaveCustom.disabled = isLoading;
    if (btnToggleBypass) btnToggleBypass.disabled = isLoading;

    btnDownload.textContent = isLoading ? "Procesando..." : "⬇️ Descargar";
    statusPanel.style.display = isLoading ? "flex" : "none";
  }

  // ─────────────────────────────────────────────────────────
  // Init — show default server count badge
  // ─────────────────────────────────────────────────────────
  updateBadgeStatus();
});

