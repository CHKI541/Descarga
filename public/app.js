document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const videoUrlInput = document.getElementById("video-url");
  const btnPaste = document.getElementById("btn-paste");
  const btnClear = document.getElementById("btn-clear");
  const btnDownload = document.getElementById("btn-download");
  const statusPanel = document.getElementById("status-panel");
  const statusText = document.getElementById("status-text");

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

  // Handle download trigger
  btnDownload.addEventListener("click", () => {
    const url = videoUrlInput.value.trim();
    if (!url) return;

    // 1. Disable inputs to prevent spamming download requests
    setUiLoadingState(true);

    // 2. Build the API endpoint
    const downloadApiUrl = `/api/download?url=${encodeURIComponent(url)}`;

    // 3. Trigger native browser file download using a hidden anchor tag
    // This allows the phone's native download manager to handle the stream
    // instead of accumulating the file in browser tab memory.
    const link = document.createElement("a");
    link.href = downloadApiUrl;
    link.setAttribute("download", ""); // Request download behavior
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 4. Update status display text for user feedback
    statusText.textContent = "Conectando con el servidor...";
    setTimeout(() => {
      statusText.textContent = "Descargando video en segundo plano...";
    }, 2500);

    // 5. Restore UI control states after a safety timeout (8 seconds)
    // The browser's native download manager will continue running in the background.
    setTimeout(() => {
      setUiLoadingState(false);
      videoUrlInput.value = "";
      videoUrlInput.dispatchEvent(new Event("input"));
    }, 8000);
  });

  // Helper to toggle form control elements during downloading states
  function setUiLoadingState(isLoading) {
    videoUrlInput.disabled = isLoading;
    btnPaste.disabled = isLoading;
    btnClear.disabled = isLoading;
    btnDownload.disabled = isLoading;

    if (isLoading) {
      btnDownload.textContent = "Procesando...";
      statusPanel.style.display = "flex";
    } else {
      btnDownload.textContent = "Descargar Video";
      statusPanel.style.display = "none";
    }
  }
});
