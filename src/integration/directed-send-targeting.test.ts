import {
  createDeckSession,
  createPresentSession,
  resetTestSessionHub,
} from '../Present/SessionTransport';
import { ensureTestSessionBackend } from '../Present/testSessionHelpers';

/**
 * Integration: multi-deck directed send isolation via SessionTransport test hub.
 */
describe('directed send targeting isolation', () => {
  beforeEach(() => {
    ensureTestSessionBackend();
    resetTestSessionHub();
  });

  afterEach(() => {
    resetTestSessionHub();
  });

  async function spawnReadyPresent(deck: Awaited<ReturnType<typeof createDeckSession>>) {
    const { sessionId, presentId } = await deck.spawnPresent();
    const received: unknown[] = [];
    const present = await createPresentSession(sessionId, presentId);
    present.onPresentPush((payload) => {
      received.push(payload);
    });
    return { presentId, received, present };
  }

  test('Deck A send-to-A1 does not show on A2 or any B Present', async () => {
    const deckA = await createDeckSession();
    const deckB = await createDeckSession();
    const a1 = await spawnReadyPresent(deckA);
    const a2 = await spawnReadyPresent(deckA);
    const b1 = await spawnReadyPresent(deckB);

    const payload = { slide: { title: 'only-a1' } };
    await deckA.send(payload, a1.presentId);

    expect(a1.received).toContainEqual(payload);
    expect(a2.received).not.toContainEqual(payload);
    expect(b1.received).not.toContainEqual(payload);
  });

  test('Deck A send-to-all-its-children does not show on B', async () => {
    const deckA = await createDeckSession();
    const deckB = await createDeckSession();
    const a1 = await spawnReadyPresent(deckA);
    const a2 = await spawnReadyPresent(deckA);
    const b1 = await spawnReadyPresent(deckB);

    const payload = { slide: { title: 'a-all' } };
    await deckA.send(payload, 'all');

    expect(a1.received).toContainEqual(payload);
    expect(a2.received).toContainEqual(payload);
    expect(b1.received).not.toContainEqual(payload);
  });

  test('Deck B cannot drive A children by guessing an id', async () => {
    const deckA = await createDeckSession();
    const deckB = await createDeckSession();
    const a1 = await spawnReadyPresent(deckA);
    const b1 = await spawnReadyPresent(deckB);

    const payload = { slide: { title: 'guess' } };
    await deckB.send(payload, a1.presentId);

    expect(a1.received).not.toContainEqual(payload);
    expect(b1.received).not.toContainEqual(payload);
  });

  test('missing target presentId sends to nobody', async () => {
    const deckA = await createDeckSession();
    const a1 = await spawnReadyPresent(deckA);
    const payload = { slide: { title: 'ghost' } };
    await deckA.send(payload, 'not-a-real-present-id');
    expect(a1.received).not.toContainEqual(payload);
  });
});
