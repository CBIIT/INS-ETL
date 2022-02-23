const puppeteer = require('puppeteer');
const apis = require('../../common/apis');
const {
  fetch,
  fetchWithStatusCheck
} = require ('../../common/utils');

// 02/11/2022 adeforge, implement caching
// the purpose of this function is to access SRP numbers which would otherwise be inaccessible by non-interactive (headless browser) methods
const run = async (publications, sras) => {
  const keys = Object.keys(publications);
  for (let i = 0; i < keys.length; i++) {
    let pmId = keys[i];
    if (publications[pmId].sra_overflow) {  // this publication had overflow
      console.log("Collecting more SRA coverage for publication " + pmId + " [" + (i+1) + " of " + keys.length + "]");
      var moreSRAs = true;
      let total_results = 0;
      let run_results = 0;
      let next_index = publications[pmId].sra_overflow % 200;  // 200 is the page size
      let pageNum = Math.floor(publications[pmId].sra_overflow / 200) + 1;  // 200 is the page size
      let newPage = true;  // used to avoid multiple 'interactSRA' calls if staying on same page
      let d = "";

      while (moreSRAs) {
        run_results = 0;  // different for each SRX in a publication
        
        if (newPage === true) {
          if (pageNum > 1) {
            d = await interactSRA(pmId, pageNum);
          }
          else {
            d = await interactSRA(pmId);
          }
          if (!d) {
            console.log("Repeated GET requests failed, skipping publication PubMed ID: " + pmId);
            moreSRAs = false;
            break;
          }

          let tmp = d;
          let idx = tmp.indexOf("Items: ");  // 7 characters, if there aren't multiple results, this accession shouldn't be here
          let temp = tmp.substring(idx + 7);
          idx = temp.indexOf("</h3");
          temp = temp.substring(0,idx);
          idx = temp.indexOf("of ");  // 3 characters
          if (idx > -1) {
            temp = temp.substring(idx + 3);
          }
          total_results = parseInt(temp);  // get the total number of results on the first page visit
        }

        let tmp = d;
        // the JavaScript method indexOf's second parameter is an index not an occurrence
        //  the second argument is to find the index of the (next_index+1) occurrencce
        let temp_idx = tmp.split("<dt>Accession: </dt> <dd>", (next_index+1)).join("<dt>Accession: </dt> <dd>").length;
        console.log(next_index+1);
        console.log(pageNum);
        let idx_start = tmp.indexOf("<dt>Accession: </dt> <dd>", temp_idx);  // 25 characters
        if (idx_start > -1) {
          tmp = tmp.substring(idx_start + 25);
          let idx_end = tmp.indexOf("</dd>");
          let accession = tmp.substring(0, idx_end);
          console.log(apis.pmSraDetailSite + accession + "[accn]");
          let sra_detail = await fetch(apis.pmSraDetailSite + accession + "[accn]", true);  // true is keep trying
          let pos_start = 0; 
          if(sra_detail !== "failed"){
            let pos_end = 0;
            pos_start = sra_detail.indexOf("Link to SRA Study\">");  // 19 characters
            sra_detail = sra_detail.substring(pos_start + 19);
            pos_end = sra_detail.indexOf("</a>");
            let str = sra_detail.substring(0, pos_end);  // the SRP number we want
            let srp = str;  // important translation
            if (!publications[pmId].sra_accession) {
              publications[pmId].sra_accession = [];
            }
            if (publications[pmId].sra_accession.indexOf(str) === -1) {  // there are multiple accessions (SRX numbers) per SRP number, only save the unique SRPs
              publications[pmId].sra_accession.push(str);                //  such that an SRP number is related to an SRA data set
            }
            // begin getting SRP details, including total number of runs
            console.log(apis.pmSrpDetailSite + srp);
            let dd = await fetch(apis.pmSrpDetailSite + srp, true);  // true is keep trying
            if(dd !== "failed"){
              if (dd.indexOf("<div class=\"error\">SRA Study " + srp + " does not exist</div>") === -1) {
                // get metric related to number of runs vs number of SRX results for publication
                let temp = dd;
                let idx_total_runs = temp.indexOf("href=\"https://www.ncbi.nlm.nih.gov//sra/?term=" + srp + "\">");  // 48 characters plus srp string length
                temp = temp.substring(idx_total_runs + 48 + srp.length);
                idx_total_runs = temp.indexOf("<");
                run_results = parseInt(temp.substring(0,idx_total_runs));

                sras[srp] = {};
                let idx = dd.indexOf("h1>");  // 3 characters
                dd = dd.substring(idx + 3);
                let idx_end = dd.indexOf("</h1>");
                sras[srp].study_title = dd.substring(0, idx_end);
                idx = dd.indexOf("bioproject\/");  // 11 characters
                dd = dd.substring(idx);
                idx_end = dd.indexOf("\">");
                sras[srp].bioproject_accession = dd.substring(11, idx_end);
                console.log(apis.pmBioprojectDetailSite + sras[srp].bioproject_accession);
                let bioproject_detail = await fetchWithStatusCheck(apis.pmBioprojectDetailSite + sras[srp].bioproject_accession, 404);  // keep trying unless 404
                if(bioproject_detail){
                    let acc = "";
                    pos  = bioproject_detail.indexOf(sras[srp].bioproject_accession + ";");
                    if(pos !== -1){
                      bioproject_detail = bioproject_detail.substring(pos);
                      pos = bioproject_detail.indexOf("</td>");
                      acc = bioproject_detail.substring(0, pos);
                      let arr_geo = acc.split(";");
                      sras[srp].geo = arr_geo[1].trim().substring(5);
                      let gs = sras[srp].geo.match(/GSE[0-9]{5,6}/g);
                      if(gs != null && gs.length > 0){
                        if(!publications[pmId].geos){
                          publications[pmId].geos = [];
                        }
                        if(publications[pmId].geos.indexOf(sras[srp].geo) === -1){
                          publications[pmId].geos.push(sras[srp].geo);
                        }
                      }
                    }
                    pos = bioproject_detail.indexOf("Registration date");
                    sras[srp].registration_date = bioproject_detail.substring(pos+19, pos + 30);
                    sras[srp].registration_date = sras[srp].registration_date.replace('<','');
                }
              }
            }
          }
        }
        let tempPage = pageNum;
        pageNum = pageNum + Math.floor((next_index + run_results) / 200);  // 200 is the page size
        newPage = (pageNum === tempPage) ? false : true;
        next_index = ((next_index + run_results) % 200); // 200 is the page size
        moreSRAs = (((pageNum-1) * 200) + (next_index+1)) >= total_results ? false : true;  // if the next index points to a result past the total results, stop
        console.log(pageNum);
        console.log(next_index);
        console.log(run_results);
        console.log(total_results);
      }
    }
  }
};

