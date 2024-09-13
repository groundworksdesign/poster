export const connect = () => {
  const socket = new BroadcastChannel('presentation');
  return socket;
};
