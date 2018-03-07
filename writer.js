const PendingChange = require('@cardstack/plugin-utils/pending-change');
const { kyc } = require('./im');

module.exports = class Writer {
  static create(params) {
    return new this(params);
  }
  constructor({ dataSource, config }) {
    this.dataSource   = dataSource;
    this.config       = config;
  }

  async prepareCreate(branch, session, type, document /*, isSchema */) {
    let kycResult = await kyc(document.attributes, this.config);

    let newAttributes = Object.assign({}, document.attributes);
    Object.assign(newAttributes, kycResult);

    let id = newAttributes.tid;
    delete newAttributes.tid;

    let finalDocument = {
      type: 'identitymind-verifications',
      id,
      attributes: newAttributes
    };

    let change = new PendingChange(null, finalDocument);
    return change;
  }
};
