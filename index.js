/* eslint-env node */
'use strict';

module.exports = {
  name: '@cardstack/identitymind',
  isDevelopingAddon() {
    return process.env.CARDSTACK_DEV;
  }
};
