import KycField from './kyc-field';
import layout from '../templates/components/file-input';

export default KycField.extend({
  classNames: ['doc-upload'],
  tagName: 'fieldset',
  layout
});