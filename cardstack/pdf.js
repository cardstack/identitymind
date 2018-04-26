const fs                = require('fs');
const path              = require('path');
const PDFDocument       = require('pdfkit');
const streamToPromise   = require('stream-to-promise');
const { exec }          = require('child_process');

const logoPath    = assetPath('logo.png'),
  lightFont       = assetPath('ALSEkibastuz.ttf'),
  boldFont        = assetPath('ALSEkibastuz-Bold.ttf'),
  lineGap         = 2,
  marginLeft      = 115,
  marginRight     = 85,
  marginY         = 55,
  fullWidth       = 595.28,
  contentWidth    = fullWidth - marginLeft - marginRight;

function assetPath(asset) {
  return path.join(__dirname, 'pdf-assets', asset);
}

class Pdf {
  constructor(data={}) {
    this.data = data;
    this.doc = new PDFDocument({
      autoFirstPage: false
    });
  }

  generate() {
    this.doc.addPage({
      layout: 'portrait',
      size:   'a4',
      margins: {
        top:    marginY,
        bottom: marginY,
        left:   marginLeft,
        right:  marginRight
      }
    });

    this.doc.image(logoPath, this.doc.x-20, this.doc.y, { width: 90 });

    this.doc.moveDown(1.5);

    this.text("Park Résidence,  Industriestrasse 16,  6300 Zug, Switzerland", {size: 8, width: 100}).moveDown(0.5);
    this.text("www.bitcoinsuisse.ch", {size: 8});

    this.doc.moveDown(3);

    let headingY = this.doc.y;

    this.text("FORM A", {font: boldFont, size: 22});
    this.doc.fontSize(10);
    this.doc.moveDown();
    this.text("Private Individual", {font: boldFont, size: 8});

    this.text("Confirmation of beneficial ownership (UBO) for digital assets under", 230, headingY, {font: boldFont});
    this.doc.moveDown();
    this.text("Art. 4 AML, Art.5 AML", {size: 8});

    this.doc.moveDown(2.5);
    this.text("The customer confirms with his signature that he is the sole beneficial owner for all values that are used as part of a business relationship with Bitcoin Suisse AG (BTCS). This applies to all payment methods (crypto currencies included), which are referred to BTCS and all cash (crypto currencies included), which are referred by Bitcoin Suisse AG to the customer. The customer acknowledges, that an order is irrevocable after the payment amount for purchase/sale has been transferred.",
      marginLeft, this.doc.y);

    this.doc.moveDown(1.5);

    this.field("AML Contract number", {hint: "(Filled by BTCS)"});
    this.field("Name", {value: this.data.name});
    this.field("Surname", {value: this.data.surname});
    this.field("Date of birth", {value: this.data.dob});
    this.field("Nationality", {value: this.data.nationality});
    this.field("Address of residence", {value: this.data.address, spacing: 3});
    this.field("Country of residence", {value: this.data.country});

    this.doc.moveDown(3);

    this.text("The client herewith confirms that she/he is not a PEP (politically exposed person) nor is she/he related to any PEP. The client furthermore confirms that she/he is not a US citizen, green card holder or resident of the United States of America. The customer is obliged to inform BTCS about any changes in the above data.");

    this.doc.moveDown(5);

    let sigWidth = contentWidth / 3;
    let dateWidth = sigWidth * 2;

    this.doc.strokeColor("#999999");

    this.doc
      .lineWidth(0.5)
      .moveTo(marginLeft, this.doc.y)
      .lineTo(marginLeft + dateWidth - 5, this.doc.y).stroke();

    this.doc
      .lineWidth(0.5)
      .moveTo(marginLeft + dateWidth + 5, this.doc.y)
      .lineTo(fullWidth - marginRight, this.doc.y).stroke();

    let labelY = this.doc.y + 5;

    this.text("Place and Date", marginLeft, labelY, {size: 7, width: dateWidth, align: 'center'});
    this.text("Customer signature", marginLeft + dateWidth + 5, labelY, {size: 7, width: sigWidth, align: 'center'});

    this.doc.moveDown();

    this.text("Knowingly providing false information on this form constitutes a criminal act", marginLeft, this.doc.y);
    this.text("(Art. 251 of the Swiss Penal Code, forgery may be subject to imprisonment for up to 5 years or a fine).");
    this.doc.moveDown(6);
    this.text("1 / 1", {width: contentWidth, align: 'center', size: 8});


    this.doc.end();
  }

  field(fieldName, opts={}) {
    this.doc
      .lineWidth(0.5)
      .moveTo(marginLeft, this.doc.y)
      .lineTo(fullWidth - marginRight, this.doc.y).stroke();
    this.doc.moveDown(0.3);
    let valueY = this.doc.y;

    this.text(fieldName, marginLeft, this.doc.y, {font: boldFont, size: 8});
    if (opts.hint) {
      this.doc.moveDown(0.5);
      this.text(opts.hint, marginLeft, this.doc.y, {size: 8});
      this.doc.moveDown(0.5);
    } else {
      this.doc.moveDown(opts.spacing || 1.25);
    }

    let valueX = marginLeft + 105;
    let valueWidth = contentWidth - 105;

    if (opts.value) {
      let prevY = this.doc.y;
      this.text(opts.value, valueX, valueY, {width: valueWidth, font: "Helvetica", align: 'left', size: 8, lineGap: 0.001});
      this.doc.y = prevY;
    }
  }


  async writeToFile(path) {
    await this.pipe(fs.createWriteStream(path));
  }

  async pipe(dst) {
    this.generate();
    await streamToPromise(this.doc.pipe(dst));
  }

  toStream() {
    this.generate();
    return this.doc;
  }

  // The pdfkit text stuff is really stateful. This method makes it use sane
  // defaults and allows option passing in a hash
  text(...args) {
    let opts = args[args.length - 1];

    if (typeof opts !== 'object') {
      opts = {};
    }

    if (!opts.lineGap) {
      opts.lineGap = lineGap;
    }

    if (opts.font) {
      this.doc.font(opts.font);
    } else {
      this.doc.font(lightFont);
    }

    if (opts.color) {
      this.doc.fillColor(opts.color);
    } else {
      this.doc.fillColor('black');
    }

    if (opts.size) {
      this.doc.fontSize(opts.size);
    } else {
      this.doc.fontSize(10);
    }

    return this.doc.text(...args);
  }
}

module.exports = Pdf;

if (require.main.filename === __filename) {
  let pdf = new Pdf({name: 'askdfh alskdjf laksjdf', surname: 'sadf as', dob: '234 123423 234234', address: "At eros prompta eum, id sea oportere dignissim. Mei diam imperdiet complectitur no, cu eam vidit novum. Ad nullam detraxit abhorreant eum, ex pro dicit libris, fabellas legendos duo et. An molestie argumentum consectetuer sit, quo at diceret euripidis."});
  pdf.writeToFile('tmp/tmp.pdf').then(() => exec("open tmp/tmp.pdf"));
}