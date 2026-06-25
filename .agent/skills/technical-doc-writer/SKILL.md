---
name: technical-doc-writer
description: Generates or updates technical documentation for the web application. Use this skill whenever a user asks to write docs, map component trees, document APIs, or update README files.
---
# Web Application Documentation Guidelines

When writing or updating documentation for this project, you MUST adhere to the following standards:

## 1. Structural Requirements
- Always include a "TL;DR" frontmatter block summarizing the file's purpose in 2-3 sentences.
- Organize new documentation into specific domain folders: `docs/components/`, `docs/api/`, `docs/state/`, or `docs/auth/`.
- Use hyper-specific headings based on features (e.g., `### User Authentication Flow via OAuth2` instead of `### Login`).

## 2. Documenting Component Architecture
- When documenting UI components, explicitly list the accepted **Props**, **Local State**, and any **Custom Hooks** utilized.
- Define whether a component is a "Container" (handles data fetching and logic) or a "Presentational" component (pure UI).

## 3. API & Data Fetching
- For any network requests, document the request payload, expected response structure, and error handling states.
- Explicitly state whether data fetching occurs client-side, server-side (SSR), or at build time (SSG).

## 4. Diagramming with Mermaid.js
- Whenever documenting complex interactions—such as the Component Tree hierarchy, State Management data flow (e.g., Redux/Zustand), or Authentication flows—you MUST include a text-based Mermaid.js diagram.
- Ensure Mermaid graphs explicitly define data flow directions and label the triggers (e.g., `-->|Dispatches LOGIN_SUCCESS|`).

## 5. Constraint Highlighting
- Any non-negotiable frontend rules must be placed in a dedicated blockquote labeled `🛑 ARCHITECTURAL CONSTRAINTS`.
- Common constraints to highlight: strict accessibility (a11y) standards, required responsive breakpoints, and bundle-size limitations.

## 6. Router Updating
- If you create a brand new documentation file, you MUST also update the root `README.md` Documentation Map to include a link and description of the new file.