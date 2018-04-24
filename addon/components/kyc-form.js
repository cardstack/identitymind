import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import { task } from "ember-concurrency";
import layout from '../templates/components/kyc-form';
import { getNames } from 'ember-i18n-iso-countries';
import { Promise } from "rsvp";

const fields = {
  bfn: {
    name: "First Name",
    hint: "User's First Name"
  },
  bln: {
    name: "Last Name",
    hint: "User's Last Name"
  },
  tea: {
    name: "Email Address",
    hint: "Email address of user",
    type: "email"
  },
  dob: {
    name: "Date of Birth",
    hint: "User's date of birth",
    type: "date"
  },
  sco: {
    name: "Country of Citizenship",
    hint: "Country of which User is a citizen",
    type: 'country'
  },
  bsn: {
    name: "Address",
    hint: "User's street address, including house number, street name, and apartment number"
  },
  bz: {
    name: "Zip Code",
    hint: "User's Zip Code"
  },
  bc: {
    name: "City",
    hint: "User's City"
  },
  bs: {
    name: "State / Province",
    hint: "User's state or province, use official postal state/region abbreviations whenever possible (e.g. CA for California)."
  },
  bco: {
    name: "Country",
    hint: "User's current country of residence",
    type: 'country'
  }
};

const docUploadFields = {
  scanData: {
    name: 'Document Scan Front',
    hint: "Scan of front side of identity document",
    type: "file"
  },
  backsideImageData: {
    name: "Document Scan Back",
    hint: "Scan of back side of identity document",
    type: "file"
  },
  faceImageData: {
    name: "Face Image",
    hint: "Picture of user's face with identity document in frame",
    type: "file"
  }
};

export default Component.extend({
  classNames: ['kyc-form'],
  store:  service(),
  router: service(),
  cardstackSession: service(),

  layout,
  fields,
  docUploadFields,

  countries: getNames('en'),

  submitKyc: task(function * () {
    let values = this.get('values');

    values.man = `${get(values, 'bfn')} ${get(values, 'bln')}`;
    values.user = this.get('cardstackSession.user');

    let record = this.get('store').createRecord('identitymind-verification', values);
    yield record.save();

    yield this.get('cardstackSession.user').reload();

    yield this.get('router').transitionTo('dashboard');
  }).drop(),

  assignFile: task(function * (field, event) {
    let file    = event.target.files[0];
    let reader  = new FileReader();

    let dataUri = yield new Promise(resolve => {
      reader.addEventListener("load", function () {
        resolve(reader.result);
      }, false);
      reader.readAsDataURL(file);
    })

    this.set(`values.${field}`, dataUri);
  }),

  init() {
    this.values = {};
    this._super(...arguments);
  }
});
