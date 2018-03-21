// eslint-disable-next-line node/no-extraneous-require
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");


chai.use(chaiAsPromised);

require('@cardstack/test-support/node-test-runner')();
