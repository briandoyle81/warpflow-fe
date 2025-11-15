import type { ReactNode } from "react";
import { Address } from "viem";
import { Position, ShipPosition, Attributes, GameDataView, ActionType } from "./types";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instructions: string | ReactNode;
  allowedActions: {
    selectShip?: bigint[]; // Specific ship IDs that can be selected
    moveShip?: { shipId: bigint; allowedPositions: Position[] };
    shoot?: { shipId: bigint; allowedTargets: bigint[] };
    useSpecial?: { shipId: bigint; allowedTargets: bigint[]; specialType?: number };
    assist?: { shipId: bigint; allowedTargets: bigint[] };
    claimPoints?: boolean;
  };
  highlightElements?: {
    ships?: bigint[];
    mapPositions?: Position[];
    uiElements?: string[];
  };
      requiresTransaction?: boolean;
      showTransactionAfter?: boolean; // Show transaction dialog after executing action (instead of before)
      onStepComplete?: (actionData: TutorialAction | null) => boolean; // Return true if step should progress
      nextStepCondition?: (gameState: SimulatedGameState) => boolean;
      autoAdvance?: boolean; // Automatically advance after action
}

export interface SimulatedGameState {
  gameId: bigint;
  metadata: {
    gameId: bigint;
    creator: Address;
    joiner: Address;
    creatorFleetId: bigint;
    joinerFleetId: bigint;
    creatorGoesFirst: boolean;
    startedAt: bigint;
    winner: Address;
  };
  turnState: {
    currentTurn: Address;
    turnTime: bigint;
    turnStartTime: bigint;
    currentRound: bigint;
  };
  gridDimensions: { gridWidth: number; gridHeight: number };
  maxScore: bigint;
  creatorScore: bigint;
  joinerScore: bigint;
  shipIds: bigint[];
  shipAttributes: Attributes[];
  shipPositions: ShipPosition[];
  creatorActiveShipIds: bigint[];
  joinerActiveShipIds: bigint[];
  creatorMovedShipIds: bigint[];
  joinerMovedShipIds: bigint[];
}

export interface TutorialAction {
  type: "selectShip" | "moveShip" | "shoot" | "useSpecial" | "assist" | "claimPoints";
  shipId?: bigint;
  targetShipId?: bigint;
  position?: Position;
  actionType?: ActionType;
  specialType?: number;
}

export interface TutorialContextValue {
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  gameState: SimulatedGameState;
  isTransactionDialogOpen: boolean;
  pendingAction: TutorialAction | null;
  isStepComplete: boolean;
  updateGameState: (updater: (state: SimulatedGameState) => SimulatedGameState) => void;
  validateAction: (action: TutorialAction) => { valid: boolean; message?: string };
  executeAction: (action: TutorialAction) => void;
  nextStep: () => void;
  previousStep: () => void;
  openTransactionDialog: (action: TutorialAction) => void;
  closeTransactionDialog: () => void;
  approveTransaction: () => void;
  rejectTransaction: () => void;
  resetTutorial: () => void;
}
