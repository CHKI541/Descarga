# YouTube Downloader - Web App (Cross-Platform)

Esta es una aplicación web full-stack (Frontend + Backend en Node.js) que permite descargar videos de YouTube de forma directa en cualquier dispositivo (celular Android, iPhone, tablet o PC). 

Utiliza la herramienta de código abierto `yt-dlp` para realizar la extracción y conversión del flujo de video y audio en el servidor, transmitiendo el archivo resultante en tiempo real a tu navegador para que se descargue de manera nativa sin consumir la memoria RAM del dispositivo cliente.

---

## 🛠️ Arquitectura
*   **Frontend**: Interfaz táctil responsiva construida con HTML5 y Vanilla CSS con un estilo moderno de *glassmorphism*.
*   **Backend**: Servidor **Node.js + Express** que se comunica mediante subprocesos (`child_process`) con `yt-dlp` y canaliza (pipes) el flujo de salida directamente a la respuesta HTTP.
*   **Contenedor**: Configurado con un **Dockerfile** que instala Node.js, Python, FFmpeg y descarga la versión oficial más reciente de `yt-dlp`.

---

## 🚀 Despliegue en la Nube (Gratis)

Puedes subir esta carpeta a tu cuenta de GitHub y desplegarla gratis en plataformas que admitan contenedores Docker.

### Opción 1: Render (Recomendado y Gratis)
Render compilará automáticamente tu contenedor Docker y te dará una URL pública del tipo `https://tu-app.onrender.com`.

1.  Crea un repositorio nuevo en tu cuenta de GitHub y sube este código.
2.  Inicia sesión en [Render.com](https://render.com/).
3.  Haz clic en **New +** y selecciona **Web Service**.
4.  Conecta tu cuenta de GitHub y selecciona el repositorio de este proyecto.
5.  Configura las opciones básicas:
    *   **Runtime**: Selecciona **Docker** (Render detectará automáticamente el archivo `Dockerfile`).
    *   **Instance Type**: Selecciona el plan **Free** (Gratuito).
6.  Haz clic en **Deploy Web Service**. ¡Y listo! La aplicación se compilará y estará en línea en unos minutos.

### Opción 2: Hugging Face Spaces (Gratis)
Hugging Face te permite alojar aplicaciones basadas en Docker de forma 100% gratuita.

1.  Ve a [Hugging Face](https://huggingface.co/) e inicia sesión.
2.  Haz clic en su menú de perfil y presiona **New Space**.
3.  Dale un nombre a tu Space y selecciona **Docker** como el SDK.
4.  Elige la plantilla **Blank** (Vacía).
5.  Sube todos los archivos de este repositorio o sincronízalo con tu GitHub.
6.  Hugging Face compilará el contenedor y te dará una URL web pública activa de forma inmediata.

---

## 💻 Ejecución Local

Para probarlo en tu propia PC localmente:

### Requisitos previos:
1.  Tener instalado [Node.js](https://nodejs.org/).
2.  Tener instalado [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) y [FFmpeg](https://ffmpeg.org/) en las variables de entorno del sistema (o colocarlos en la carpeta raíz del proyecto).

### Pasos:
1.  Abre la terminal en esta carpeta.
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor:
    ```bash
    npm start
    ```
4.  Abre tu navegador en: `http://localhost:8080`
