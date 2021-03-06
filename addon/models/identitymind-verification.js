import IdentitymindVerification from "@cardstack/models/generated/identitymind-verification";
import { validator, buildValidations } from 'ember-cp-validations';
import { inject as service } from "@ember/service";
import { hubURL } from '@cardstack/plugin-utils/environment';

const Validations = buildValidations({
  bfn: validator('presence', true),
  bln: validator('presence', true),
  tea: [
    validator('presence', true),
    validator('format', {
      type: 'email',
      debounce: 500
   })
  ],
  dob: validator('presence', true),
  sco: validator('presence', true),
  bsn: validator('presence', true),
  bc: validator('presence', true),
  bco: validator('presence', true),
  scanData: validator('file-size', {
    maxInMb: 4,
    notPresentMessage: 'This document is required'
  }),
  addressScanData: validator('file-size', {
    maxInMb: 4,
    notPresentMessage: 'This document is required'
  }),
  faceImageData: validator('file-size', {
    maxInMb: 4,
    notPresentMessage: 'This document is required'
  })
  
});

export default IdentitymindVerification.extend(Validations, {
  ajax: service(),

  uploadFormA(file, filename, token) {
    let formData = new FormData;
    formData.append('file', file, filename);

    return this.get('ajax').request(`${hubURL}/identitymind/document-uploads`, {
      type:         'POST',
      data:         formData,
      processData:  false,
      contentType:  false,
      headers:      {"Authorization": `Bearer ${token}`}
    });

  }
});