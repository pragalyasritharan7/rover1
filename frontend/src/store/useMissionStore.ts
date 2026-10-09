import { create } from 'zustand';
import { ComparisonData, RunConfig, Snapshot } from '../types/snapshot';

interface MissionState {
  runId: string | null;
  config: RunConfig;
  status: string;
  snapshots: Snapshot[];
  currentStepIndex: number;
  currentSnapshot: Snapshot | null;
  groundTruthMap: number[][] | null;

  // Playback settings
  isPlaying: boolean;
  playbackSpeed: number; // ms per frame

  // Visualization toggles
  showFog: boolean;
  showFrontiers: boolean;
  showPlannedPath: boolean;
  showHeatmap: boolean;
  isReplanningBanner: boolean;

  // Navigation & views
  activeTab: 'mission' | 'comparison' | 'offline' | '3d';
  comparisonData: ComparisonData | null;
  comparisonLoading: boolean;
  connected: boolean;
  offlineMode: boolean;

  // Actions
  setConfig: (config: Partial<RunConfig>) => void;
  setRun: (runId: string, snapshots: Snapshot[], config: RunConfig) => void;
  loadOfflineData: (snapshots: Snapshot[], config?: Partial<RunConfig>) => void;
  setStep: (stepIndex: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleFog: () => void;
  toggleFrontiers: () => void;
  togglePlannedPath: () => void;
  toggleHeatmap: () => void;
  setReplanningBanner: (show: boolean) => void;
  setActiveTab: (tab: 'mission' | 'comparison' | 'offline' | '3d') => void;
  setComparisonData: (data: ComparisonData | null) => void;
  setComparisonLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  appendSnapshot: (snapshot: Snapshot) => void;
  resetPlayback: () => void;
}

const DEFAULT_CONFIG: RunConfig = {
  seed: 42,
  size: 25,
  strategy: 'greedy',
  max_energy: 220,
  sensor_radius: 4,
  block_rate: 0.04,
  safety_margin: 6,
  hard_mode: false,
};

function reconstructGroundTruthMap(snapshots: Snapshot[], stepIndex: number): number[][] | null {
  if (!snapshots || snapshots.length === 0 || stepIndex < 0) return null;
  const initialMap = snapshots[0].true_map;
  if (!initialMap) return null;

  // Deep copy base map
  const reconstructed = initialMap.map((row) => [...row]);

  // Apply map_diffs sequentially up to stepIndex
  for (let i = 1; i <= stepIndex && i < snapshots.length; i++) {
    const diffs = snapshots[i].map_diffs;
    if (diffs && diffs.length > 0) {
      for (const diff of diffs) {
        const [x, y] = diff.pos;
        if (reconstructed[y] && reconstructed[y][x] !== undefined) {
          reconstructed[y][x] = diff.val;
        }
      }
    }
  }

  return reconstructed;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  runId: null,
  config: DEFAULT_CONFIG,
  status: 'IDLE',
  snapshots: [],
  currentStepIndex: 0,
  currentSnapshot: null,
  groundTruthMap: null,

  isPlaying: false,
  playbackSpeed: 100,

  showFog: true,
  showFrontiers: true,
  showPlannedPath: true,
  showHeatmap: false,
  isReplanningBanner: false,

  activeTab: 'mission',
  comparisonData: null,
  comparisonLoading: false,
  connected: false,
  offlineMode: false,

  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  setRun: (runId, snapshots, config) => {
    const firstMap = snapshots.length > 0 ? snapshots[0].true_map : null;
    set({
      runId,
      snapshots,
      config,
      status: 'LOADED',
      currentStepIndex: 0,
      currentSnapshot: snapshots[0] || null,
      groundTruthMap: firstMap,
      isPlaying: false,
      offlineMode: false,
    });
  },

  loadOfflineData: (snapshots, customConfig) => {
    if (!snapshots || snapshots.length === 0) return;
    const firstMap = snapshots[0].true_map;
    const size = snapshots[0].grid_size ? snapshots[0].grid_size[0] : 25;

    set((state) => ({
      runId: 'offline_replay',
      snapshots,
      currentStepIndex: 0,
      currentSnapshot: snapshots[0],
      groundTruthMap: firstMap,
      status: 'OFFLINE_REPLAY',
      isPlaying: false,
      offlineMode: true,
      activeTab: 'mission',
      config: {
        ...state.config,
        size,
        ...customConfig,
      },
    }));
  },

  setStep: (stepIndex) => {
    const { snapshots } = get();
    if (stepIndex >= 0 && stepIndex < snapshots.length) {
      const snap = snapshots[stepIndex];
      const hasReplan = snap.events?.some((e) => e.startsWith('replan'));
      const reconstructedMap = reconstructGroundTruthMap(snapshots, stepIndex);
      set({
        currentStepIndex: stepIndex,
        currentSnapshot: snap,
        groundTruthMap: reconstructedMap,
        isReplanningBanner: hasReplan,
      });
    }
  },

  stepForward: () => {
    const { currentStepIndex, snapshots } = get();
    if (currentStepIndex < snapshots.length - 1) {
      get().setStep(currentStepIndex + 1);
    } else {
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      get().setStep(currentStepIndex - 1);
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  toggleFog: () => set((state) => ({ showFog: !state.showFog })),

  toggleFrontiers: () => set((state) => ({ showFrontiers: !state.showFrontiers })),

  togglePlannedPath: () =>
    set((state) => ({ showPlannedPath: !state.showPlannedPath })),

  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),

  setReplanningBanner: (show) => set({ isReplanningBanner: show }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setComparisonData: (data) => set({ comparisonData: data }),

  setComparisonLoading: (loading) => set({ comparisonLoading: loading }),

  setConnected: (connected) => set({ connected }),

  appendSnapshot: (snapshot) => {
    const { snapshots } = get();
    const newSnapshots = [...snapshots, snapshot];
    const stepIndex = newSnapshots.length - 1;
    const reconstructedMap = reconstructGroundTruthMap(newSnapshots, stepIndex);
    const hasReplan = snapshot.events?.some((e) => e.startsWith('replan'));

    set({
      snapshots: newSnapshots,
      currentStepIndex: stepIndex,
      currentSnapshot: snapshot,
      groundTruthMap: reconstructedMap,
      isReplanningBanner: hasReplan,
    });
  },

  resetPlayback: () => {
    const { snapshots } = get();
    if (snapshots.length > 0) {
      const reconstructedMap = reconstructGroundTruthMap(snapshots, 0);
      set({
        currentStepIndex: 0,
        currentSnapshot: snapshots[0],
        groundTruthMap: reconstructedMap,
        isPlaying: false,
        isReplanningBanner: false,
      });
    }
  },
}));
