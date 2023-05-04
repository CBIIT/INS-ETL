const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');
const {
  loadCache,
  writeToCache
} = require('../miningHelper/miningCacher');

// caching feature for NCBI GEOs, SRAs and DBGaps by publication
let ncbi_geo_sra_dbgap_cache_publications = {};
const ncbi_geo_sra_dbgap_cache_publications_location = "config/ncbi_geo_sra_dbgap_publications_cache.tsv";
const ncbi_geo_sra_dbgap_cache_publications_columns = ["publication", "geo", "sra", "dbgap"];

const formatCache = () => {
  const keys = Object.keys(ncbi_geo_sra_dbgap_cache_publications);
  for (var i = 0; i < keys.length; i++) {
    if (ncbi_geo_sra_dbgap_cache_publications[keys[i]]["geo"] === "") {
      ncbi_geo_sra_dbgap_cache_publications[keys[i]]["geo"] = [];
    }
    else {
      ncbi_geo_sra_dbgap_cache_publications[keys[i]]["geo"] = ncbi_geo_sra_dbgap_cache_publications[keys[i]]["geo"].split(",");  // turn a comma delimited string into an array of values
    }
    if (ncbi_geo_sra_dbgap_cache_publications[keys[i]]["sra"] === "") {
      ncbi_geo_sra_dbgap_cache_publications[keys[i]]["sra"] = [];
    }
    else {
      ncbi_geo_sra_dbgap_cache_publications[keys[i]]["sra"] = ncbi_geo_sra_dbgap_cache_publications[keys[i]]["sra"].split(",");  // turn a comma delimited string into an array of values
    }
    if (ncbi_geo_sra_dbgap_cache_publications[keys[i]]["dbgap"] === "") {
      ncbi_geo_sra_dbgap_cache_publications[keys[i]]["dbgap"] = [];
    }
    else {
      ncbi_geo_sra_dbgap_cache_publications[keys[i]]["dbgap"] = ncbi_geo_sra_dbgap_cache_publications[keys[i]]["dbgap"].split(",");  // turn a comma delimited string into an array of values
    }
  }
};

const getGEOData = async (publications, pmId) => {
  console.log(apis.pmGeoSite + pmId);
  let d = await fetch(apis.pmGeoSite + pmId, true);  // true is keep trying
  if(d != "failed"){
    if (d.indexOf("<title>Error - GEO DataSets - NCBI</title>") === -1 && d.indexOf("<title>No items found - GEO DataSets - NCBI</title>") === -1) {  // check if GEO datasets exist for this publication
      let temp = d;
      let idx_start = temp.indexOf("Accession: <");
      while (idx_start > -1) {
        let idx_end = 0;
        temp = temp.substring(idx_start + 20);
        idx_end = temp.indexOf("</dd>");
        let str = temp.substring(0, idx_end);
        publications[pmId].geo_accession.push(str);
        temp = temp.substring(idx_end);
        idx_start = temp.indexOf("Accession: <");
      }
      console.log(publications[pmId].geo_accession.length + " GEOs found.");
    }
    else {
      console.log("No GEO found.");
    }
  }
}

// first page only, mineSRAInteractive gets the rest if applicable
const getMultipleSRXResults = async (temp) => {
  let result = [];
  let idx_start = temp.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
  while (idx_start > -1) {
    temp = temp.substring(idx_start + 25);
    let idx_end = temp.indexOf("</dd>");
    let accession = temp.substring(0, idx_end);
    console.log(apis.pmSraDetailSite + accession + "[accn]");
    let sra_detail = await fetch(apis.pmSraDetailSite + accession + "[accn]", true);  // true is keep trying
    let pos_start = 0; 
    if(sra_detail !== "failed"){
      let pos_end = 0;
      pos_start = sra_detail.indexOf("Link to SRA Study\">");  // 19 characters
      sra_detail = sra_detail.substring(pos_start + 19);
      pos_end = sra_detail.indexOf("</a>");
      let str = sra_detail.substring(0, pos_end);  // the SRP number we want
      if (result.indexOf(str) === -1) {  // there are multiple accessions (SRX numbers) per SRP number, only save the unique SRPs
        result.push(str);                //  such that an SRP number is related to an SRA data set
      }
    }
    temp = temp.substring(idx_end);
    idx_start = temp.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
  }
  return result;
}

