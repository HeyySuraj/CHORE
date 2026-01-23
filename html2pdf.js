  const fs = require('fs');
  const path = require('path');
  const puppeteer = require('puppeteer');

  // Load metadata (you can also import this from a JSON file)
  const metadata = [
    {
      EmployeeDetails: {
        "Office Name": "DEMO OFFICE, DEMO",
        "DDO_CODE": "1111222222",
        "Employee Name": "(MLJDEIM9001) DCPSD EMPLOYEE IAS",
        "Designation": "Secretary",
        "Salary Month": "June-2021",
        "Date of Birth": "24-09-1990",
        "Date of Joining": "01-08-2011",
        "Date of Retirement": "24-09-2050",
        "UID No": null,
        "Pay Commission": "6th Pay Commission",
        "Level": "12(15600-39100-Grade Pay (5000))",
        "GPF/DCPS AC.No": "DCPS/11111222222DEIM9001N",
        "Bank A/c No": "********2373",
        "IFSC_CODE": "SBIN0000300",
        "BASIC PAY": "71200",
        "Mobile No": "9987878978",
        "Pan No": null
      },
      Emoluments: {
        "BASIC": "71200",
        "GROSS_ADJUST": "9968",
        "H. R. A.": "17088",
        "Trans.Allw.": "1200",
        "TOTAL_EMOLUMENT": "99456"
      },
      "Govt. Recoveries": {
        "DCPS": "8331",
        "DED_ADJUST": "9968",
        "GIS(IAS)": "60",
        "Prof. Tax.": "200",
        "TOTAL_GOVT_RECOVERIES": "18559"
      },
      "Non Govt. Recoveries": {
        "Co. Op. Hsg Soc.": "1000",
        "TOTAL_NG_RECOVERIES": "1000"
      }
    },
    {
      "Net Pay": "79897",
      "Bill No": "99100001729",
      "Bill Description": "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "Gross Amt": "3002670",
      "Net Amt": "2395589",
      "Voucher No": "164",
      "Voucher Date": "01-06-2021",
      "Location Name": "DEMO OFFICE, DEMO"
    }
  ];

  function generateHTML(emp, summary) {
    const empDetails = emp.EmployeeDetails;
    const emoluments = emp.Emoluments;
    const govtRec = emp["Govt. Recoveries"];
    const ngRec = emp["Non Govt. Recoveries"];

    const renderTable = (data) => {
      return Object.entries(data).map(
        ([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`
      ).join('');
    };

    return `
      <!DOCTYPE html> 
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payslip - ${empDetails["Employee Name"]}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
          .section-title { background: #eee; font-weight: bold; }
          h2 { text-align: center; }
        </style>
      </head>
      <body>
        <h2>IFMS - Pay Slip</h2>
        <p><strong>Office Name:</strong> ${empDetails["Office Name"]} &nbsp; &nbsp;
          <strong>DDO Code:</strong> ${empDetails["DDO_CODE"]}</p>

        <table>
          <tr><th colspan="4" class="section-title">Employee Details</th></tr>
          <tr><td>Name</td><td>${empDetails["Employee Name"]}</td><td>Designation</td><td>${empDetails["Designation"]}</td></tr>
          <tr><td>Salary Month</td><td>${empDetails["Salary Month"]}</td><td>Date of Birth</td><td>${empDetails["Date of Birth"]}</td></tr>
          <tr><td>Date of Joining</td><td>${empDetails["Date of Joining"]}</td><td>Date of Retirement</td><td>${empDetails["Date of Retirement"]}</td></tr>
          <tr><td>Pay Commission</td><td>${empDetails["Pay Commission"]}</td><td>Level</td><td>${empDetails["Level"]}</td></tr>
          <tr><td>GPF/DCPS AC.No</td><td>${empDetails["GPF/DCPS AC.No"]}</td><td>Bank A/c No</td><td>${empDetails["Bank A/c No"]}</td></tr>
          <tr><td>IFSC Code</td><td>${empDetails["IFSC_CODE"]}</td><td>Basic Pay</td><td>${empDetails["BASIC PAY"]}</td></tr>
          <tr><td>Mobile No</td><td>${empDetails["Mobile No"]}</td><td>Pan No</td><td>${empDetails["Pan No"] || '-'}</td></tr>
        </table>

        <table><tr><th colspan="2" class="section-title">Emoluments</th></tr>${renderTable(emoluments)}</table>
        <table><tr><th colspan="2" class="section-title">Govt. Recoveries</th></tr>${renderTable(govtRec)}</table>
        <table><tr><th colspan="2" class="section-title">Non Govt. Recoveries</th></tr>${renderTable(ngRec)}</table>

        <p><strong>Net Pay:</strong> ${summary["Net Pay"]}<br>
          <strong>Bill No:</strong> ${summary["Bill No"]}<br>
          <strong>Bill Description:</strong> ${summary["Bill Description"]}<br>
          <strong>Gross Amt:</strong> ${summary["Gross Amt"]} &nbsp;
          <strong>Net Amt:</strong> ${summary["Net Amt"]}<br>
          <strong>Voucher No:</strong> ${summary["Voucher No"]} &nbsp;
          <strong>Voucher Date:</strong> ${summary["Voucher Date"]}<br>
          <strong>Location Name:</strong> ${summary["Location Name"]}</p>

        <p><i>Note: Please confirm the personal details displayed on Payslip. If any information is wrong, contact your DDO.</i></p>
        <p><i>This is a system-generated payslip. Signature not needed.</i></p>
      </body>
      </html>
    `;
  }

  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlContent = generateHTML(metadata[0], metadata[1]);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Get PDF buffer in memory
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    // Convert to Base64
    const pdfBase64 = pdfBuffer.toString("base64");

    await browser.close();

    console.log("PDF Base64:", pdfBase64);
  })();

  // (async () => {
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();

  //   const htmlContent = generateHTML(metadata[0], metadata[1]);
  //   await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  //   const outputPath = path.join(__dirname, 'output-payslip.pdf');
  //   await page.pdf({ path: outputPath, format: 'A4', printBackground: true });

  //   await browser.close();

  //   console.log('PDF generated:', outputPath);
  // })();
