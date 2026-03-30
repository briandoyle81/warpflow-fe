import { Address } from "viem";
import { Position, Attributes, ActionType } from "./types";

/**
 * IMPORTANT:
 *
 * These types are for the SIMULATED TUTORIAL ONLY.
 *
 * They intentionally avoid using bigint so that tutorial state and
 * steps remain JSON-serializable and safe under React dev tools,
 * analytics SDKs, and SES. Do NOT reuse these types for on-chain
 * game data or lobby state; use the bigint-based types in
 * `types.ts` for that.
 *
 * Boundary rule:
 * - Inside the tutorial (OnboardingTutorial + its children), use
 *   these string/number IDs.
 * - When you need to call real contract or game code that expects
 *   bigint IDs, convert at the boundary with BigInt(idString).
 */

/** Persisted tutorial step index; presence means Info should resume the sim tutorial. */
export const TUTORIAL_STEP_STORAGE_KEY = "void-tactics-tutorial-step-index";

export type TutorialShipId = string;

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  allowedActions: {
    selectShip?: TutorialShipId[]; // Specific ship IDs that can be selected
    moveShip?: { shipId: TutorialShipId; allowedPositions: Position[] };
    shoot?: { shipId: TutorialShipId; allowedTargets: TutorialShipId[] };
    useSpecial?: {
      shipId: TutorialShipId;
      allowedTargets: TutorialShipId[];
      specialType?: number;
    };
    assist?: { shipId: TutorialShipId; allowedTargets: TutorialShipId[] };
    claimPoints?: boolean;
  };
  highlightElements?: {
    ships?: TutorialShipId[];
    mapPositions?: Position[];
    uiElements?: string[];
  };
  requiresTransaction?: boolean;
  showTransactionAfter?: boolean; // Show transaction dialog after executing action (instead of before)
  onStepComplete?: (actionData: TutorialAction | null) => boolean; // Return true if step should progress
  nextStepCondition?: (gameState: SimulatedGameState) => boolean;
  autoAdvance?: boolean; // Automatically advance after action
}

export interface TutorialShipPosition {
  shipId: TutorialShipId;
  position: Position;
  isCreator: boolean;
  isPreview?: boolean;
  /** Matches on-chain ShipPosition when present. */
  status?: 0 | 1 | 2;
}

/** Last move for tutorial UI (ghost + pulse), same shape as in-game last move but with string IDs. */
export interface TutorialLastMove {
  shipId: TutorialShipId;
  oldRow: number;
  oldCol: number;
  newRow: number;
  newCol: number;
  actionType: ActionType;
  targetShipId?: TutorialShipId;
}

export interface SimulatedGameState {
  gameId: string;
  metadata: {
    gameId: string;
    creator: Address;
    joiner: Address;
    creatorFleetId: number;
    joinerFleetId: number;
    creatorGoesFirst: boolean;
    startedAt: number; // unix seconds
    winner: Address;
  };
  turnState: {
    currentTurn: Address;
    turnTime: number; // seconds
    turnStartTime: number; // unix seconds
    currentRound: number;
  };
  gridDimensions: { gridWidth: number; gridHeight: number };
  maxScore: number;
  creatorScore: number;
  joinerScore: number;
  shipIds: TutorialShipId[];
  shipAttributes: Attributes[];
  shipPositions: TutorialShipPosition[];
  creatorActiveShipIds: TutorialShipId[];
  joinerActiveShipIds: TutorialShipId[];
  creatorMovedShipIds: TutorialShipId[];
  joinerMovedShipIds: TutorialShipId[];
  lastMove?: TutorialLastMove;
}

export interface TutorialAction {
  type:
    | "selectShip"
    | "moveShip"
    | "shoot"
    | "useSpecial"
    | "assist"
    | "claimPoints";
  shipId?: TutorialShipId;
  targetShipId?: TutorialShipId;
  position?: Position;
  actionType?: ActionType;
  specialType?: number;
}

export interface TutorialContextValue {
  currentStepIndex: number;
  displayStepNumber: number;
  displayTotalSteps: number;
  isVisibleLastStep: boolean;
  currentStep: TutorialStep | null;
  gameState: SimulatedGameState;
  isTransactionDialogOpen: boolean;
  pendingAction: TutorialAction | null;
  isStepComplete: boolean;
  isStepHydrated: boolean;
  updateGameState: (
    updater: (state: SimulatedGameState) => SimulatedGameState,
  ) => void;
  validateAction: (
    action: TutorialAction,
  ) => { valid: boolean; message?: string };
  executeAction: (action: TutorialAction) => void;
  nextStep: () => void;
  previousStep: () => void;
  openTransactionDialog: (action: TutorialAction) => void;
  closeTransactionDialog: () => void;
  approveTransaction: () => void;
  rejectTransaction: () => void;
  resetTutorial: () => void;
}

