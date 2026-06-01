document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const videoUrlInput = document.getElementById("video-url");
  const btnPaste = document.getElementById("btn-paste");
  const btnClear = document.getElementById("btn-clear");
  const btnDownload = document.getElementById("btn-download");
  const statusPanel = document.getElementById("status-panel");
  const statusText = document.getElementById("status-text");

  const videoFormatSelect = document.getElementById("video-format");
  const videoQualitySelect = document.getElementById("video-quality");
  const qualityWrapper = document.getElementById("quality-wrapper");

  // Toggle quality select visibility based on format choice (MP3 does not require quality)
  videoFormatSelect.addEventListener("change", () => {
    const isMp3 = videoFormatSelect.value === "mp3";
    if (isMp3) {
      qualityWrapper.style.display = "none";
    } else {
      qualityWrapper.style.display = "flex";
    }
  });

  // Monitor input field changes to toggle download button state
  videoUrlInput.addEventListener("input", () => {
    const hasValue = videoUrlInput.value.trim().length > 0;
    btnDownload.disabled = !hasValue;
    btnClear.style.display = hasValue ? "block" : "none";
    
    // Position clear button if Paste button is visible
    if (hasValue) {
      btnPaste.style.display = "none";
      btnClear.style.right = "12px";
    } else {
      btnPaste.style.display = "block";
      btnClear.style.display = "none";
    }
  });

  // Paste link from clipboard
  btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        videoUrlInput.value = text;
        videoUrlInput.dispatchEvent(new Event("input"));
      }
    } catch (err) {
      console.warn("Could not read from clipboard automatically:", err);
      alert("No se pudo leer el portapapeles. Pega el enlace manualmente.");
    }
  });

  // Clear input field
  btnClear.addEventListener("click", () => {
    videoUrlInput.value = "";
    videoUrlInput.dispatchEvent(new Event("input"));
  });

  // Fallback active community instances of Cobalt (v10 compliant and CORS enabled)
  const COBALT_ENDPOINTS = [
    "https://apicobalt.mgytr.top",
    "https://cobaltapi.kittycat.boo",
    "https://dog.kittycat.boo",
    "https://fox.kittycat.boo"
  ];

  // Handle download trigger
  btnDownload.addEventListener("click", async () => {
    const url = videoUrlInput.value.trim();
    if (!url) return;

    const format = videoFormatSelect.value;
    const isMp3 = format === "mp3";
    let quality = videoQualitySelect.value;
    if (quality === "best") quality = "max";

    // 1. Disable inputs to prevent duplicate download requests
    setUiLoadingState(true);
    statusText.textContent = "Conectando con el servidor...";

    let success = false;
    let lastError = null;

    // 2. Loop through fallback API endpoints
    for (let i = 0; i < COBALT_ENDPOINTS.length; i++) {
      const endpoint = COBALT_ENDPOINTS[i];
      const host = new URL(endpoint).hostname;
      statusText.textContent = `Conectando con el servidor (${host})...`;
      
      try {
        const payload = isMp3
          ? { url: url, downloadMode: "audio", audioFormat: "mp3" }
          : { url: url, videoQuality: quality };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("El servidor devolvió un error o requiere autenticación.");
        }

        const data = await response.json();

        if (data.url) {
          statusText.textContent = "¡Listo! Iniciando descarga...";
          
          // 3. Trigger native browser file download
          const link = document.createElement("a");
          link.href = data.url;
          link.setAttribute("download", ""); 
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clear input after success
          setTimeout(() => {
            videoUrlInput.value = "";
            videoUrlInput.dispatchEvent(new Event("input"));
          }, 1000);

          success = true;
          break; // Stop loop since it succeeded
        } else if (data.text) {
          throw new Error(data.text);
        } else {
          throw new Error("No se pudo obtener el enlace de descarga.");
        }
      } catch (error) {
        console.warn(`Endpoint fallido (${host}):`, error.message);
        lastError = error;
        // Continue to the next endpoint
      }
    }

    if (!success) {
      alert("Error al descargar: " + (lastError ? lastError.message : "Todos los servidores están fuera de servicio o saturados. Inténtalo más tarde."));
      statusText.textContent = "Ocurrió un error.";
    }

    // 5. Restore UI control states
    setTimeout(() => {
      setUiLoadingState(false);
    }, 1500);
  });

  // Helper to toggle form control elements during downloading states
  function setUiLoadingState(isLoading) {
    videoUrlInput.disabled = isLoading;
    btnPaste.disabled = isLoading;
    btnClear.disabled = isLoading;
    btnDownload.disabled = isLoading;
    videoFormatSelect.disabled = isLoading;
    videoQualitySelect.disabled = isLoading;

    if (isLoading) {
      btnDownload.textContent = "Procesando...";
      statusPanel.style.display = "flex";
    } else {
      btnDownload.textContent = "Descargar Video";
      statusPanel.style.display = "none";
    }
  }
});
