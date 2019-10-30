import Source from './Source';
import num from 'num';
import _ from 'lodash'
import google from 'googleapis';
import GoogleAuth from 'google-auth-library';

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

export default class Conf extends Source {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(params, ticker) {
    super('conf', ticker);

    this.params = params;
    this._ticker = ticker;

    this.resync();
  }

  resync() {
    if (this.resyncing)
      return;

    this.lag(true);
    this.resyncing = true;

    google.sheets('v4').spreadsheets.values.get({
      auth: oauth2Client,
      spreadsheetId: this.params.sheetId,
      range: this.params.range,
      valueRenderOption: 'UNFORMATTED_VALUE'
    }, (err, entries) => {
      this.resyncing = false;

      if (err)
        return setTimeout(() => this.resync(), 1000);

      this.lag(false);

      const conf = _.reduce(entries.values, (conf, value) => ({
        ...conf,
        [`${value[0]}`]: num(value[1])
      }), {});

      console.log('new conf', conf);

      this.write(conf);
      this._ticker.tick();
    });
  }
}
