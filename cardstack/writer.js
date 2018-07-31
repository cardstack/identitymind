const PendingChange           = require('@cardstack/plugin-utils/pending-change');
const { kyc }                 = require('./im');
const { declareInjections }   = require('@cardstack/di');
const Session                 = require('@cardstack/plugin-utils/session');
const parseDataUri            = require('parse-data-uri');
const mime                    = require('mime-types');
const moment                  = require('moment');
const { s3Upload }            = require('./s3');
const Pdf                     = require('./pdf');
const { countries }           = require('country-data');

const { mapKeys, camelCase, kebabCase }  = require('lodash');



module.exports = declareInjections({
  searcher:           'hub:searchers',
  writer:             'hub:writers',
},

class Writer {
  static create(params) {
    return new this(params);
  }
  constructor({ dataSource, config, searcher, writer }) {
    this.dataSource         = dataSource;
    this.config             = config;
    this.searcher           = searcher;
    this.writer             = writer;
  }

  async prepareCreate(branch, session, type, document /*, isSchema */) {
    let finalizer = async (pendingChange) => {
      let { attributes, relationships } = pendingChange.finalDocument;

      let mappedAttributes = mapKeys(attributes, (v, k) => camelCase(k));
      mappedAttributes.stage = 1;

      let { scanData, addressScanData, faceImageData } = mappedAttributes;

      delete mappedAttributes.addressScanData;
      delete mappedAttributes.faceImageData;


      let userData = (await this.searcher.getFromControllingBranch(Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id)).data;

      mappedAttributes.tea = userData.attributes[this.config.emailField];

      if (session.meta && session.meta.ip) {
        mappedAttributes.ip = session.meta.ip;
      }

      if (mappedAttributes.scanData) {
        mappedAttributes.docType = "PP";
        mappedAttributes.docCountry = mappedAttributes.sco;
      }

      let kycResult = await kyc(mappedAttributes, this.config);

      let newAttributes = mapKeys(kycResult, (v, k) => kebabCase(k));

      let id = newAttributes.tid;
      delete newAttributes.tid;

      newAttributes['last-checked-at'] = moment().format();

      await this._uploadDataUriFile(scanData, "Scan Data", id);
      await this._uploadDataUriFile(addressScanData, "Address Scan Data", id);
      await this._uploadDataUriFile(faceImageData, "Face Image Data", id);

      await this._uploadBlankFormA(id, mappedAttributes);

      userData.attributes[this.config.kycField] = id;
      await this.writer.update(this.searcher.controllingBranch.name, Session.INTERNAL_PRIVILEGED, this.config.userModel, session.id, { data: userData });

      pendingChange.finalDocument = {
        type: 'identitymind-verifications',
        id,
        attributes: newAttributes,
        relationships
      };
    };

    let change = new PendingChange(null, document, finalizer);
    return change;
  }

  async _uploadDataUriFile(dataUri, description, transactionId) {
    if (dataUri) {
      let parsed = parseDataUri(dataUri);
      let key = `${transactionId}/${description}.${mime.extension(parsed.mimeType)}`;

      await s3Upload(key, Buffer.from(parsed.data));
    }
  }

  async _uploadBlankFormA(transactionId, kycData) {

    let address = 'bsn bc bs bz'.split(' ')
      .map(f => kycData[f])
      .filter(f => f && f.length > 0)
      .join(", ");

    let data = {
      name:         kycData.bfn,
      surname:      kycData.bln,
      dob:          moment(kycData.dob).format("Do MMMM YYYY"),
      nationality:  countryName(kycData.sco),
      address:      address,
      country:      countryName(kycData.bco)
    };

    let pdf = new Pdf(data);

    let key = `${transactionId}/FormA-${transactionId} (Blank).pdf`;
    await s3Upload(key, pdf.toStream());
  }

});

function countryName(iso2Code) {
  let data = countries[iso2Code];
  return data && data.name;
}
