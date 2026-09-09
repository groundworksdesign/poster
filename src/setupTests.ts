// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

class BroadcastChannelStub {
  static channels = new Map<string, Set<BroadcastChannelStub>>();

  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    const set = BroadcastChannelStub.channels.get(name) ?? new Set();
    set.add(this);
    BroadcastChannelStub.channels.set(name, set);
  }

  postMessage(message: any) {
    const recipients = BroadcastChannelStub.channels.get(this.name) ?? new Set();
    for (const channel of recipients) {
      if (channel !== this) {
        channel.onmessage?.({ data: message } as MessageEvent);
      }
    }
  }

  close() {
    const set = BroadcastChannelStub.channels.get(this.name);
    set?.delete(this);
    if (set && set.size === 0) {
      BroadcastChannelStub.channels.delete(this.name);
    }
  }
}

if (typeof globalThis.BroadcastChannel === 'undefined') {
  (globalThis as any).BroadcastChannel = BroadcastChannelStub;
}
