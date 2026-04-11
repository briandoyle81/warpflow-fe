import { ImageResponse } from "next/og";

export const ogImageAlt =
  "Void Tactics, a fully onchain turn-based PvP fleet tactics game on a tactical grid" as const;
export const ogImageSize = { width: 1200, height: 630 } as const;

export function voidTacticsShareImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#020617",
          backgroundImage:
            "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#22d3ee",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Void Tactics
          </span>
          <span
            style={{
              fontSize: 26,
              color: "#94a3b8",
              marginTop: 24,
              textAlign: "center",
              maxWidth: 1000,
              lineHeight: 1.35,
            }}
          >
            Fully onchain turn-based PvP on a tactical grid. Fleets and match
            outcomes settle onchain.
          </span>
          <span
            style={{
              fontSize: 22,
              color: "#cbd5e1",
              marginTop: 16,
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            Don&apos;t play to earn, play to win.
          </span>
          <span
            style={{
              fontSize: 22,
              color: "#64748b",
              marginTop: 20,
            }}
          >
            voidtactics.xyz
          </span>
        </div>
      </div>
    ),
    { ...ogImageSize },
  );
}
