import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { globalAudioRef } from "../components/MusicPlayer";

interface MusicPlayerContextType {
  isPlaying: boolean;
  currentTrackIndex: number;
  volume: number;
  playMusic: () => void;
  pauseMusic: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(
  undefined
);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.5);

  const playlist = useMemo(
    () => ["/music/synthwave-80s-robot-swarm-218092.mp3"],
    []
  );

  useEffect(() => {
    const savedIsPlaying = localStorage.getItem("isPlaying");
    const savedTrackIndex = localStorage.getItem("trackIndex");
    const savedVolume = localStorage.getItem("volume");

    if (savedIsPlaying !== null) setIsPlaying(savedIsPlaying === "true");
    if (savedTrackIndex !== null) setCurrentTrackIndex(Number(savedTrackIndex));
    if (savedVolume !== null) setVolumeState(Number(savedVolume));
  }, []);

  useEffect(() => {
    localStorage.setItem("isPlaying", isPlaying.toString());
    localStorage.setItem("trackIndex", currentTrackIndex.toString());
    localStorage.setItem("volume", volume.toString());
  }, [isPlaying, currentTrackIndex, volume]);

  const playMusic = () => {
    setIsPlaying(true);
  };

  const pauseMusic = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const prevTrack = useCallback(() => {
    setCurrentTrackIndex(
      (prev) => (prev - 1 + playlist.length) % playlist.length
    );
  }, [playlist.length]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (globalAudioRef) {
      globalAudioRef.volume = newVolume;
    }
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        isPlaying,
        currentTrackIndex,
        volume,
        playMusic,
        pauseMusic,
        nextTrack,
        prevTrack,
        setVolume,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = (): MusicPlayerContextType => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
};
