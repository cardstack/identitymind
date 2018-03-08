const { kycRetrieve } = require('./im');


module.exports = class IdentitymindSearcher {
  static create(...args) {
    return new this(...args);
  }
  constructor({ dataSource, config }) {
    this.config       = config;
    this.dataSource   = dataSource;
  }

  async get(session, branch, type, id, next) {
    if (type === 'identitymind-verifications') {
      let data = await this._getVerification(id);
      return { data };
    }
    return next();
  }

  async search(session, branch, query, next) {
    return next();
  }

  async _getVerification(id) {
    let attributes = await kycRetrieve(id, this.config);

    return {
      type: 'identitymind-verifications',
      id,
      attributes
    };
  }


};
