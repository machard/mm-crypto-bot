export const BLINKTRADE_WS_URL = 'wss://ws.blinktrade.com/trade/';
export const BLINKTRADE_KEY_NO_NOTIFS = process.env.BLINKTRADE_KEY_NO_NOTIFS;
export const BLINKTRADE_SECRET_NO_NOTIFS = process.env.BLINKTRADE_SECRET_NO_NOTIFS;

export const BLINKTRADE_FIX_ACCESS = {
  'BTCVND-0': {
    brokerId: 3,
    username: process.env.BLINKTRADE_KEY,
    password: process.env.BLINKTRADE_PASSPHRASE
  },
  'BTCVND-1': {
    brokerId: 3,
    username: process.env.BLINKTRADE_KEY_NO_NOTIFS,
    password: process.env.BLINKTRADE_PASSPHRASE_NO_NOTIFS
  },
  'BTCVND-2': {
    brokerId: 3,
    username: process.env.BLINKTRADE_KEY_NO_NOTIFS,
    password: process.env.BLINKTRADE_PASSPHRASE_NO_NOTIFS
  },
  'BTCVND-3': {
    brokerId: 3,
    username: process.env.BLINKTRADE_KEY_NO_NOTIFS,
    password: process.env.BLINKTRADE_PASSPHRASE_NO_NOTIFS
  }
};