const getSRAData = async (publications, pmId) => {
  console.log(apis.pmSraSite + pmId);
  let d = await fetch(apis.pmSraSite + pmId, true);  // true is keep trying
  if(d != "failed"){
    if (d.indexOf("<title>Error - SRA - NCBI</title>") === -1 && d.indexOf("<title>No items found - SRA - NCBI</title>") === -1) {  // check if SRA datasets exist for this publication
      let idx = d.indexOf("Items:");
      if(idx === -1){
        let temp = d;
        //single sra result
        let pos = temp.indexOf("Link to SRA Study\">");  // 19 characters
        temp = temp.substring(pos + 19);
        pos = temp.indexOf("</a>");
        let str = temp.substring(0, pos);
        publications[pmId].sra_accession.push(str);
      }
      else {
        let temp = d;
        temp = d;  // re-initialize the temp variable containing the hypertext
        publications[pmId].sra_accession = await getMultipleSRXResults(temp);
      }
      console.log(publications[pmId].sra_accession.length + " SRAs found.");
    }
    else {
      console.log("No SRA found.");
    }
  }
}

const getDBGapData = async (publications, pmId) => {
  console.log(apis.pmDbgapSite + pmId);
  let d = await fetch(apis.pmDbgapSite + pmId, true);  // true is keep trying
  if(d != "failed"){
    if (d.indexOf("<title>Error - dbGaP - NCBI</title>") === -1 && d.indexOf("<title>No items found - dbGaP - NCBI</title>") === -1) {  // check if DBGap datasets exist for this publication
      let tmp = d;
      let idx_start = tmp.indexOf("href=\"/projects/gap/cgi-bin/study.cgi?study_id=phs"); // 50 characters
      while (idx_start > -1) {
        let idx_end = 0;
        tmp = tmp.substring(idx_start + 50 - 3); // '-3' to get the 'phs' back
        idx_end = tmp.indexOf("\"");
        let str = tmp.substring(0, idx_end);
        publications[pmId].dbgap_accession.push(str);
        tmp = tmp.substring(idx_end);
        idx_start = tmp.indexOf("href=\"/projects/gap/cgi-bin/study.cgi?study_id=phs"); // 50 characters
        // these come in paris since the update to the dbGaP site, we skip the second one, the repeat
        idx_start = tmp.indexOf("href=\"/projects/gap/cgi-bin/study.cgi?study_id=phs"); // 50 characters
      }
      console.log(publications[pmId].dbgap_accession.length + " dbGaPs found.")
    }
    else {
      console.log("No dbGaP found.");
    }
  }
}

const run = async (publications) => {
  console.log("Loading NCBI GEO, SRA and DBGap cache.");
  ncbi_geo_sra_dbgap_cache_publications = loadCache(ncbi_geo_sra_dbgap_cache_publications_location, ncbi_geo_sra_dbgap_cache_publications_columns);
  formatCache();
  console.log("Number of cached publications for GEOs, SRAs and DBGaps loaded: " + Object.keys(ncbi_geo_sra_dbgap_cache_publications).length);

  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    // check for cache hit
    if (ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]) {  
      publications[pmIds[p]].geo_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["geo"];
      publications[pmIds[p]].sra_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["sra"];
      publications[pmIds[p]].dbgap_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]["dbgap"];
      console.log("NCBI cache hit for publication: " + pmIds[p] + "\n");
      continue;
    }

    console.log(`Collecting GEO, SRA and DBGap datasets for publication: ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    publications[pmIds[p]].geo_accession = [];
    publications[pmIds[p]].sra_accession = [];
    publications[pmIds[p]].dbgap_accession = [];

    // get GEO data, get one accession out of results to mine for GEO details later
    await getGEOData(publications, pmIds[p]);

    // get SRA data, get one accession out of results to mine for SRA details later
    await getSRAData(publications, pmIds[p]);

    // get DBGap data, get one accession out of results to mine the DBGap details later
    await getDBGapData(publications, pmIds[p]);

    // preserve whether there were GEOs, SRAs or DBGaps or not (empty string)
    writeToCache(ncbi_geo_sra_dbgap_cache_publications_location, [pmIds[p], publications[pmIds[p]].geo_accession?publications[pmIds[p]].geo_accession.join(","):"",
                                                                  publications[pmIds[p]].sra_accession?publications[pmIds[p]].sra_accession.join(","):"",
                                                                  publications[pmIds[p]].dbgap_accession?publications[pmIds[p]].dbgap_accession.join(","):""]);
    console.log("\n");
  }
};

module.exports = {
	run
};