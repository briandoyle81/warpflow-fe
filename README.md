# WarpFlow - Space Combat Tactics Game

WarpFlow is a blockchain-based strategic space combat game where players command fleets of customizable ships in tactical battles across carefully designed maps. Built on Flow blockchain, the game combines real-time strategy with NFT ship ownership and turn-based combat mechanics. The entire frontend has been vibe-coded for maximum development velocity and creative flow.

## Game Overview

### Core Gameplay

- **Fleet Management**: Build and customize fleets of unique ships with different weapons, armor, shields, and special abilities
- **Strategic Combat**: Engage in turn-based tactical battles on grid-based maps with various terrain types
- **Ship Customization**: Each ship has unique traits (accuracy, hull strength, speed) and equipment configurations
- **Map Variety**: Battle across carefully designed maps with nebula clouds, scoring positions, and strategic obstacles
- **Real-time Events**: Watch battles unfold with live event tracking and ship movement animations

### Ship Types & Equipment

- **Ship Variety**: Diverse ship classes with unique base stats and equipment slots
- **Leveling System**: Ships gain experience and level up through combat, improving their core attributes
- **Equipment Combinations**: Mix and match weapons, armor, shields, and special abilities to create specialized builds
- **Main Weapons**: Various weapon types with different damage, range, and accuracy characteristics
- **Armor Systems**: Defensive equipment that reduces incoming damage with different protection types
- **Shield Generators**: Energy-based protection systems with varying strength and recharge rates
- **Special Abilities**:
  - **EMP**: Disables enemy systems and disrupts operations
  - **Repair**: Heals friendly ships and restores hull integrity
  - **Flak**: Area-of-effect anti-aircraft weaponry for crowd control
- **Ship Traits**: Accuracy, Hull Strength, and Speed determine combat effectiveness and can be enhanced through leveling
- **Build Diversity**: Create specialized fleets with tank ships, glass cannons, support vessels, and hybrid combinations

### Game Mechanics

- **Turn-Based Combat**: Players alternate turns, moving ships and executing actions
- **Line of Sight**: Ships must have clear line of sight to target enemies (except for special abilities)
- **Damage Calculation**: Complex damage system with armor reduction
- **Movement System**: Ships can move and act in the same turn
- **Threat Allocation**: Build fleets within threat limits - powerful ships cost more threat, allowing fewer ships, while cheaper ships cost less threat but are less capable
- **Ship Experience**: Ships gain experience by destroying enemy ships, becoming more powerful without increasing their threat cost
- **Ship Destruction**: NFT ships can be permanently destroyed in combat, forcing players to choose between tactical objectives and ship preservation
- **Risk vs Reward**: Players must decide whether to sacrifice valuable ships to achieve victory or protect their fleet at the cost of tactical advantage
- **Scoring System**: Control strategic positions to earn victory points
- **Fleet Deployment**: Pre-battle ship positioning and formation planning

### Blockchain Integration

- **NFT Ships**: Each ship is a unique NFT with procedurally generated attributes
- **Marketplace Trading**: Search and acquire ships on NFT marketplaces like OpenSea to find the perfect ships for your fleet
- **On-Chain Game State**: All game data stored on Flow blockchain for transparency
- **Real-Time Updates**: Live event streaming from blockchain transactions
- **Fleet Management**: Create and manage fleets of your NFT ships

### Technical Features

- **Real-Time UI**: Live updates during battles with smooth animations
- **Image Caching**: Optimized ship image loading and caching system
- **Event Tracking**: Comprehensive game event logging and display
- **Audio Integration**: Immersive sound effects and background music

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
