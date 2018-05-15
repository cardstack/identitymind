import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import layout from '../templates/components/kyc-form';
import { Promise } from "rsvp";
import Ember from 'ember';
import { set } from '@ember/object';

const { testing } = Ember;

const fields = {
  bfn: {
    name: "First Name",
    hint: "User's first name",
    required: true
  },
  bln: {
    name: "Last Name",
    hint: "User's last name",
    required: true
  },
  tea: {
    name: "Email Address",
    hint: "User's email address",
    type: "email",
    required: true
  },
  dob: {
    name: "Date of Birth",
    hint: "User's date of birth",
    instructions: "Please enter date in the <span class=\"hot-pink\">Month/Day/Year format</span>. E.g., if your birthday is February 5, 1980, enter 02/05/1980, and NOT 05/02/1980.",
    type: "date",
    required: true
  },
  sco: {
    name: "Country of Citizenship",
    hint: "Country of which user is a citizen",
    type: 'country',
    required: true
  },
  bsn: {
    name: "Residential Address",
    hint: "User's street address, including house number, street name, and apartment number",
    required: true
  },
  bc: {
    name: "City",
    hint: "User's city",
    required: true
  },
  bs: {
    name: "State / Province",
    hint: "User's state or province, use official postal state/region abbreviations whenever possible (e.g. CA for California)."
  },
  bz: {
    name: "Zip Code",
    hint: "User's zip code"
  },
  bco: {
    name: "Country",
    hint: "User's current country of residence",
    type: 'country',
    required: true
  }
};

const docUploadFields = {
  scanData: {
    name: 'Passport Scan',
    hint: "Scan of state-issued passport",
    instructions: "Please upload a photograph or scanned image of a state-issued, <span class=\"hot-pink\">international passport</span> or a <span class=\"hot-pink\">national Schengen ID</span> (if you use a Schengen ID, you need to include both <span class=\"hot-pink\">front and back</span> in your file). Make sure your image is clear and detailed; low-quality images will be rejected. The file size limit for uploads is 4 MB.",
    type: "file",
    required: true
  },
  addressScanData: {
    name: "Proof of Address",
    hint: "Scan of utility bill",
    instructions: "Please upload a photograph or scanned image of a document within the last 3 months that lists your name and residential address. Acceptable documents include bank statements, utility bills, ID, or a household registration. Documents should be in a <span class=\"hot-pink\">Latin alphabet</span>. If not, please attach a translation certified by a <span class=\"hot-pink\">notarized translation agency</span>. Self-translations will not be accepted. Make sure your image is clear and detailed; low-quality images will be rejected.",
    type: "file",
    required: true
  },
  faceImageData: {
    name: "Face Image",
    hint: "Picture of user's face with identity document in frame",
    type: "file",
    required: true
  }
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export default Component.extend({
  classNames: ['kyc-form'],
  store:  service(),
  router: service(),
  cardstackSession: service(),

  layout,
  fields,
  docUploadFields,
  didValidate: false,
  postSubmit: null,
  hasValidationErrors: null,

  defaultFirstName: null,
  defaultLastName: null,
  defaultEmail: null,

  submitKyc: task(function * () {
    let model = this.get('model');

    let { validations } = yield model.validate();

    this.set('didValidate', true);

    if (validations.get('isValid')) {
      this.set('submittingKyc', true);

      model.set('user', this.get('cardstackSession.user'));
      model.set('man', `${model.get('bfn')} ${model.get('bln')}`);
      let willSaveModel = this.get('willSaveModel');

      if (typeof willSaveModel === 'function') {
        yield willSaveModel(model);
      }

      try {
        yield model.save();

        let postSubmit = this.get('postSubmit');

        if (typeof postSubmit === 'function') {
          postSubmit();
        }
      } catch(err) {
        let hasNetworkError = this.get('hasNetworkError');

        if (typeof hasNetworkError === 'function') {
          hasNetworkError(err);
        }
      } finally {
        this.set('submittingKyc', false);
      }
    } else {
      let hasValidationErrors = this.get('hasValidationErrors');

      if (typeof hasValidationErrors === 'function') {
        hasValidationErrors();
      }
    }
  }).drop(),

  assignFile: task(function * (field, event) {
    let file = testing ? event.detail.testingFiles[0] : event.target.files[0];
    if (!file) { return; }

    this.set(`model.${field}FileSize`, file.size);
    if (file.size <= MAX_FILE_SIZE) this.set(`model.${field}FileName`, file.name);

    if (this.get(`model.validations.attrs.${field}.isValid`)) {
      let reader  = new FileReader();

      let dataUri = yield new Promise(resolve => {
        reader.addEventListener("load", function () {
          resolve(reader.result);
        }, false);
        reader.readAsDataURL(file);
      })

      this.set(`model.${field}`, dataUri);
    }
  }),

  init() {
    this.model = this.get('store').createRecord('identitymind-verification');

    let defaultEmail = this.get('defaultEmail');

    this.model.setProperties({
      bfn: this.get('defaultFirstName'),
      bln: this.get('defaultLastName'),
      tea: defaultEmail
    });

    let emailField = this.get('fields.tea');

    set(emailField, 'disabled', !!defaultEmail);

    this._super(...arguments);
  }
});
