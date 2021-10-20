const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting PubMed Central ID for : ${pmIds[p]}`);
    let d = await fetch(apis.pmArticleSite + pmIds[p] +'/');
    if(d != "failed"){
        let idx = d.indexOf("\"PMCID\"");
        if(idx > -1){
          publications[pmIds[p]].pmc_id = d.substring(idx + 20, idx + 30);
        }
        else{
            idx = d.indexOf("\"PMC ID\"");
            if(idx > -1){
              publications[pmIds[p]].pmc_id = d.substring(idx + 9, idx + 19);
            }
        }
        console.log(`Collecting Research Output data from PubMed for : ${pmIds[p]}`);
        idx = d.indexOf("related-links-list");
        if(idx > -1){
          let tmp = d.substring(idx - 11);
          let idx_end = tmp.indexOf("</ul>");
          let outputs = tmp.substring(0, idx_end + 5);
          //Get GEO DataSets
          if(outputs.indexOf("Related GEO DataSets") > -1){
            d = await fetch(apis.pmGeoSite + pmIds[p]);
            if(d != "failed"){
              publications[pmIds[p]].geos = [];
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
          }
          if(outputs.indexOf("Links to Short Read Archive Experiments") > -1){
            d = await fetch(apis.pmSraSite + pmIds[p]);
            if(d != "failed"){
              publications[pmIds[p]].sras = [];
              let idx = d.indexOf("Items:");
              if(idx === -1){
                //single sra page
                let pos = d.indexOf("Link to SRA Study\">");
                d = d.substring(pos + 19);
                pos = d.indexOf("</a>");
                let accession = d.substring(0, pos);
                publications[pmIds[p]].sras.push(accession);
              }
              else{
                let srx = d.substring(idx+6);
                idx = srx.indexOf("</h3>");
                let count_str = srx.substring(0, idx);
                let count = 0;
                idx = count_str.indexOf("of")
                if(idx > -1){
                    count_str = count_str.substring(idx+3);
                }
                count = parseInt(count_str);
                
                idx = srx.indexOf("Accession: ");
                srx = srx.substring(idx + 21);
                idx = srx.indexOf("</dd>");
                let accession_0 = srx.substring(0, idx);
                let sra_detail = await fetch(apis.pmSraDetailSite + accession_0 + "[accn]");
                let pos = 0; 
                if(sra_detail != "failed"){
                    pos = sra_detail.indexOf("Link to SRA Study\">");
                    sra_detail = sra_detail.substring(pos + 19);
                    pos = sra_detail.indexOf("</a>");
                    let accession = sra_detail.substring(0, pos);
                    publications[pmIds[p]].sras.push(accession);
                }
              }
            }
          }
          if(outputs.indexOf("Related dbGaP record") > -1){
            d = await fetch(apis.pmDbgapSite + pmIds[p]);
            if(d != "failed"){
              publications[pmIds[p]].dbgaps = [];
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
          }
        }
    }
  }
};

module.exports = {
	run
};