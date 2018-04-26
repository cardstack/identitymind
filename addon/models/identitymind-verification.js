import IdentitymindVerification from "@cardstack/models/generated/identitymind-verification";
import { validator, buildValidations } from 'ember-cp-validations';

const Validations = buildValidations({
  bfn: validator('presence', true),
  bln: validator('presence', true),
  tea: [
    validator('presence', true),
    validator('format', { type: 'email' })
  ],
  dob: validator('presence', true),
  sco: validator('presence', true),
  bsn: validator('presence', true),
  bc: validator('presence', true),
  bco: validator('presence', true),
  scanData: validator('presence', true),
  backsideImageData: validator('presence', true),
  faceImageData: validator('presence', true)
});

export default IdentitymindVerification.extend(Validations, {
});