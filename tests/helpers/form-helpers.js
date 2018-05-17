import { find, fillIn } from '@ember/test-helpers';

const validInputValues = {
  bfn: 'Bill',
  bln: 'Wagby',
  bco: 'GB',
  sco: 'SO',
  tea: 'bill@wagby.net',
  dob: '1999-01-01',
  bsn: '145 Penny Lane',
  bz: '10901',
  bc: 'Harpers Ferry',
  bs: 'NY',
  scanData: '',
  faceImageData: '',
  addressScanData: ''
};

export function uploadFile(selector) {
  let file = new Blob(["a".repeat(500000)], {type : 'text/plain'});
  file.name = 'test.txt';

  find(selector).dispatchEvent(new CustomEvent('change', { detail: { testingFiles: [file] } }));
}

export async function fillInKycField(field) {
  await fillIn(`#kyc-field_${field}`, validInputValues[field]);
}

export async function fillInRequiredFields() {
  await fillInKycField('bfn');
  await fillInKycField('bln');
  await fillInKycField('tea');
  await fillInKycField('bsn');
  await fillInKycField('bz');
  await fillInKycField('bc');
  await fillInKycField('bs');
  await fillInKycField('bco');
  await fillInKycField('sco');
  await fillInKycField('dob');

  uploadFile('#kyc-field_scanData');
  uploadFile('#kyc-field_addressScanData');
  uploadFile('#kyc-field_faceImageData');
}
