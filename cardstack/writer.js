const PendingChange           = require('@cardstack/plugin-utils/pending-change');
const { kyc }                 = require('./im');
const { declareInjections }   = require('@cardstack/di');
const Session                 = require('@cardstack/plugin-utils/session');
const { mapKeys, camelCase }  = require('lodash');

module.exports = declareInjections({
  searcher:           'hub:searchers',
  writer:             'hub:writers',
  indexer:            'hub:indexers'
},

class Writer {
  static create(params) {
    return new this(params);
  }
  constructor({ dataSource, config, searcher, writer, indexer }) {
    this.dataSource         = dataSource;
    this.config             = config;
    this.searcher           = searcher;
    this.writer             = writer;
    this.indexer            = indexer;
  }

  async prepareCreate(branch, session, type, document /*, isSchema */) {
    let finalizer = async (pendingChange) => {
      let { attributes } = pendingChange.finalDocument;

      let mappedAttributes = mapKeys(attributes, (v, k) => camelCase(k));

      let kycResult = await kyc(mappedAttributes, this.config);
      let newAttributes = Object.assign({}, attributes);
      Object.assign(newAttributes, kycResult);

      let id = newAttributes.tid;
      delete newAttributes.tid;

      let userData = (await this.searcher.getFromControllingBranch(Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id)).data;
      userData.attributes[this.config.kycField] = id;
      await this.writer.update(this.searcher.controllingBranch.name, Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id, userData);
      await this.indexer.update({ realTime: true });

      pendingChange.finalDocument = {
        type: 'identitymind-verifications',
        id,
        attributes: newAttributes
      };
    };

    let change = new PendingChange(null, document, finalizer);
    return change;
  }
});
