'use strict';

const { clearEmptyCscEnv } = require('../../scripts/clear-empty-csc-env.cjs');

describe('clearEmptyCscEnv', () => {
  const keys = ['CSC_LINK', 'CSC_KEY_PASSWORD', 'CSC_NAME'];

  afterEach(() => {
    for (const key of keys) delete process.env[key];
  });

  it('removes empty and whitespace CSC_LINK so electron-builder does not treat cwd as a cert', () => {
    process.env.CSC_LINK = '';
    process.env.CSC_KEY_PASSWORD = '   ';
    process.env.CSC_NAME = 'Developer ID';

    const cleared = clearEmptyCscEnv(process.env);

    expect(cleared).toEqual(expect.arrayContaining(['CSC_LINK', 'CSC_KEY_PASSWORD']));
    expect(process.env.CSC_LINK).toBeUndefined();
    expect(process.env.CSC_KEY_PASSWORD).toBeUndefined();
    expect(process.env.CSC_NAME).toBe('Developer ID');
  });

  it('leaves real certificate material intact', () => {
    process.env.CSC_LINK = '/tmp/cert.p12';
    process.env.CSC_KEY_PASSWORD = 'secret';

    expect(clearEmptyCscEnv(process.env)).toEqual([]);
    expect(process.env.CSC_LINK).toBe('/tmp/cert.p12');
    expect(process.env.CSC_KEY_PASSWORD).toBe('secret');
  });
});
