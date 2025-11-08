import { Ship } from "../../types/types";

export interface IRenderComponent {
  render(ship: Ship): string;
}

export interface IReturnSVG {
  render(ship: Ship): string;
}

export type ShipRendererInput = Ship;
