export default function testConfig() {
  this.urlPrefix = 'http://localhost:3000';    // make this `http://localhost:8080`, for example, if your API is on a different server
  this.namespace = '/api';    // make this `/api`, for example, if your API is namespaced
  // this.timing = 400;      // delay for each request, automatically set to 0 during testing

  this.post('/identitymind-verifications', () => {
    return {
      "data": {
        "id": "89275686",
        "type": "identitymind-verifications",
        "attributes": {
          "man": "Bill Wagby",
          "bfn": "Bill",
          "bln": "Wagby",
          "bco": "DZ",
          "sco": "DZ",
          "tea": "a@c.d",
          "dob": "2002-11-30",
          "bsn": "43",
          "bz": "",
          "bc": "a",
          "bs": "",
          "upr": "UNKNOWN",
          "frn": "Sandbox Rule",
          "frp": "ACCEPT",
          "frd": "[Fired] details",
          "mtid": "89275686",
          "state": "A",
          "erd": "Unknown User",
          "arpr": null,
          "res": "ACCEPT",
          "rcd": "131,101,50005,150,1000,202",
          "edna-score-card": null,
          "last-checked-at": null,
          "user": "UNKNOWN",
          "ednaScoreCard": {}
        }
      }
    };
  });
}
