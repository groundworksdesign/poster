import { UUID } from 'crypto';

export enum ChannelType {
  BUILDER,
  PRESENTER,
}

export type Connection = {
  id: UUID;
  channel: BroadcastChannel;
  channelType: ChannelType;
};

type PingEvent = {
  id: UUID;
  originId: UUID;
};

export type BroadcastEvent = {
  id: UUID;
  message: string;
  data?: any;
};

export const connect: (
  channelType: ChannelType,
  eventHandler: (event: MessageEvent) => void,
) => Connection = (
  channelType: ChannelType,
  eventHandler: (event: MessageEvent) => void,
) => {
  const channel = new BroadcastChannel('presentation');
  const connection = {
    id: crypto.randomUUID(),
    channel: channel,
    channelType: channelType,
  } as Connection;

  channel.onmessage = e => {
    const ping = e.data as PingEvent;
    if (ping && ping.originId !== connection.id) {
      console.log(`(${connection.id}) Ping: `, ping);
      // channel.postMessage({
      //   id: connection.id,
      //   originId: ping.id,
      // } as PingEvent);
    }

    eventHandler(e);
  };

  channel.postMessage({
    id: connection.id,
    originId: connection.id,
  } as PingEvent);

  return connection;
};
