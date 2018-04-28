const PendingChange           = require('@cardstack/plugin-utils/pending-change');
const { kyc, docUpload }      = require('./im');
const { declareInjections }   = require('@cardstack/di');
const Session                 = require('@cardstack/plugin-utils/session');
const { mapKeys, camelCase }  = require('lodash');
const parseDataUri            = require('parse-data-uri');
const mime                    = require('mime-types');



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

      let { scanData, backsideImageData, faceImageData } = mappedAttributes;

      delete mappedAttributes.scanData;
      delete mappedAttributes.backsideImageData;
      delete mappedAttributes.faceImageData;

      let kycResult = await kyc(mappedAttributes, this.config);

      if (kycResult.res === "MANUAL_REVIEW" || (
            kycResult.res == "DENY" &&
            !['Sanctions', 'Blacklist'].includes(kycResult.ednaScoreCard.er.reportedRule.name)
          )
        )
      {
        // for manual review, we need to resubmit with the base64 data included
        mappedAttributes.scanData           = scanData;
        mappedAttributes.backsideImageData  = backsideImageData;
        mappedAttributes.faceImageData      = faceImageData;
        mappedAttributes.stage              = 2;

        kycResult = await kyc(mappedAttributes, this.config);
      }

      let newAttributes = Object.assign({}, kycResult);

      let id = newAttributes.tid;
      delete newAttributes.tid;

      this._uploadDataUriFile(scanData, "Scan Data", id);
      this._uploadDataUriFile(backsideImageData, "Backside Image Data", id);
      this._uploadDataUriFile(faceImageData, "Face Image Data", id);


      let userData = (await this.searcher.getFromControllingBranch(Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id)).data;
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
