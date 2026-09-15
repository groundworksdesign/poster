import { notifyLibraryChanged, subscribeLibraryChanged, LIBRARY_REFRESH_CHANNEL } from './libraryRefresh';

class FakeBroadcastChannel {
  static channels: Record<string, FakeBroadcastChannel[]> = {};
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.channels[name] = FakeBroadcastChannel.channels[name] || [];
    FakeBroadcastChannel.channels[name].push(this);
  }

  postMessage(data: unknown) {
    (FakeBroadcastChannel.channels[this.name] || []).forEach(ch => {
      if (ch.onmessage) ch.onmessage({ data } as MessageEvent);
    });
  }

  close() {
    FakeBroadcastChannel.channels[this.name] = (FakeBroadcastChannel.channels[this.name] || []).filter(
      ch => ch !== this,
    );
  }
}

beforeEach(() => {
  (global as any).BroadcastChannel = FakeBroadcastChannel;
  FakeBroadcastChannel.channels = {};
  localStorage.clear();
});

afterEach(() => {
  delete (global as any).BroadcastChannel;
  FakeBroadcastChannel.channels = {};
});

test('notifyLibraryChanged invokes same-tab subscribers without reload', () => {
  const onRefresh = jest.fn();
  const unsubscribe = subscribeLibraryChanged(onRefresh);
  notifyLibraryChanged();
  expect(onRefresh).toHaveBeenCalledTimes(1);
  unsubscribe();
});

test('notifyLibraryChanged reaches subscribers on another BroadcastChannel instance', () => {
  const onRefresh = jest.fn();
  const unsubscribe = subscribeLibraryChanged(onRefresh);
  const remote = new FakeBroadcastChannel(LIBRARY_REFRESH_CHANNEL);
  remote.postMessage({ type: 'library-changed', ts: Date.now() });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  unsubscribe();
});
