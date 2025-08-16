import React, { useEffect, useRef, useMemo, useState } from "react";
import { useMusicPlayer } from "../providers/MusicPlayerContext";

let globalAudioRef: HTMLAudioElement | null = null;
const setGlobalAudioRef = (ref: HTMLAudioElement | null) => {
  globalAudioRef = ref;
};

const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    isPlaying,
    currentTrackIndex,
    volume,
    playMusic,
    pauseMusic,
    nextTrack,
    prevTrack,
    setVolume,
  } = useMusicPlayer();

  const playlist = useMemo(
    () => [
      "/music/lady-of-the-80x27s-128379.mp3",
      "/music/chill-synthwave-211190.mp3",
      "/music/dark-synth-wave-221328.mp3",
      "/music/night-221519.mp3",
      "/music/synthwave-80s-robot-swarm-218092.mp3",
    ],
    []
  );

  // Initialize audio only once
  useEffect(() => {
    if (!audioRef.current) {
      const audioElement = new Audio(playlist[currentTrackIndex]);
      const savedCurrentTime = parseFloat(
        localStorage.getItem("currentTime") || "0"
      );
      audioElement.currentTime = savedCurrentTime;

      audioRef.current = audioElement;
      globalAudioRef = audioElement; // Store reference globally

      const handleEnded = () => nextTrack();
      audioElement.addEventListener("ended", handleEnded);

      return () => {
        audioElement.removeEventListener("ended", handleEnded);
      };
    } else {
      audioRef.current.src = playlist[currentTrackIndex];
      if (isPlaying) {
        audioRef.current
          .play()
          .catch((error) => console.error("Error playing audio:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIndex, isPlaying, nextTrack, playlist]);

  // Handle time update for saving current time to localStorage
  useEffect(() => {
    if (!audioRef.current) return;

    const handleTimeUpdate = () => {
      localStorage.setItem(
        "currentTime",
        audioRef.current!.currentTime.toString()
      );
    };

    audioRef.current.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      pauseMusic();
    } else {
      audioRef.current
        .play()
        .catch((error) => console.error("Error playing audio:", error));
      playMusic();
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(event.target.value));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={prevTrack}
          className="p-1.5 rounded border border-purple-400 bg-black/60 hover:bg-purple-400/20 transition-all duration-200 hover:shadow-lg hover:shadow-purple-400/30"
          aria-label="Previous track"
        >
          <svg
            className="w-4 h-4 text-purple-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          className="p-1.5 rounded border border-cyan-400 bg-black/60 hover:bg-cyan-400/20 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/30"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              className="w-4 h-4 text-cyan-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-cyan-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <button
          onClick={nextTrack}
          className="p-1.5 rounded border border-purple-400 bg-black/60 hover:bg-purple-400/20 transition-all duration-200 hover:shadow-lg hover:shadow-purple-400/30"
          aria-label="Next track"
        >
          <svg
            className="w-4 h-4 text-cyan-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
          </svg>
        </button>
      </div>

      <div className="w-28">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${
              volume * 100
            }%, #1e293b ${volume * 100}%, #1e293b 100%)`,
          }}
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
export { globalAudioRef, setGlobalAudioRef };
