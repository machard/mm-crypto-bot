import SyncedTransformedStream from '../../lib/SyncedTransformedStream';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import num from 'num';
import _ from 'lodash';
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

const min = (n1, n2) => n1.lt(n2) ? n1 : n2;

export default class InvestValue extends SyncedTransformedStream {

  constructor(middle, conf, { sheetId, range }) {
    super('maxinvestvalue', new CachedBatchedZippedStream('investvalue', middle, conf));

    this.sheetId = sheetId;
    this.range = range;
  }

  name() {
    return 'maxinvestvalue';
  }

  makeCompute(entries, conf) {
    const maxPrecision = min(conf.priceIncrement, conf.minSize)._precision;

    const compute = _.reduce(this.entries, (result, value) => {
      const entry = {
        money: num(value[0]).set_precision(maxPrecision),
        middle: num(value[1]).set_precision(maxPrecision)
      };
      const initialBasePart = (entry.money.div(2)).div(entry.middle);
      const initialQuotePart = entry.money.div(2);

      return {
        initialBasePart: result.initialBasePart.add(initialBasePart),
        initialQuotePart: result.initialQuotePart.add(initialQuotePart)
      };
    }, { initialQuotePart: num(0), initialBasePart: num(0)});

    return {
      initialQuotePart: compute.initialQuotePart.set_precision(conf.priceIncrement._precision),
      initialBasePart: compute.initialBasePart.set_precision(conf.minSize._precision - 1)
    };
  }

  processMessage(state, [middle, conf]) {
    this.compute = this.compute || this.makeCompute(this.entries, conf);

    return {
      middleBaseBalance: this.compute.initialBasePart,
      reservedQuote: this.compute.initialQuotePart.add(conf.additionalQuoteAvailable),
      maxInvestValue: conf.maxInvestValue ||
        min(
          this.compute.initialBasePart,
          (
            (this.compute.initialQuotePart.add(conf.additionalQuoteAvailable)).set_precision(conf.minSize._precision - 1)
          ).div(middle)
        )
    };
  }

  getSyncData(callback) {
    google.sheets('v4').spreadsheets.values.get({
      auth: oauth2Client,
      spreadsheetId: this.sheetId,
      range: this.range,
      valueRenderOption: 'UNFORMATTED_VALUE'
    }, (err, entries) => {
      if (err)
        return callback(err);

      this.compute = null;
      this.entries = entries.values;

      callback();
    });
  }

  getSyncState() {
    return null;
  }

  getReplayDatas(_, queue) {
    return queue;
  }
};
