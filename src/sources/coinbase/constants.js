export const COINBASE_FIX_HOST = 'fix.pro.coinbase.com';

export const COINBASE_FIX_ACCESS = [
  {
    KEY: process.env.COINBASE_KEY,
    PASSPHRASE: process.env.COINBASE_PASSPHRASE,
    SECRET: process.env.COINBASE_SECRET
  },
  {
    KEY: process.env.COINBASE_KEY2,
    PASSPHRASE: process.env.COINBASE_PASSPHRASE2,
    SECRET: process.env.COINBASE_SECRET2
  }
];
