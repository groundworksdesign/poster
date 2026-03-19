# Data Model

Overview of primary types used across the application.

Deck
- id: string
- title: string
- date?: string
- location?: string
- notes?: string
- useGreenScreen: boolean
- slideStyles: Record<string, any>
- slides: Slide[]

Slide (common fields)
- id: string
- type: SlideType ("title" | "general" | "song" | "image")
- title?: string
- subTitle?: string
- message?: string
- style?: SlideStyle

SlideType.SONG specific
- lyrics: SongData

SongData
- title: string
- author?: string
- verses: { number?: number; lines: string[] }[]

PresentData (broadcast payload)
- slide?: Slide | null
- message?: string | null
- useGreenScreen?: boolean
- data?: { lyricsNavigation?: { command: 'next'|'previous'|'goToVerse'; verse?: number; line?: number } | null } | null

Notes:
- Slide `style` and `slideStyles` capture CSS-like layout fields such as backgroundColor, color, backgroundImage, backgroundSize, backgroundPosition, horizontalAlign, verticalAlign, height, width.
- `slides` should have stable `id` values to enable re-sending the same slide after reorder/edit operations.
