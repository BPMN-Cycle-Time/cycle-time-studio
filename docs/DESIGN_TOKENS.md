---
version: alpha
name: "Frequency-Based Extraction"
description: "Design tokens extracted from frequency analysis without LLM interpretation."
colors:
  local-accent: "#ffffff"
typography:
  type-1:
    fontFamily: "Mona Sans"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "24px"
  type-2:
    fontFamily: "Mona Sans"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "16px"
  type-3:
    fontFamily: "Mona Sans"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "20px"
  type-4:
    fontFamily: "Mona Sans"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "20px"
  type-5:
    fontFamily: "Mona Sans"
    fontSize: "24px"
    fontWeight: "400"
    lineHeight: "32px"
rounded:
  radius-1: "24px"
  radius-2: "22px"
  radius-3: "10px"
  radius-4: "20px"
spacing:
  space-1: "10px"
  space-2: "16px"
  space-3: "8px"
  space-4: "32px"
  space-5: "20px"
  space-6: "5px"
  space-7: "48px"
  space-8: "24px"
  space-9: "12px"
  space-10: "4px"
---

## Overview

Design tokens extracted from frequency analysis without LLM interpretation.

**Signature traits:**

- Evidence was insufficient to extract distinctive signature traits for this system.

## Colors

The palette uses 2 validated color tokens across 2 theme profiles. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

### Dark Theme

### Interactive

- **Local-accent** (#ffffff): Frequency rank #1 (5 occurrences); token importance localAccent: localized usage with limited global footprint. Role: border. {authored: rgb(255, 255, 255), space: rgb}

### Light Theme

### Interactive

- **Local-accent** (#ffffff): Frequency rank #1 (5 occurrences); token importance localAccent: localized usage with limited global footprint. Role: border. {authored: rgb(255, 255, 255), space: rgb}

## Typography

Typography uses Mona Sans across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Uses Mona Sans throughout for a uniform feel. Weight range spans regular, medium. Sizes range from 12px to 24px.

### Type Scale Evidence

| Role              | Font      | Size | Weight | Line Height | Letter Spacing | Stack / Features                                                    | Notes           |
| ----------------- | --------- | ---- | ------ | ----------- | -------------- | ------------------------------------------------------------------- | --------------- |
| Frequency rank #1 | Mona Sans | 16px | 400    | 24px        | normal         | Mona Sans, Mona Sans Fallback, ui-sans-serif, sans-serif, system-ui | Extracted token |
| Frequency rank #2 | Mona Sans | 12px | 400    | 16px        | normal         | Mona Sans, Mona Sans Fallback, ui-sans-serif, sans-serif, system-ui | Extracted token |
| Frequency rank #3 | Mona Sans | 14px | 400    | 20px        | normal         | Mona Sans, Mona Sans Fallback, ui-sans-serif, sans-serif, system-ui | Extracted token |
| Frequency rank #4 | Mona Sans | 14px | 500    | 20px        | normal         | Mona Sans, Mona Sans Fallback, ui-sans-serif, sans-serif, system-ui | Extracted token |
| Frequency rank #5 | Mona Sans | 24px | 400    | 32px        | normal         | Mona Sans, Mona Sans Fallback, ui-sans-serif, sans-serif, system-ui | Extracted token |

## Layout

Layout rhythm is inferred from spacing tokens and responsive breakpoint evidence.

### Spacing System

| Token    | Value | Px  | Notes                   |
| -------- | ----- | --- | ----------------------- |
| space-10 | 4px   | 4   | Extracted spacing token |
| space-6  | 5px   | 5   | Extracted spacing token |
| space-3  | 8px   | 8   | Extracted spacing token |
| space-1  | 10px  | 10  | Extracted spacing token |
| space-9  | 12px  | 12  | Extracted spacing token |
| space-2  | 16px  | 16  | Extracted spacing token |
| space-5  | 20px  | 20  | Extracted spacing token |
| space-8  | 24px  | 24  | Extracted spacing token |
| space-4  | 32px  | 32  | Extracted spacing token |
| space-7  | 48px  | 48  | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence

| Shadow Token | Layers | Details                     |
| ------------ | ------ | --------------------------- |
| n/a          | 0      | No validated shadow payload |

### Interaction Signals

| Theme | Signal         | Evidence                                                                           |
| ----- | -------------- | ---------------------------------------------------------------------------------- |
| Light | outline-style  | solid                                                                              |
| Light | outline-color  | oklab(0.256199 -0.00000248849 0.00000599027 / 0.5) ; lab(93.0162 -0.30759 2.57244) |
| Light | outline-width  | 3px ; 1px                                                                          |
| Light | outline-offset | 0px ; -1px                                                                         |
| Dark  | outline-style  | solid                                                                              |
| Dark  | outline-color  | oklab(0.256199 -0.00000248849 0.00000599027 / 0.5) ; lab(93.0162 -0.30759 2.57244) |
| Dark  | outline-width  | 3px ; 1px                                                                          |
| Dark  | outline-offset | 0px ; -1px                                                                         |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles

| Token    | Value | Px  | Role Mapping         |
| -------- | ----- | --- | -------------------- |
| radius-3 | 10px  | 10  | Control corner       |
| radius-4 | 20px  | 20  | Card corner          |
| radius-2 | 22px  | 22  | Large surface corner |
| radius-1 | 24px  | 24  | Large surface corner |

### Geometry Evidence

| Radius Token | Shape | Units |
| ------------ | ----- | ----- |
| radius-1     | 24px  | px    |
| radius-2     | 22px  | px    |
| radius-3     | 10px  | px    |
| radius-4     | 20px  | px    |

## Components

(none detected)

## Do's and Don'ts

Guardrails tie generation choices back to validated tokens, component patterns, and evidence-backed hierarchy.

| Do                                                                            | Don't                                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Do maintain consistent spacing using the base grid                            | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text)                   | Don't mix rounded and sharp corners in the same view       |
| Do use the primary color only for the single most important action per screen |                                                            |
| Do verify evidence before writing new design-system guidance                  |                                                            |

## Responsive Evidence

### Breakpoints

| Name         | Width    | Key Changes                         |
| ------------ | -------- | ----------------------------------- |
| Mobile       | <= 400px | (max-width: 400px)                  |
| Mobile       | <= 480px | (max-width: 480px)                  |
| Mobile       | <= 600px | (max-width: 600px)                  |
| Breakpoint 4 | <= 768px | (max-width: 768px)                  |
| Breakpoint 5 | Unknown  | (hover: none) and (pointer: coarse) |

## Agent Prompt Guide

### Example Component Prompts

- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide

1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
