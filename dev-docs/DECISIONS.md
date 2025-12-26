# Decisions Log

## 2024-12-25: UI Library Choice
- **Decision**: Use shadcn/ui + Tailwind CSS.
- **Rationale**: Provides high-quality, accessible components with full control over styles via Tailwind. Reduces time spent building common UI elements like Cards and Buttons.

## 2024-12-25: Drag and Drop Library
- **Decision**: Use `@dnd-kit`.
- **Rationale**: Modern, lightweight, and accessible compared to `react-beautiful-dnd`. Supports strict mode and future React versions better.

## 2024-12-26: Tailwind Version
- **Decision**: Stick with Tailwind CSS v3.
- **Rationale**: v4 introduced breaking changes interacting with the PostCSS config and shadcn/ui themes. Downgraded to v3 for stability.
