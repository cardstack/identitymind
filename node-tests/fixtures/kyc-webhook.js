module.exports= {
  "ednaScoreCard": {
    "sc": [],
    "etr": [
      {
        "test": "dv:7",
        "details": "false",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:6",
        "details": "false",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:5",
        "fired": true,
        "details": "[Fired] Face Comparision Result Failed (faces dont match).",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:5",
        "details": "false",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:4",
        "fired": false,
        "details": "Face match request processed successfully.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:4",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:3",
        "fired": false,
        "details": "Document is Authentic with the following warnings:[FacelinkNoMatch, DatacomparisonTooLow]",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:3",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:2",
        "fired": false,
        "details": "Type of Document submitted does  match type of document requested.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:2",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:1",
        "fired": false,
        "details": "Document was  processed for authenticity.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:1",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:0",
        "fired": false,
        "details": "Document Verification service was  accessed successfully.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:0",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "ed:32",
        "fired": false,
        "details": "ed:32(false) = true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:19",
        "details": "Passport",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:21",
        "fired": false,
        "details": "Document processing result was  decisive.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:21",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:10",
        "details": "false",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:20",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:18",
        "details": "CHN",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:17",
        "details": "2019-03-05",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:16",
        "details": "MA0000000",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:15",
        "details": "1988-07-19",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:14",
        "details": "Address could NOT be extracted from the document.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:13",
        "details": "HANG MIO LOI",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:9",
        "fired": false,
        "details": "Date of Birth provided does  match Date of Birth in submitted document.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:9",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:12",
        "fired": false,
        "details": "Document Verification Service Provider: MITEK",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:12",
        "details": "MITEK",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:11",
        "fired": false,
        "details": "Document has NOT expired.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:11",
        "details": "false",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:8",
        "fired": false,
        "details": "Name provided does  match name in submitted document.",
        "ts": 1517439212261,
        "stage": "1"
      },
      {
        "test": "dv:8",
        "details": "true",
        "ts": 1517439212261,
        "stage": "1"
      }
    ],
    "er": {
      "reportedRule": {
        "name": "DV",
        "details": "[Fired] Face Comparision Result Failed (faces dont match).; Document has NOT expired.; Date of Birth provided does  match Date of Birth in submitted document.; Name provided does  match name in submitted document.; Document was  processed for authenticity.; Document Verification service was  accessed successfully.; Document is Authentic with the following warnings:[FacelinkNoMatch, DatacomparisonTooLow]; Type of Document submitted does  match type of document requested.; Document Verification Service Provider: MITEK; Document processing result was  decisive.; Face match request processed successfully.",
        "description": "",
        "ruleId": 30001,
        "testResults": [
          {
            "test": "dv:11",
            "fired": false,
            "details": "Document has NOT expired.",
            "condition": {
              "left": "dv:11",
              "right": true,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:9",
            "fired": false,
            "details": "Date of Birth provided does  match Date of Birth in submitted document.",
            "condition": {
              "left": "dv:9",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:8",
            "fired": false,
            "details": "Name provided does  match name in submitted document.",
            "condition": {
              "left": "dv:8",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:1",
            "fired": false,
            "details": "Document was  processed for authenticity.",
            "condition": {
              "left": "dv:1",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:0",
            "fired": false,
            "details": "Document Verification service was  accessed successfully.",
            "condition": {
              "left": "dv:0",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:3",
            "fired": false,
            "details": "Document is Authentic with the following warnings:[FacelinkNoMatch, DatacomparisonTooLow]",
            "condition": {
              "left": "dv:3",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:2",
            "fired": false,
            "details": "Type of Document submitted does  match type of document requested.",
            "condition": {
              "left": "dv:2",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:5",
            "fired": true,
            "details": "[Fired] Face Comparision Result Failed (faces dont match).",
            "condition": {
              "left": "dv:5",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:12",
            "fired": false,
            "details": "Document Verification Service Provider: MITEK",
            "condition": {
              "left": "dv:12",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:21",
            "fired": false,
            "details": "Document processing result was  decisive.",
            "condition": {
              "left": "dv:21",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          },
          {
            "test": "dv:4",
            "fired": false,
            "details": "Face match request processed successfully.",
            "condition": {
              "left": "dv:4",
              "right": false,
              "operator": "eq",
              "type": "info"
            },
            "ts": 1517439212261,
            "stage": "1"
          }
        ],
        "resultCode": "DENY"
      },
      "profile": "DEFAULT"
    }
  },
  "mtid": "92514582",
  "state": "D",
  "tid": "92514582",
  "rcd": ""
};
