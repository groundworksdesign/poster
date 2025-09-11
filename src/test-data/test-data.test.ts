import { Deck } from '../Present/PresentTypes';

// Test data imports
import sampleDeck from './sample-slide-deck.json';
import quickDeck from './quick-demo-deck.json';

describe('Test Slide Deck Data', () => {
  test('sample-slide-deck.json has valid structure', () => {
    const deck = sampleDeck as Deck;
    
    // Test deck properties
    expect(deck.title).toBe('Sample Presentation Deck');
    expect(deck.date).toBe('2024-01-15');
    expect(deck.location).toBe('Conference Room A');
    expect(deck.useGreenScreen).toBe(false);
    expect(deck.notes).toBeDefined();
    expect(deck.slideStyles).toBeDefined();
    expect(deck.slides).toBeDefined();
    
    // Test slides array
    expect(Array.isArray(deck.slides)).toBe(true);
    expect(deck.slides.length).toBeGreaterThan(0);
    
    // Test first slide (title slide)
    const titleSlide = deck.slides[0];
    expect(titleSlide.type).toBe('title');
    expect(titleSlide.title).toBe('Welcome to Our Presentation');
    expect(titleSlide.style).toBeDefined();
    
    // Test that all slides have required properties
    deck.slides.forEach((slide, index) => {
      expect(slide.type).toBeDefined();
      expect(slide.title).toBeDefined();
      expect(slide.style).toBeDefined();
      expect(['general', 'title', 'song', 'image', 'audio', 'video']).toContain(slide.type);
    });
  });

  test('quick-demo-deck.json has valid structure', () => {
    const deck = quickDeck as Deck;
    
    // Test deck properties
    expect(deck.title).toBe('Quick Demo Deck');
    expect(deck.date).toBe('2024-01-16');
    expect(deck.location).toBe('Virtual Meeting');
    expect(deck.useGreenScreen).toBe(true);
    expect(deck.slides.length).toBe(4);
    
    // Test that all slide types are valid
    deck.slides.forEach((slide) => {
      expect(['general', 'title', 'song', 'image', 'audio', 'video']).toContain(slide.type);
    });
  });

  test('slide styles are properly defined', () => {
    const deck = sampleDeck as Deck;
    
    expect(deck.slideStyles).toBeDefined();
    expect(typeof deck.slideStyles).toBe('object');
    
    // Check that style properties are valid
    Object.values(deck.slideStyles).forEach((style) => {
      if (style.backgroundColor) {
        expect(typeof style.backgroundColor).toBe('string');
      }
      if (style.color) {
        expect(typeof style.color).toBe('string');
      }
      if (style.fontSize) {
        expect(typeof style.fontSize).toBe('string');
      }
    });
  });

  test('deck files contain various slide types', () => {
    const deck = sampleDeck as Deck;
    const slideTypes = deck.slides.map(slide => slide.type);
    
    // Should contain at least title and general slides
    expect(slideTypes).toContain('title');
    expect(slideTypes).toContain('general');
    
    // Sample deck should also have image and song types
    expect(slideTypes).toContain('image');
    expect(slideTypes).toContain('song');
  });
});