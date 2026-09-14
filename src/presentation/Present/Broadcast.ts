/**
 * @deprecated Slide payloads no longer use BroadcastChannel. Use SessionTransport.
 */
export enum ChannelType {
  BUILDER,
  PRESENTER,
}

export type Connection = {
  id: string;
  channel: { postMessage: (msg: unknown) => void };
  channelType: ChannelType;
};

export const connect = (): Connection => {
  throw new Error(
    'BroadcastChannel transport removed; use createDeckSession/createPresentSession from SessionTransport',
  );
};
