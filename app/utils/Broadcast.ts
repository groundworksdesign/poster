// Browser-friendly Broadcast wrapper
export enum ChannelType {
  BUILDER,
  PRESENTER,
}

export type Connection = {
  id: string;
  channel: BroadcastChannel;
  channelType: ChannelType;
};

type PingEvent = {
  id: string;
  originId: string;
};

export type BroadcastEvent = {
  id: string;
  message?: string;
  data?: any;
};

export const connect = (
  channelType: ChannelType,
  eventHandler: (event: MessageEvent) => void,
): Connection => {
  const channel = new BroadcastChannel('presentation');
  const id =
    typeof (globalThis as any).crypto !== 'undefined' &&
    typeof (globalThis as any).crypto.randomUUID === 'function'
      ? (globalThis as any).crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const connection: Connection = {
    id,
    channel,
    channelType,
  } as Connection;

  channel.onmessage = e => {
    const ping = e.data as PingEvent;
    if (ping && (ping as any).originId !== connection.id) {
      console.log(`(${connection.id}) Ping: `, ping);
    }

    eventHandler(e);
  };

  // announce ourselves
  channel.postMessage({ id: connection.id, originId: connection.id } as PingEvent);

  return connection;
};
