import { helper } from '@ember/component/helper';
import $ from "jquery";
import { hubURL } from '@cardstack/plugin-utils/environment';

export function identitymindPdfUrl(params, hash) {
  return `${hubURL}/identitymind/bcs-pdf?${$.param(hash)}`;
}

export default helper(identitymindPdfUrl);
