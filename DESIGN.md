# Design Brief

**App**: Crazy Bot 4.0 Web | **Category**: Productivity (Chat) | **Aesthetic**: Clean, playful, accessible | **Tone**: Conversational, friendly, focused

## Direction

Playful productivity chat with clear messaging hierarchy. Blue-driven accent system, white/gray neutral palette, consistent rounded corners. Distinct visual separation between user (blue, right-aligned) and bot (light gray, left-aligned). Functional first, with subtle personality through rounded cards and smooth transitions.

## Palette

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| Primary (Blue) | 0.62 0.21 262 | #1270D4 | User messages, CTAs, accents |
| Secondary (Light Gray) | 0.93 0.005 260 | #EBEBF2 | Bot message bubbles |
| Background (White) | 1.0 0 0 | #FFFFFF | Chat area, main surface |
| Foreground (Dark) | 0.18 0 0 | #2E2E2E | Text, bot avatar |
| Muted (Medium Gray) | 0.55 0 0 | #8C8C8C | User avatar, secondary text |
| Border (Light) | 0.92 0 0 | #E8E8E8 | Dividers, input borders |
| Destructive (Red) | 0.55 0.22 25 | #D32F2F | Exit, clear actions |

## Typography

| Layer | Font | Size | Weight | Use |
|-------|------|------|--------|-----|
| Display | Inter | 28–32px | 600 | Screen titles, headers |
| Body | Inter | 14–18px | 400 | Messages, labels, body text |
| Mono | JetBrains Mono | 12–14px | 400 | Code, technical content |

## Structural Zones

| Zone | Background | Border | Padding | Use |
|------|-----------|--------|---------|-----|
| Header/Top Bar | white | bottom border light | 16px | Title, exit, settings buttons |
| Chat Area | white | none | 12px | Scrollable message stream |
| Message Bubble | primary/secondary | none | 16px | User (blue) / Bot (light gray) |
| Input Bar | white | top border light | 12px | Text input, send button |
| Settings Card | white | top border light | 20px | Form inputs, labels |
| Footer | white | top border light | 20px | Buttons, actions |

## Component Patterns

- **Chat Bubbles**: Rounded-lg (20px), avatar-bubble pairing, max-width constraint for readability
- **Buttons**: Rounded-lg, blue primary, consistent spacing, hover state via opacity
- **Avatars**: Bot square+rounded (dark), User circular (medium gray), 48px default
- **Input Fields**: Light gray background, blue focus ring, rounded-lg, full-width in inputs area
- **Cards**: White background, light border top/bottom for sections, spacing rhythm 20px–24px

## Motion

- **Transitions**: 0.3s cubic-bezier(0.4, 0, 0.2, 1) for all interactive elements
- **Chat Entry**: Fade in + subtle slide from bottom
- **Screen Transitions**: None (instant) for productivity focus
- **Hover**: 5–10% opacity change on interactive elements

## Constraints

- No decorative gradients, blurs, or glows
- Contrast ratio ≥ 7:1 for all foreground-on-background text
- Max message width 300px on mobile, 400px on desktop (readability)
- All corners use 20px radius (secondary 12px for inputs/small elements)
- No animations on page load; entry animations only for chat messages

## Signature Detail

Dual avatar system: Dark rounded-square bot with white iconography, soft medium-gray circular user avatar. Distinct left/right message alignment creates visual flow. Blue accent used sparingly for CTAs and user messages only — bot replies quiet in light gray.

