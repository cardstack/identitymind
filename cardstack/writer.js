const PendingChange           = require('@cardstack/plugin-utils/pending-change');
const { kyc, docUpload }      = require('./im');
const { declareInjections }   = require('@cardstack/di');
const Session                 = require('@cardstack/plugin-utils/session');
const parseDataUri            = require('parse-data-uri');
const mime                    = require('mime-types');
const moment                  = require('moment');

const { mapKeys, camelCase, kebabCase }  = require('lodash');



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
      mappedAttributes.stage = 1;

      let { scanData, addressScanData, faceImageData } = mappedAttributes;

      delete mappedAttributes.scanData;
      delete mappedAttributes.addressScanData;
      delete mappedAttributes.faceImageData;

      let userData = (await this.searcher.getFromControllingBranch(Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id)).data;

      mappedAttributes.tea = userData.attributes[this.config.emailField];

      let kycResult = await kyc(mappedAttributes, this.config);

      let newAttributes = mapKeys(kycResult, (v, k) => kebabCase(k));

      let id = newAttributes.tid;
      delete newAttributes.tid;

      newAttributes['last-checked-at'] = moment().format();

      this._uploadDataUriFile(scanData, "Scan Data", id);
      this._uploadDataUriFile(addressScanData, "Address Scan Data", id);
      this._uploadDataUriFile(faceImageData, "Face Image Data", id);

      userData.attributes[this.config.kycField] = id;
      await this.writer.update(this.searcher.controllingBranch.name, Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id, userData);
      await this.indexer.update({ forceRefresh: true });

      pendingChange.finalDocument = {
        type: 'identitymind-verifications',
        id,
        attributes: newAttributes
      };
    };

    let change = new PendingChange(null, document, finalizer);
    return change;
  }

  async _uploadDataUriFile(dataUri, description, transactionId) {
    if (dataUri) {
      let parsed = parseDataUri(dataUri);
      let file = {
        value: parsed.data,
        options: { filename: `${description}.${mime.extension(parsed.mimeType)}`, contentType: parsed.mimeType }
      };

      await docUpload(transactionId, { file, description }, this.config);
    }
  }
});
