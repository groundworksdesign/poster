'use strict';

const {
  classifyOpenUrl,
  shouldCreateHomeWindow,
} = require('../../electron/homeWindowPolicy.cjs');

describe('homeWindowPolicy', () => {
  describe('classifyOpenUrl', () => {
    test('root is home', () => {
      expect(classifyOpenUrl('http://127.0.0.1:3000/')).toBe('home');
      expect(classifyOpenUrl('/')).toBe('home');
    });

    test('deck paths are deck', () => {
      expect(classifyOpenUrl('http://127.0.0.1:3000/deck')).toBe('deck');
      expect(classifyOpenUrl('/deck?open=abc')).toBe('deck');
      expect(classifyOpenUrl('/deck?focusImport=1')).toBe('deck');
    });

    test('presentation with session params is present-session', () => {
      expect(
        classifyOpenUrl(
          '/presentation?sessionId=s1&presentId=p1',
        ),
      ).toBe('present-session');
    });

    test('bare presentation without session is present-bare', () => {
      expect(classifyOpenUrl('/presentation')).toBe('present-bare');
      expect(classifyOpenUrl('/presentation?')).toBe('present-bare');
      expect(classifyOpenUrl('/presentation?sessionId=only')).toBe('present-bare');
    });

    test('about:blank is present-blank so first-open Present can hydrate', () => {
      expect(classifyOpenUrl('about:blank')).toBe('present-blank');
      expect(classifyOpenUrl('about:blank?')).toBe('present-blank');
      expect(classifyOpenUrl('ABOUT:BLANK')).toBe('present-blank');
    });
  });

  describe('shouldCreateHomeWindow', () => {
    test('creates when no Home exists', () => {
      expect(shouldCreateHomeWindow({ exists: false })).toBe(true);
      expect(shouldCreateHomeWindow({ exists: true, destroyed: true })).toBe(true);
    });

    test('does not create when Home already exists (focus instead)', () => {
      expect(shouldCreateHomeWindow({ exists: true, destroyed: false })).toBe(false);
    });
  });
});
