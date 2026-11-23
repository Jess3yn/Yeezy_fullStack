const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
let iframeApiPromise;
let activePlayer;

export function youtubeVideoId(value) {
  if (!value) return null;

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  let videoId = null;
  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0];
  } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else {
      const [, route, id] = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/) || [];
      if (route) videoId = id;
    }
  }

  return videoId && YOUTUBE_VIDEO_ID.test(videoId) ? videoId : null;
}

export function loadYoutubeIframeApi() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('YouTube solo está disponible en el navegador.'));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    const script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
      || document.createElement('script');
    const scriptWasAdded = !script.isConnected;

    window.onYouTubeIframeAPIReady = () => {
      window.onYouTubeIframeAPIReady = previousCallback;
      try {
        if (typeof previousCallback === 'function') previousCallback();
      } finally {
        resolve(window.YT);
      }
    };

    script.onerror = () => {
      window.onYouTubeIframeAPIReady = previousCallback;
      iframeApiPromise = null;
      reject(new Error('No se pudo cargar el reproductor de YouTube.'));
    };

    if (scriptWasAdded) {
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return iframeApiPromise;
}

export function activateYoutubePlayer(player) {
  if (activePlayer && activePlayer !== player) activePlayer.pauseVideo();
  activePlayer = player;
}

export function releaseYoutubePlayer(player) {
  if (activePlayer === player) activePlayer = null;
}
