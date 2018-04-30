export default function() {
  this.passthrough();
}

export function testConfig() {
  this.urlPrefix = 'http://localhost:3000';    // make this `http://localhost:8080`, for example, if your API is on a different server
  this.namespace = '/api';    // make this `/api`, for example, if your API is namespaced
}
