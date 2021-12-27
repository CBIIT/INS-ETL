const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');
const fs = require('fs');
const {
  loadCache,
  writeToCache
} = require('../miningHelper/miningCacher');

// caching feature for NCBI GEOs, SRAs and DBGaps by publication
let ncbi_geo_sra_dbgap_cache_publications = {};
const ncbi_geo_sra_dbgap_cache_publications_location = "config/ncbi_geo_sra_dbgap_publications_cache.tsv";
const ncbi_geo_sra_dbgap_cache_publications_columns = ["publication", "geo", "sra", "dbgap"];

const run = async (publications, metrics) => {
  console.log("Loading NCBI GEO, SRA and DBGap cache.");
  ncbi_geo_sra_dbgap_cache_publications = loadCache(ncbi_geo_sra_dbgap_cache_publications_location, ncbi_geo_sra_dbgap_cache_publications_columns);
  console.log("Number of cached publications for GEOs, SRAs and DBGaps loaded: " + Object.keys(ncbi_geo_sra_dbgap_cache_publications).length);

  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    
    // setup for metrics
    // metrics[pmIds[p]] = {};
    // metrics[pmIds[p]]["totalGeoResults"] = null;
    // metrics[pmIds[p]]["totalSrxResults"] = null;

    if (ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]) {  // check for cache hit
      publications[pmIds[p]].geo_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["geo"] !== ""?ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["geo"]:null;
      publications[pmIds[p]].sra_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["sra"] !== ""?ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["sra"]:null;
      publications[pmIds[p]].dbgap_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["dbgap"] !== ""?ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["dbgap"]:null;
      console.log("NCBI cache hit for publication: " + pmIds[p] + "\n");
      continue;
    }

    console.log(`Collecting GEO, SRA and DBGap datasets for publication: ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    publications[pmIds[p]].geo_accession = null;
    publications[pmIds[p]].sra_accession = null;
    publications[pmIds[p]].dbgap_accession = null;

    // get GEO data, get one accession out of results to mine for GEO details later
    console.log(apis.pmGeoSite + pmIds[p]);
    d = await fetch(apis.pmGeoSite + pmIds[p], true);  // true is keep trying
    if(d != "failed"){
      if (d.indexOf("<title>Error - GEO DataSets - NCBI</title>") === -1 && d.indexOf("<title>No items found - GEO DataSets - NCBI</title>") === -1) {  // check if GEO datasets exist for this publication
        // get how many GEOs were returned for metrics
        // let temp_items = d;
        // let idx_items = temp_items.indexOf("Items: ");
        // if (idx_items > -1) {
        //   idx_items = temp_items.indexOf("Items: 1 to ");  // 12 characters
        //   if (idx_items > -1) {
        //     // multiple pages of results
        //     // we substring to 'Items: 1 to ' for consistency, to get the first occurrence of 'of ' for sure
        //     temp_items = temp_items.substring(idx_items + 12); // get past 'Items: 1 to '
        //     idx_items = temp_items.indexOf("of ");  // 3 characters, it is unknown how many characters between 'Items: 1 to ' and 'of '
        //     temp_items = temp_items.substring(idx_items + 3);  // get just past 'of ' to get to number of interest
        //   }
        //   else {
        //     // single page of results
        //     idx_items = temp_items.indexOf("Items: ");  // get past 'Items: '
        //     temp_items = temp_items.substring(idx_items + 7);
        //   }
        //   idx_items = temp_items.indexOf("<");
        //   temp_items = temp_items.substring(0,idx_items);
        //   // metrics[pmIds[p]]["totalGeoResults"] = temp_items;
        // }
        // else {
        //   // single result
        //   // metrics[pmIds[p]]["totalGeoResults"] = 1;
        // }

        // 12/27/2021 adeforge, only retrieves the first GEO accession right now
        let tmp = d;
        let idx_start = tmp.indexOf("Accession: <");
        let idx_end = 0;
        tmp = tmp.substring(idx_start + 20);
        idx_end = tmp.indexOf("</dd>");
        let str = tmp.substring(0, idx_end);
        publications[pmIds[p]].geo_accession = str;
        console.log("GEO found.");
      }
      else {
        console.log("No GEO found.");
      }
    }

    // get SRA data, get one accession out of results to mine for SRA details later
    console.log(apis.pmSraSite + pmIds[p]);
    d = await fetch(apis.pmSraSite + pmIds[p], true);  // true is keep trying
    if(d != "failed"){
      if (d.indexOf("<title>Error - SRA - NCBI</title>") === -1 && d.indexOf("<title>No items found - SRA - NCBI</title>") === -1) {  // check if SRA datasets exist for this publication
        let idx = d.indexOf("Items:");
        if(idx === -1){
          let temp_single = d;
          //single sra result
          let pos = temp_single.indexOf("Link to SRA Study\">");
          temp_single = temp_single.substring(pos + 19);
          pos = temp_single.indexOf("</a>");
          let accession = temp_single.substring(0, pos);
          publications[pmIds[p]].sra_accession = accession;
        }
        else {
          // multiple sra results
          // how many SRX numbers were returned for metrics
          // let temp_items = d;
          // let idx_items = temp_items.indexOf("Items: 1 to ");  // 12 characters, check for multiple pages of results
          // if (idx_items > -1) {
          //   // multiple pages of results
          //   // we substring to 'Items: 1 to ' for consistence, to get the first occurrence of 'of ' for sure
          //   temp_items = temp_items.substring(idx_items + 12); // get past 'Items: 1 to '
          //   idx_items = temp_items.indexOf("of ");  // 3 characters, it is unknown how many characters between 'Items: 1 to ' and 'of '
          //   temp_items = temp_items.substring(idx_items + 3);  // get just past 'of ' to get to number of interest
          // }
          // else {
          //   // single page of results
          //   idx_items = temp_items.indexOf("Items: ");  // get past 'Items: '
          //   temp_items = temp_items.substring(idx_items + 7);
          // }
          // idx_items = temp_items.indexOf("<");
          // temp_items = parseInt(temp_items.substring(0,idx_items));
          // // metrics[pmIds[p]]["totalSrxResults"] = temp_items;

          // 12/27/2021 adeforge, only retrieves the first SRA accession right now
          let tmp = d;
          let idx_start = tmp.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
          tmp = tmp.substring(idx_start + 25);
          let idx_end = tmp.indexOf("</dd>");  // 5 characters
          let accession_0 = tmp.substring(0, idx_end);
          console.log(apis.pmSraDetailSite + accession_0 + "[accn]");
          let sra_detail = await fetch(apis.pmSraDetailSite + accession_0 + "[accn]", true);  // true is keep trying
          let pos = 0; 
          if(sra_detail != "failed"){
              pos = sra_detail.indexOf("Link to SRA Study\">");
              sra_detail = sra_detail.substring(pos + 19);
              pos = sra_detail.indexOf("</a>");
              let accession = sra_detail.substring(0, pos);
              publications[pmIds[p]].sra_accession = accession;
          }
        }
        console.log("SRA found.");
      }
      else {
        console.log("No SRA found.");
      }
    }

    // get DBGap data, get one accession out of results to mine the DBGap details later
    console.log(apis.pmDbgapSite + pmIds[p]);
    d = await fetch(apis.pmDbgapSite + pmIds[p], true);  // true is keep trying
    if(d != "failed"){
      if (d.indexOf("<title>Error - dbGaP - NCBI</title>") === -1 && d.indexOf("<title>No items found - dbGaP - NCBI</title>") === -1) {  // check if DBGap datasets exist for this publication
        // 12/27/2021 adeforge, only retrieves the first dbGaP accession right now
        let tmp = d;
        let idx_start = tmp.indexOf("href=\"/projects/gap/cgi-bin/study.cgi?study_id="); // 47 characters
        tmp = tmp.substring(idx_start + 47);
        idx_start = tmp.indexOf("\"");
        let str = tmp.substring(0, idx_start);
        publications[pmIds[p]].dbgap_accession = str;
        console.log("dbGaP found.")
      }
      else {
        console.log("No dbGaP found.");
      }
    }

    // preserve whether there were GEOs, SRAs or DBGaps or not (empty string)
    writeToCache(ncbi_geo_sra_dbgap_cache_publications_location, [pmIds[p], publications[pmIds[p]].geo_accession?publications[pmIds[p]].geo_accession:"",
                                                                  publications[pmIds[p]].sra_accession?publications[pmIds[p]].sra_accession:"",
                                                                  publications[pmIds[p]].dbgap_accession?publications[pmIds[p]].dbgap_accession:""]);  // there is only ever one accession in these arrays (as populated here)
    console.log("\n");
  }
};

module.exports = {
	run
};