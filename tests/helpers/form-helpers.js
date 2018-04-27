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
  backsideImageData: ''
};

export function uploadFile(selector) {
  let file = new Blob(['text-image'], {type : 'text/plain'});
  file.name = 'test.txt';

  find(selector).dispatchEvent(new CustomEvent('change', { detail: { testingFiles: [file] } }));
}

export async function fillInKycField(field) {
  await fillIn(`#kyc-field_${field}`, validInputValues[field]);
}
