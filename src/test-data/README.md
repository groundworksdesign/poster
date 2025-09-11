# Test Data Directory

This directory contains test slide deck files for development and testing purposes.

## Available Test Decks

### sample-slide-deck.json
A comprehensive presentation deck that demonstrates various slide types:
- Title slide with introduction
- General slides with different layouts  
- Image slide example (references sample-image.jpg)
- Song/audio slide example (references background-music.mp3)
- Multiple color schemes and styling options

### quick-demo-deck.json  
A minimal 3-slide deck for quick testing:
- Simple title slide
- Basic content slide
- Closing slide
- Green screen mode enabled for testing

## Usage

### In Development
1. Start the application with `npm start`
2. Navigate to the `/deck` route
3. Use the file input to load one of these JSON files
4. The slides should appear in the slides list and be displayable

### For Testing
Both JSON files are also available in the `/public` directory and can be downloaded directly to test the file loading functionality.

## Structure
All deck files follow the `Deck` interface defined in `src/Present/PresentTypes.tsx` and include:
- Metadata (title, date, location, notes)
- Green screen configuration
- Slide style definitions
- Array of slides with proper typing