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

    let finalizer = async (pendingChange) => {
      let attributes = pendingChange.finalDocument.attributes;
      let kycResult = await kyc(attributes, this.config);
      let newAttributes = Object.assign({}, attributes);
      Object.assign(newAttributes, kycResult);

      let id = newAttributes.tid;
      delete newAttributes.tid;

      pendingChange.finalDocument = {
        type: 'identitymind-verifications',
        id,
        attributes: newAttributes
      };
    };

    let change = new PendingChange(null, document, finalizer);
    return change;
  }
};
