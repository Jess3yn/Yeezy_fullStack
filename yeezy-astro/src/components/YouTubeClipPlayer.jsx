import { useEffect, useRef, useState } from 'react';
import {
  activateYoutubePlayer,
  loadYoutubeIframeApi,
  releaseYoutubePlayer,
  youtubeVideoId,
} from '../lib/youtube.js';

export default function YouTubeClipPlayer({
  audioUrl,
  start,
  duration,
  label = 'audio del disco',
  showWhenUnavailable = false,
}) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [mostrar, setMostrar] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [error, setError] = useState('');

  const videoId = youtubeVideoId(audioUrl);
  const inicio = Number(start ?? 0);
  const largo = Number(duration);
  const clipValido = Number.isInteger(inicio) && inicio >= 0
    && Number.isInteger(largo) && largo > 0;
  const fin = inicio + largo;
  const disponible = Boolean(videoId && clipValido);

  useEffect(() => {
    if (!mostrar || !disponible) return undefined;
    let cancelado = false;

    loadYoutubeIframeApi()
      .then((youtube) => {
        if (cancelado || !hostRef.current) return;

        playerRef.current = new youtube.Player(hostRef.current, {
          width: '100%',
          height: '100%',
          videoId,
          playerVars: {
            controls: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: ({ target }) => {
              if (cancelado) return;
              playerRef.current = target;
              activateYoutubePlayer(target);
              target.loadVideoById({
                videoId,
                startSeconds: inicio,
                endSeconds: fin,
              });
            },
            onStateChange: ({ data, target }) => {
              if (data === youtube.PlayerState.PLAYING) {
                setReproduciendo(true);
                activateYoutubePlayer(target);
                window.clearInterval(intervalRef.current);
                intervalRef.current = window.setInterval(() => {
                  if (target.getCurrentTime() < fin) return;
                  window.clearInterval(intervalRef.current);
                  intervalRef.current = null;
                  target.pauseVideo();
                  target.seekTo(inicio, true);
                }, 250);
                return;
              }

              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
              setReproduciendo(false);
              if (data === youtube.PlayerState.ENDED) target.seekTo(inicio, true);
            },
            onError: ({ data }) => {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
              setError(data === 5
                ? 'Este navegador no puede reproducir los formatos de video de YouTube. Prueba con Chrome o Edge actualizado.'
                : `YouTube no pudo reproducir este video (error ${data}).`);
              setReproduciendo(false);
            },
          },
        });
      })
      .catch((cause) => {
        if (!cancelado) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar YouTube.');
        }
      });

    return () => {
      cancelado = true;
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      const player = playerRef.current;
      playerRef.current = null;
      setReproduciendo(false);
      if (player) {
        releaseYoutubePlayer(player);
        player.destroy();
      }
    };
  }, [disponible, fin, inicio, mostrar, videoId]);

  function alternarReproduccion() {
    if (!disponible) return;
    setError('');
    if (!mostrar) {
      setMostrar(true);
    } else if (playerRef.current) {
      if (reproduciendo) {
        playerRef.current.pauseVideo();
      } else {
        activateYoutubePlayer(playerRef.current);
        playerRef.current.playVideo();
      }
    }
  }

  function cerrarReproductor() {
    setMostrar(false);
    setReproduciendo(false);
  }

  if (!disponible && !showWhenUnavailable) return null;

  return (
    <div className="youtube-clip">
      <button
        aria-label={`${reproduciendo ? 'Pausar' : 'Reproducir'} ${label}`}
        aria-pressed={reproduciendo}
        className="youtube-clip-toggle"
        disabled={!disponible}
        onClick={alternarReproduccion}
        title={!disponible ? 'Ingresa un enlace de YouTube, inicio y duración válidos' : undefined}
        type="button"
      >
        {reproduciendo ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7 5h4v14H7zM15 5h4v14h-4z" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7 4.5v15l12-7.5z" />
          </svg>
        )}
        <span>{reproduciendo ? 'PAUSAR' : 'ESCUCHAR'}</span>
      </button>
      {mostrar && (
        <div className="youtube-clip-overlay" onClick={cerrarReproductor}>
          <div
            aria-label={`Reproductor de YouTube: ${label}`}
            aria-modal="true"
            className="youtube-clip-player"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="youtube-clip-frame" ref={hostRef} />
            {error && (
              <span className="youtube-clip-error" role="alert">
                {error}
                {audioUrl && (
                  <a href={audioUrl} rel="noopener noreferrer" target="_blank">
                    ABRIR EN YOUTUBE
                  </a>
                )}
              </span>
            )}
            <button className="youtube-clip-close" onClick={cerrarReproductor} type="button">
              CERRAR REPRODUCTOR
            </button>
          </div>
        </div>
      )}
      {!disponible && showWhenUnavailable && (
        <span className="youtube-clip-help">
          {audioUrl && !videoId
            ? 'Ingresa un enlace válido de YouTube.'
            : 'Ingresa YouTube, inicio y duración del clip.'}
        </span>
      )}
      {error && !mostrar && (
        <span className="youtube-clip-error" role="alert">{error}</span>
      )}
    </div>
  );
}
