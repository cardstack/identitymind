// eslint-disable-next-line node/no-extraneous-require
const chai = require("chai");

chai.use(require("chai-as-promised"));
chai.use(require('chai-moment'));
chai.use(require('sinon-chai'));

require('@cardstack/test-support/node-test-runner')();
