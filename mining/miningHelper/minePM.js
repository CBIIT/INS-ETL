const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');
const fs = require('fs');


// caching feature for NCBI GEOs, SRAs and DBGaps by publication
let ncbi_geo_sra_dbgap_cache_publications = {};
const ncbi_geo_sra_dbgap_cache_publications_location = "config/ncbi_geo_sra_dbgap_publications_cache.tsv";

const loadNcbiGeoSraDbgapCache = () => {
  let corrupt_lines = false;
  let columns = ["publication", "geo", "sra", "dbgap"];
  var data = null;
  try {
    data = fs.readFileSync(ncbi_geo_sra_dbgap_cache_publications_location).toString();
    data = data.split('\n');  // get each line
    for (var i = 1; i < data.length; i++) {  // parse each line, skipping the header
      if (data[i] === "") {  // check for empty lines
        continue;
      }
      let line = data[i].split("\t");
      if (line.length !== columns.length) {  // check line integrity
        console.log("NCBI publication cache line corrupted, marking cache file for correction.");
        corrupt_lines = true;
        continue;  // move on to next line
      }
      for (var j = 1; j < line.length; j++) {  // parse columns, index starts at 1 to skip the pmid, which is hard-coded as a key
        if (!ncbi_geo_sra_dbgap_cache_publications[line[0]]) {
          ncbi_geo_sra_dbgap_cache_publications[line[0]] = [];  // the NCBI cache for GEOs, SRAs and DBGaps is a dictionary of pmid keys that point to an array with an accession of each, in that order
        }
        if (ncbi_geo_sra_dbgap_cache_publications[line[0]].indexOf(line[j]) === -1) {
          ncbi_geo_sra_dbgap_cache_publications[line[0]].push(line[j]); // load the cache
        }
      }
    }
    if (corrupt_lines === true) {  // overwrite corrupted cache file with known-good read cache, if any corrupted lines
      console.log("Rewriting cache file due to corrupted line(s).");
      let new_data = columns.join("\t") + "\n";
      const ncbi_keys = Object.keys(ncbi_geo_sra_dbgap_cache_publications);
      for (var i = 0; i < ncbi_keys.length; i++) {
        new_data += ncbi_keys[i] + "\t" + ncbi_geo_sra_dbgap_cache_publications[ncbi_keys[i]].join("\t") + "\n";
      }
      fs.writeFileSync(ncbi_geo_sra_dbgap_cache_publications_location, new_data)
    }
  }
  catch (error) {  // check if the file exists
    // console.log(error);
    console.log("File doesn't exist, writing");
    const header = columns.join("\t") + "\n";
    fs.writeFileSync(ncbi_geo_sra_dbgap_cache_publications_location, header);
  }
}

const writeToNcbiGeoSraDbgapCache = (pmid, geo, sra, dbgap) => {
  let data = "";
  let tmp = [];
  tmp.push(pmid);
  tmp.push(geo);
  tmp.push(sra);
  tmp.push(dbgap);
  data += tmp.join("\t") + "\n";
  fs.appendFileSync(ncbi_geo_sra_dbgap_cache_publications_location, data);
}


const run = async (publications) => {
  console.log("Loading NCBI GEO, SRA and DBGap cache.");
  loadNcbiGeoSraDbgapCache();
  console.log("Number of cached publications for GEOs, SRAs and DBGaps loaded: " + Object.keys(ncbi_geo_sra_dbgap_cache_publications).length);

  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    if (ncbi_geo_sra_dbgap_cache_publications[pmIds[p]]) {  // check for cache hit
      // if (ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][0] !== "") {  // for this publication was there a GEO (empty string means no)
      //   publications[pmIds[p]].geo_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][0]; // 0th index is GEO
      // }
      publications[pmIds[p]].geo_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][0] !== ""?ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][0]:null;
      // if (ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][1] !== "") {  // for this publication was there an SRA (empty string means no)
      //   publications[pmIds[p]].sra_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][1]; // 1st index is SRA
      // }
      publications[pmIds[p]].sra_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][1] !== ""?ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][1]:null;
      // if (ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][2] !== "") {  // for this publication was there a DBGap (empty string means no)
      //   publications[pmIds[p]].dbgap_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][2]; // 2nd index is DBGap
      // }
      publications[pmIds[p]].dbgap_accession = ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][2] !== ""?ncbi_geo_sra_dbgap_cache_publications[pmIds[p]][2]:null;
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
        // publications[pmIds[p]].geos = [];
        let idx_start = d.indexOf("Accession: <");
        let idx_end = 0;
        let tmp = d;
        tmp = tmp.substring(idx_start + 20);
        idx_end = tmp.indexOf("</dd>");
        let str = tmp.substring(0, idx_end);
        // publications[pmIds[p]].geos.push(str);
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
        // publications[pmIds[p]].sras = [];
        let idx = d.indexOf("Items:");
        if(idx === -1){
          //single sra page
          let pos = d.indexOf("Link to SRA Study\">");
          d = d.substring(pos + 19);
          pos = d.indexOf("</a>");
          let accession = d.substring(0, pos);
          // publications[pmIds[p]].sras.push(accession);
          publications[pmIds[p]].sra_accession = accession;
        }
        else {
          // multiple sra results
          let start_idx = d.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
          let tmp = d;
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
              // publications[pmIds[p]].sras.push(accession);
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
        // publications[pmIds[p]].dbgaps = [];
        let idx_start = d.indexOf("font-weight:600");
        let tmp = d;
        tmp = tmp.substring(idx_start + 17);
        idx_start = tmp.indexOf("</span>");
        let str = tmp.substring(0, idx_start);
        // publications[pmIds[p]].dbgaps.push(str);
        publications[pmIds[p]].dbgap_accession = str;
        console.log("DBGap found.")
      }
      else {
        console.log("No DBGap found.");
      }
    }

    // preserve whether there were GEOs, SRAs or DBGaps or not (empty string)
    writeToNcbiGeoSraDbgapCache(pmIds[p], publications[pmIds[p]].geo_accession?publications[pmIds[p]].geo_accession:"",
                                          publications[pmIds[p]].sra_accession?publications[pmIds[p]].sra_accession:"",
                                          publications[pmIds[p]].dbgap_accession?publications[pmIds[p]].dbgap_accession:"");  // there is only ever one accession in these arrays (as populated here)
    console.log("\n");
  }
};

module.exports = {
	run
};