// if you don't set pageNum, then you will get the landing page with 200 results per page
const interactSRA = async (pmId, pageNum=null) => {
  let result = "";
  const MAX_RETRIES = 200;
  let counter = 0;
  var keep_trying = true;
  while (keep_trying) {
    try {
      await (async () => {
          // this revisionInfo line is due to the error: TimeoutError: Timed out after 30000 ms while trying to connect to the browser! Only Chrome at revision r938248 is guaranteed to work.
          // https://github.com/puppeteer/puppeteer/issues/4796
          // const browserFetcher = puppeteer.createBrowserFetcher();
          // const revisionInfo = await browserFetcher.download('938248');
          const browser = await puppeteer.launch(
              {
                  // 'defaultViewport' : { 'width' : 1024, 'height' : 1600 },
                  // headless: true,
                  //executablePath: revisionInfo.executablePath
              });
          const page = await browser.newPage();
          page.setDefaultNavigationTimeout( 30000 );
          // await page.setViewport( { 'width' : 1024, 'height' : 1600 } );
          // await page.setUserAgent( 'UA-TEST' );  // 02/11/2022 adeforge, change me

          console.log(apis.pmSraSite + pmId);
          await page.goto(apis.pmSraSite + pmId, { 'waitUntil' : 'domcontentloaded' });

          await page.waitForSelector("input[id$=\"ps200\"]");
          let handle1 = await page.$("input[id$=\"ps200\"]");
          await handle1.evaluate(b => b.click());
          await page.waitForNavigation();

          if (pageNum) {
            await page.waitForSelector('#pageno');
            await page.$eval('#pageno', (el, pageNum) => {el.value = String(pageNum)}, pageNum);
            await page.focus('#pageno');
            await page.keyboard.press("Enter");
            await page.waitForNavigation();
          }

          result = await page.evaluate(() => document.body.innerHTML);

          await browser.close();
      })()
      keep_trying = false;
    }
    catch (e) {
        console.log("Puppeteer GET FAILED");
        console.log(apis.pmSraSite + pmId);
        console.log(e);
        if (counter >= MAX_RETRIES) {
          result = null;
          keep_trying = false;
          return result;
        }
        counter++;
        console.log("Retry Attempt: " + counter);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return result;
};



module.exports = {
	run
};
