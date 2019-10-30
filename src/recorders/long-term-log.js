import google from 'googleapis';
import GoogleAuth from 'google-auth-library';
var debug = require('debug')('logrecorder-longterm');

const auth = new GoogleAuth();
const oauth2Client = new auth.OAuth2(
  '744145660122-jhn286m5etdgp6bgcuc4khmvsmdb5kbd.apps.googleusercontent.com',
  'ocGLetytUlyrKH2Qb3M5DfBK',
  'urn:ietf:wg:oauth:2.0:oob'
);
oauth2Client.credentials = {
  access_token: 'ya29.GlsABUcxQE_s3fFZ8Guc3fCmJZ1Fks2yT-qUwoh4Kan5CTH7elfy3SOz_XbH9roq0SYeMpX9hePY68w9cKAZGomD4Bv4ysaewuatbo26GwDMQa8FYdI-0tm4rDlx',
  refresh_token: '1/M0tbrC5TyQrILN_8JqUt_nx9kyLxb5scC4fyGHv9LKk',
  token_type: 'Bearer',
  expiry_date: 1510313683315
};

class LogRecorder {

  constructor(sheetId, range) {
    this.sheetId = sheetId;
    this.range = range;

    setInterval(() => this.send(), 5000);
  }

  buffer = [];

  send() {
    if (!this.buffer.length)
      return;

    const saving = this.buffer;
    this.buffer = [];

    google.sheets('v4').spreadsheets.values.append({
      auth: oauth2Client,
      spreadsheetId: this.sheetId,
      range: this.range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: saving
      }
    }, (err) => {
      console.log('google sheet cb', err);
      // avoid overflow...
      if (err && saving.length < 100)
        this.buffer = [...saving, ...this.buffer];
    });
  }

  log(item) {
    if (!process.env.SAVE_TO_GOOGLESHEET)
      return console.log('save google local', item);

    var ts = Date.now();

    this.buffer.push([ts, ...JSON.parse(JSON.stringify(item))]);
  }
}

const { sheetId, range } = JSON.parse(process.argv[2]);

const recorder = new LogRecorder(sheetId, range);

process.on('message', ({ data }) => data && recorder.log(data));

const keepAlive = () => {
  setTimeout(keepAlive, 5000);
};
keepAlive();
