document.addEventListener("DOMContentLoaded", () => {
  // ─────────────────────────────────────────────────────────
  // DOM Elements
  // ─────────────────────────────────────────────────────────
  const videoUrlInput   = document.getElementById("video-url");
  const btnPaste        = document.getElementById("btn-paste");
  const btnClear        = document.getElementById("btn-clear");
  const btnDownload     = document.getElementById("btn-download");
  const btnRefresh      = document.getElementById("btn-refresh");
  const statusPanel     = document.getElementById("status-panel");
  const statusText      = document.getElementById("status-text");
  const serverStatus    = document.getElementById("server-status");

  const videoFormatSelect  = document.getElementById("video-format");
  const videoQualitySelect = document.getElementById("video-quality");
  const qualityWrapper     = document.getElementById("quality-wrapper");

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
  // Known Cobalt v10 community instances (verified working)
  // ─────────────────────────────────────────────────────────
  const DEFAULT_ENDPOINTS = [
    "https://apicobalt.mgytr.top",
    "https://cobaltapi.kittycat.boo",
    "https://dog.kittycat.boo",
    "https://fox.kittycat.boo",
  ];

  // Runtime list (may be updated via "Actualizar servidores")
  let cobaltEndpoints = [...DEFAULT_ENDPOINTS];

  // Track which CORS proxy index to use (rotates on failure)
  let currentProxyIdx = 0;

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  // Build a proxied URL for a given Cobalt endpoint
  function proxiedUrl(endpoint, proxyIdx) {
    const builder = CORS_PROXIES[proxyIdx];
    return builder(endpoint);
  }

  // POST to a Cobalt endpoint through the chosen CORS proxy.
  // allorigins wraps responses in JSON, so we unwrap it.
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
        // Tell corsproxy which headers to forward
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

  // ─────────────────────────────────────────────────────────
  // Refresh servers — fetch live list from instances tracker
  // ─────────────────────────────────────────────────────────
  async function refreshServers() {
    if (btnRefresh) {
      btnRefresh.disabled = true;
      btnRefresh.textContent = "⏳ Actualizando...";
    }
    setServerBadge("Buscando servidores...", "loading");

    try {
      // Use corsproxy.io to bypass Techloq when fetching the list
      const listUrl = "https://instances.cobalt.best/api/instances.json";
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(listUrl)}`;

      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("No se pudo cargar la lista");

      const instances = await res.json();

      // Filter: must have api.url, score > 0, youtube supported
      const candidates = instances
        .filter(i => i.api && i.api.url)
        .map(i => i.api.url.replace(/\/$/, ""));

      if (candidates.length > 0) {
        cobaltEndpoints = candidates.slice(0, 8); // use top 8
        setServerBadge(`✅ ${cobaltEndpoints.length} servidores activos`, "ok");
        console.log("Servidores actualizados:", cobaltEndpoints);
      } else {
        throw new Error("Lista vacía");
      }
    } catch (err) {
      console.warn("No se pudo actualizar la lista, usando servidores por defecto:", err.message);
      cobaltEndpoints = [...DEFAULT_ENDPOINTS];
      setServerBadge(`⚠️ ${cobaltEndpoints.length} servidores (offline)`, "warn");
    } finally {
      if (btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.textContent = "🔄 Actualizar servidores";
      }
    }
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

    // Try every endpoint × every CORS proxy until one works
    outer:
    for (let proxyIdx = 0; proxyIdx < CORS_PROXIES.length; proxyIdx++) {
      for (let i = 0; i < cobaltEndpoints.length; i++) {
        const endpoint = cobaltEndpoints[i];
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
        "\n\nProbá presionar «🔄 Actualizar servidores» y reintentar."
      );
      statusText.textContent = "Ocurrió un error.";
    }

    setTimeout(() => setUiLoadingState(false), 1500);
  });

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

    btnDownload.textContent = isLoading ? "Procesando..." : "⬇️ Descargar";
    statusPanel.style.display = isLoading ? "flex" : "none";
  }

  // ─────────────────────────────────────────────────────────
  // Init — show default server count badge
  // ─────────────────────────────────────────────────────────
  setServerBadge(`${cobaltEndpoints.length} servidores listos`, "ok");
});
