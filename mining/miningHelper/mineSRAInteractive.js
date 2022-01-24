const { result } = require('lodash');
const puppeteer = require('puppeteer');
const apis = require('../../common/apis');


// the purpose of this function is to access SRP numbers which would otherwise be inaccessible by non-interactive (headless browser) methods
const mineSRAInteractive = async (publications, sras) => {
  for (let pmId in publications) {
    if (publications[pmId].sra_overflow !== undefined) {  // this publication had overflow
      console.log(apis.pmSraSite + pmId);
      let d = await fetch(apis.pmSraSite + pmId, true);  // true is keep trying
      if(d != "failed"){
        if (d.indexOf("<title>Error - SRA - NCBI</title>") === -1 && d.indexOf("<title>No items found - SRA - NCBI</title>") === -1) {  // check if SRA datasets exist for this publication
          let moreSRAs = true;
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
                d = interactSRA(srx, pageNum);
              }
              else {
                d = interactSRA(srx);
                let tmp = d;
                let idx = tmp.indexOf("Items: ");  // if there aren't multiple results, this accession shouldn't be here
                let temp = tmp.substring(idx);
                idx = temp.indexOf("of ");
                temp = temp.substring(idx);
                idx = temp.indexOf("</h3");
                total_results = parseInt(temp.substring(0,idx));  // get the total number of results on the first page visit
              }
            }

            let tmp = d;
            let idx_start = tmp.indexOf("<dt>Accession: </dt> <dd>", next_index);  // 25 characters
            tmp = tmp.substring(idx_start + 25);
            let idx_end = tmp.indexOf("</dd>");
            let accession = tmp.substring(0, idx_end);
            console.log(apis.pmSraDetailSite + accession + "[accn]");
            let sra_detail = await fetch(apis.pmSraDetailSite + accession + "[accn]", true);  // true is keep trying
            let pos_start = 0; 
            if(sra_detail != "failed"){
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
              if(dd != "failed"){
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
            let tempPage = pageNum;
            pageNum = Math.floor((next_index + run_results) / 200) + 1;  // 200 is the page size
            newPage = (pageNum === tempPage) ? false : true;
            next_index = (next_index + run_results) % 200; // 200 is the page size
            moreSRAs = ((pageNum * 200) + next_index) >= total_results ? false : true;  // if the next index points to a result past the total results, stop
          }
        }
      }
    }
  }
};

// if you don't set pageNum, then you will get the landing page with 200 results per page
const interactSRA = (accession, pageNum=null) => {
  let result = "";
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(apis.pmSraDetailSite + accession + "[accn]");

    await page.click("#ps200");  // set the page size to 200

    if (pageNum) {
      await page.waitForSelector('input[name=EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage]');
      await page.$eval('input[name=EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage]', el => el.value = String(pageNum));
      await page.focus('#pageno');
      await page.keyboard.press("Enter");
    }

    result = await page.evaluate(() => {
      return document.body;
    });

    await browser.close();
  })()

  return result;
};



module.exports = {
	mineSRAInteractive
};
