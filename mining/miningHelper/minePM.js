const {
  fetch,
  post
} = require('../../common/utils');
const apis = require('../../common/apis');

const PAGE_SIZE = "EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Sra_DisplayBar.PageSize";
const CURR_PAGE = "EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.CurrPage";
var POST_BODY = {
  'EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Sra_DisplayBar.PageSize': 200,
  'EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.CurrPage': 1
}
// is this the right way to do this??? correct site?


const run = async (publications) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting GEO, SRA and DBGap datasets for publication: ${pmIds[p]}, (${p+1}/${pmIds.length})`);

    // get GEO data
    console.log(apis.pmGeoSite + pmIds[p]);
    d = await post(apis.pmGeoSite + pmIds[p], POST_BODY, true);  // true is keep trying
    if(d != "failed"){
      if (d.indexOf("<title>Error - GEO DataSets - NCBI</title>") === -1 && d.indexOf("<title>No items found - GEO DataSets - NCBI</title>") === -1) {  // check if GEO datasets exist for this publication
        publications[pmIds[p]].geos = [];

        let last_page = 1;
        let multi_pages_idx = d.indexOf("name=\"EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage\" id=\"pageno\"");  // 80 characters
        if (multi_pages_idx > -1) {
          let tmp = d;
          tmp = tmp.substring(multi_pages_idx + 80);
          let last_page_idx = tmp.indexOf("last=\"");  // 6 characters
          tmp = tmp.substring(last_page_idx + 6);
          last_page_idx = tmp.indexOf("\"");
          last_page = parseInt(tmp.substring(last_page_idx));
        }
        for (var page = 0; page < last_page; page++) {
          if (page > 0) {
            POST_BODY[CURR_PAGE] = page + 1;
            d = await post(apis.pmSraSite + pmIds[p], POST_BODY, true);  // true is keep trying
          }
          let idx_start = d.indexOf("Accession: <");
          let idx_end = 0;
          let tmp = d;
          while(idx_start > -1){
              tmp = tmp.substring(idx_start + 20);
              idx_end = tmp.indexOf("</dd>");
              let str = tmp.substring(0, idx_end);
              publications[pmIds[p]].geos.push(str);
              tmp = tmp.substring(idx_end);
              idx_start = tmp.indexOf("Accession: <");
          }
        }
        console.log("Number of GEOs found: " + publications[pmIds[p]].geos.length);
        POST_BODY[CURR_PAGE] = 1;
      }
      else {
        console.log("No GEOs found.");
      }
    }

    // get SRA data
    console.log(apis.pmSraSite + pmIds[p]);
    d = await post(apis.pmSraSite + pmIds[p], POST_BODY, true);  // true is keep trying
    if(d != "failed"){
      if (d.indexOf("<title>Error - SRA - NCBI</title>") === -1 && d.indexOf("<title>No items found - SRA - NCBI</title>") === -1) {  // check if SRA datasets exist for this publication
        publications[pmIds[p]].sras = [];
        let idx = d.indexOf("Items:");
        if(idx === -1){
          //single sra page
          let pos = d.indexOf("Link to SRA Study\">");
          d = d.substring(pos + 19);
          pos = d.indexOf("</a>");
          let accession = d.substring(0, pos);
          publications[pmIds[p]].sras.push(accession);
          console.log("SRA result: " + accession);
        }
        else {
          let last_page = 1;
          let multi_pages_idx = d.indexOf("name=\"EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage\" id=\"pageno\"");  // 80 characters
          if (multi_pages_idx > -1) {
            let tmp = d;
            tmp = tmp.substring(multi_pages_idx + 80);
            let last_page_idx = tmp.indexOf("last=\"");  // 6 characters
            tmp = tmp.substring(last_page_idx + 6);
            last_page_idx = tmp.indexOf("\"");
            last_page = parseInt(tmp.substring(0,last_page_idx));
          }
          console.log("last_page: " + last_page);
          for (var page = 0; page < last_page; page++) {
            if (page > 0) {
              POST_BODY[CURR_PAGE] = page + 1;
              console.log("Parsing page: " + (page+1));
              d = await post(apis.pmSraSite + pmIds[p], POST_BODY, true);  // true is keep trying
            }
            // multiple sra results
            let start_idx = d.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
            let tmp = d;
            while (start_idx > -1) {
              tmp = tmp.substring(start_idx + 25);
              let end_idx = tmp.indexOf("</dd>");  // 5 characters
              let accession_0 = tmp.substring(0, end_idx);
              console.log(apis.pmSraDetailSite + accession_0 + "[accn]");
              let sra_detail = await fetch(apis.pmSraDetailSite + accession_0 + "[accn]", true);  // true is keep trying
              let pos = 0; 
              if(sra_detail != "failed"){
                  pos = sra_detail.indexOf("Link to SRA Study\">");
                  sra_detail = sra_detail.substring(pos + 19);
                  pos = sra_detail.indexOf("</a>");
                  let accession = sra_detail.substring(0, pos);
                  publications[pmIds[p]].sras.push(accession);
              }
              start_idx = tmp.indexOf("<dt>Accession: </dt> <dd>");
            }
          }
          console.log("Number of SRAs found: " + publications[pmIds[p]].sras.length);
          POST_BODY[CURR_PAGE] = 1;
        }
      }
      else {
        console.log("No SRAs found.");
      }
    }

    // get DBGap data
    console.log(apis.pmDbgapSite + pmIds[p]);
    d = await post(apis.pmDbgapSite + pmIds[p], POST_BODY, true);  // true is keep trying
    if(d != "failed"){
      if (d.indexOf("<title>Error - dbGaP - NCBI</title>") === -1 && d.indexOf("<title>No items found - dbGaP - NCBI</title>") === -1) {  // check if DBGap datasets exist for this publication
        publications[pmIds[p]].dbgaps = [];

        let last_page = 1;
        let multi_pages_idx = d.indexOf("name=\"EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage\" id=\"pageno\"");  // 80 characters
        if (multi_pages_idx > -1) {
          let tmp = d;
          tmp = tmp.substring(multi_pages_idx + 80);
          let last_page_idx = tmp.indexOf("last=\"");  // 6 characters
          tmp = tmp.substring(last_page_idx + 6);
          last_page_idx = tmp.indexOf("\"");
          last_page = parseInt(tmp.substring(last_page_idx));
        }
        for (var page = 0; page < last_page; page++) {
          if (page > 0) {
            POST_BODY[CURR_PAGE] = page + 1;
            d = await post(apis.pmSraSite + pmIds[p], POST_BODY, true);  // true is keep trying
          }
          let idx_start = d.indexOf("font-weight:600");
          let tmp = d;
          while(idx_start > -1){
              tmp = tmp.substring(idx_start + 17);
              idx_start = tmp.indexOf("</span>");
              let str = tmp.substring(0, idx_start);
              publications[pmIds[p]].dbgaps.push(str);
              idx_start = tmp.indexOf("font-weight:600");
          }
        }
        console.log("Number of DBGaps found: " + publications[pmIds[p]].dbgaps.length);
        POST_BODY[CURR_PAGE] = 1;
      }
      else {
        console.log("No DBGaps found.");
      }
    }
    console.log("\n");
  }
};

module.exports = {
	run
};