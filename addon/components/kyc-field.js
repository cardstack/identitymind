import {
  not,
  notEmpty,
  and,
  or,
  readOnly,
  alias
} from '@ember/object/computed';

import Component from '@ember/component';
import { defineProperty } from '@ember/object';
import { getNames } from 'ember-i18n-iso-countries';

export default Component.extend({
  classNames: ['kyc-field'],
  classNameBindings: ['showErrorClass:has-error', 'isValid:has-success'],
  model: null,
  value: null,
  type: 'text',
  field: '',
  validation: null,
  showValidations: false,
  didValidate: false,
  countries: getNames('en'),

  notValidating: not('validation.isValidating').readOnly(),
  hasContent: notEmpty('value').readOnly(),
  hasWarnings: notEmpty('validation.warnings').readOnly(),
  isValid: and('hasContent', 'validation.isTruelyValid').readOnly(),
  shouldDisplayValidations: or(
    'showValidations',
    'didValidate',
    'hasContent'
  ).readOnly(),

  showErrorClass: and(
    'notValidating',
    'showErrorMessage',
    'validation'
  ).readOnly(),
  showErrorMessage: and(
    'shouldDisplayValidations',
    'validation.isInvalid'
  ).readOnly(),
  showWarningMessage: and(
    'shouldDisplayValidations',
    'hasWarnings',
    'isValid'
  ).readOnly(),

  init() {
    this._super(...arguments);
    let field = this.get('field');

    defineProperty(
      this,
      'validation',
      readOnly(`model.validations.attrs.${field}`)
    );
    defineProperty(this, 'value', alias(`model.${field}`));
  },

  focusOut() {
    this._super(...arguments);
    this.set('showValidations', true);
  }
});