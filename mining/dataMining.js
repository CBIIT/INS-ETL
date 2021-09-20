const fs = require('fs');
const path = require("path");
let _ = require("lodash");
const {
  fetch,
  post,
  getCoreId,
  readCachedPublications,
  readCachedGEOs,
  readCachedSRAs,
  readCachedDBGaps,
  readCachedClinicalTrials
} = require('../common/untils');
const apis = require('../common/apis');

//cache
let cache_publications = {};
let cache_geos = {};
let cache_sras = {};
let cache_dbgaps = {};
let cache_clinicalTrials = {};
//data
let projects = {};
let publications = {};
let geos = {};
let sras = {};
let dbgaps = {};
let clinicalTrials = {};

const loadCachedData = () => {
  cache_publications = readCachedPublications();
  cache_geos = readCachedGEOs();
  for(let g in cache_geos){
    cache_geos[g].publications.map((p) => {
      if(cache_publications[p].geos == undefined){
        cache_publications[p].geos = [];
      }
      cache_publications[p].geos.push(g);
    });
  }
  cache_sras = readCachedSRAs();
  for(let s in cache_sras){
    cache_sras[s].publications.map((p) => {
      if(cache_publications[p].sras == undefined){
        cache_publications[p].sras = [];
      }
      cache_publications[p].sras.push(s);
    });
  }
  cache_dbgaps = readCachedDBGaps();
  for(let d in cache_dbgaps){
    cache_dbgaps[d].publications.map((p) => {
      if(cache_publications[p].dbgaps == undefined){
        cache_publications[p].dbgaps = [];
      }
      cache_publications[p].dbgaps.push(d);
    });
  }
  cache_clinicalTrials = readCachedClinicalTrials();
};

const getGEODataByAccession = async (geo_id) => {
  let gd = await fetch(apis.pmGeoDetailSite + geo_id);
  let pos = 0; 
  if(gd != "failed"){
      pos = gd.indexOf("Status</td>");
      gd = gd.substring(pos + 16);
      pos = gd.indexOf("</td>");
      geos[geo_id].status = gd.substring(0, pos);

      pos = gd.indexOf("justify\">");
      gd = gd.substring(pos + 9);
      pos = gd.indexOf("</td>");
      geos[geo_id].title = gd.substring(0, pos);

      pos = gd.indexOf("Submission date</td>");
      gd = gd.substring(pos + 25);
      pos = gd.indexOf("</td>");
      geos[geo_id].submission_date = gd.substring(0, pos);

      pos = gd.indexOf("Last update date</td>");
      gd = gd.substring(pos + 26);
      pos = gd.indexOf("</td>");
      geos[geo_id].last_update_date = gd.substring(0, pos);
  }
};

const getGEOData = async (pmId) => {
  console.log(`Processing GEO data for: ${pmId}`);
    let d = await fetch(apis.pmGeoSite + pmId);

    if(d != "failed"){
        let idx_start = d.indexOf("Accession: <");
        let idx_end = 0;
        let tmp = d, geo_set = [];
        while(idx_start > -1){
            tmp = tmp.substring(idx_start + 20);
            idx_end = tmp.indexOf("</dd>");
            let str = tmp.substring(0, idx_end);
            geo_set.push(str);
            tmp = tmp.substring(idx_end);
            idx_start = tmp.indexOf("Accession: <");
        }
        let arr = [];
        for(let g = 0; g < geo_set.length; g++){
            let geo_id = geo_set[g];
            gd = await fetch(apis.pmGeoDetailSite + geo_id);
            let pos = 0; 
            if(gd != "failed"){
                let geo = {};
                geo.accession = geo_id;
                pos = gd.indexOf("Status</td>");
                gd = gd.substring(pos + 16);
                pos = gd.indexOf("</td>");
                geo.status = gd.substring(0, pos);

                pos = gd.indexOf("justify\">");
                gd = gd.substring(pos + 9);
                pos = gd.indexOf("</td>");
                geo.title = gd.substring(0, pos);

                pos = gd.indexOf("Submission date</td>");
                gd = gd.substring(pos + 25);
                pos = gd.indexOf("</td>");
                geo.submission_date = gd.substring(0, pos);

                pos = gd.indexOf("Last update date</td>");
                gd = gd.substring(pos + 26);
                pos = gd.indexOf("</td>");
                geo.last_update_date = gd.substring(0, pos);
                arr.push(geo);
            }
        }
        return arr;
    }
    else{
        return "";
    }
}

const getSRADataByAccession = async (srp, publications) => {
  let d = await fetch(apis.pmSrpDetailSite + srp);
  if(d != "failed"){
    let idx = d.indexOf("h1>");
    d = d.substring(idx + 3);
    let idx_end = d.indexOf("</h1>");
    sras[srp].study_title = d.substring(0, idx_end);
    idx = d.indexOf("bioproject\/");
    d = d.substring(idx);
    idx_end = d.indexOf("\">");
    sras[srp].bio_accession = d.substring(11, idx_end);
    let bioproject_detail = await fetch(apis.pmBioprojectDetailSite + sras[srp].bio_accession);
    if(bioproject_detail != "failed"){
        let acc = "";
        pos  = bioproject_detail.indexOf(sras[srp].bio_accession+";");
        bioproject_detail = bioproject_detail.substring(pos);
        pos = bioproject_detail.indexOf("</td>");
        acc = bioproject_detail.substring(0, pos);
        let arr_geo = acc.split(";");
        sras[srp].geo = arr_geo[1].trim().substring(5);
        if(!(sras[srp].geo in geos)){
          geos[sras[srp].geo] = {};
          geos[sras[srp].geo].publications = [];
        }
        geos[sras[srp].geo].publications = _.concat(geos[sras[srp].geo].publications, publications);
        geos[sras[srp].geo].publications = _.uniq(geos[sras[srp].geo].publications);

        pos = bioproject_detail.indexOf("Registration date");
        sras[srp].reg_date = bioproject_detail.substring(pos+19, pos + 30);
    }
  }
  
};

const getSRAData = async (pmId) => {
  console.log(`Processing SRA data for: ${pmId}`);
    let d = await fetch(apis.pmSraSite + pmId);

    if(d != "failed"){
        let idx = d.indexOf("Items:");
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
        let arr = [];
        let sra_detail = await fetch(apis.pmSraDetailSite + accession_0 + "[accn]");
        let pos = 0; 
        if(sra_detail != "failed"){
            let sra = {};
            pos  = sra_detail.indexOf("Study: ");
            sra_detail = sra_detail.substring(pos + 13);
            pos = sra_detail.indexOf("<div class=\"expand-body\">");
            sra.study_title = sra_detail.substring(0, pos);

            pos = sra_detail.indexOf("Link to BioProject\">");
            sra_detail = sra_detail.substring(pos + 20);
            pos = sra_detail.indexOf("</a>");
            sra.bio_accession = sra_detail.substring(0, pos);

            pos = sra_detail.indexOf("Link to SRA Study\">");
            sra_detail = sra_detail.substring(pos + 19);
            pos = sra_detail.indexOf("</a>");
            sra.accession = sra_detail.substring(0, pos);
            
            //find GEO 
            let bioproject_detail = await fetch(apis.pmBioprojectDetailSite + sra.bio_accession);
            if(bioproject_detail != "failed"){
                let acc = "";
                pos  = bioproject_detail.indexOf(sra.bio_accession+";");
                bioproject_detail = bioproject_detail.substring(pos);
                pos = bioproject_detail.indexOf("</td>");
                acc = bioproject_detail.substring(0, pos);
                let arr_geo = acc.split(";");
                console.log(arr_geo);
                sra.geo = arr_geo[1].trim().substring(5);

                pos = bioproject_detail.indexOf("Registration date");
                sra.reg_date = bioproject_detail.substring(pos+19, pos + 30);
            }
            arr.push(sra);
        }
        return arr;
    }
    else {
        return "";
    }
}

const getDBGapDataByAccession = async (accession) => {
  let dbgap_detail = await fetch(apis.pmDbgapDetailSite + accession);
  let pos = 0; 
  if(dbgap_detail != "failed"){
      pos  = dbgap_detail.indexOf("name=\"study-name\"");
      dbgap_detail = dbgap_detail.substring(pos + 19);
      pos = dbgap_detail.indexOf("</span>");
      dbgaps[accession].title = dbgap_detail.substring(0, pos);

      pos = dbgap_detail.indexOf("<b>Release Date:");
      dbgap_detail = dbgap_detail.substring(pos + 20);
      pos = dbgap_detail.indexOf("</li>");
      dbgaps[accession].release_date = dbgap_detail.substring(0, pos);
  }
};

const getDBGapData = async (pmId) => {
  console.log(`Processing DBGap data for: ${pmId}`);
    let d = await fetch(apis.pmDbgapSite + pmId);

    if(d != "failed"){
        let idx_start = d.indexOf("font-weight:600");
        let tmp = d, dbgap_set = [];
        while(idx_start > -1){
            tmp = tmp.substring(idx_start + 17);
            idx_start = tmp.indexOf("</span>");
            let str = tmp.substring(0, idx_start);
            dbgap_set.push(str);
            idx_start = tmp.indexOf("font-weight:600");
        }

        let arr = [];

        for(let k = 0; k < dbgap_set.length; k++){
            let study_id = dbgap_set[k];
            let dbgap_detail = await fetch(apis.pmDbgapDetailSite + study_id);
            let pos = 0; 
            if(dbgap_detail != "failed"){
                let dbgap = {};
                dbgap.accession = study_id;

                pos  = dbgap_detail.indexOf("name=\"study-name\"");
                dbgap_detail = dbgap_detail.substring(pos + 19);
                pos = dbgap_detail.indexOf("</span>");
                dbgap.title = dbgap_detail.substring(0, pos);

                pos = dbgap_detail.indexOf("<b>Release Date:");
                dbgap_detail = dbgap_detail.substring(pos + 20);
                pos = dbgap_detail.indexOf("</li>");
                dbgap.release_date = dbgap_detail.substring(0, pos);
                arr.push(dbgap);
            }
        }

        return arr;
    }
    else {
        return "";
    }
}

const getClinicaltrialDataByAccession = async (clinicaltrialID) => {
  let d = await fetch(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID);
  if(d != "failed"){
    let idx = d.indexOf("tr-solo_record");
    d = d.substring(idx + 16);
    idx = d.indexOf("</h1>");
    clinicalTrials[clinicaltrialID].title = d.substring(0, idx);
    idx = d.indexOf("data-term=\"recruitment status\"");
    d = d.substring(idx);
    idx = d.indexOf("</span>");
    d = d.substring(idx + 7);
    let status = d.substring(0, d.indexOf("<div")).replace(" :", "").trim();
    clinicalTrials[clinicaltrialID].recruitment_status = status.indexOf("Terminated") > -1 ? "Terminated" : status;
    idx = d.indexOf(">Last Update Posted <i");
    d = d.substring(idx);
    idx = d.indexOf("</span>");
    d = d.substring(idx + 7);
    let last_update_posted = d.substring(0, d.indexOf("</div"));
    clinicalTrials[clinicaltrialID].last_update_posted = last_update_posted.replace(" :", "").trim();
  }
};

const getClinicalTrials = async () => {
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    console.log(`Processing Clinical Trials data for project: ${projectNums[i]}`);
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_core_id = getCoreId(projectNums[i]);
      let d = await fetch(apis.clinicalTrialsSite + project_core_id);
      if(d != "failed"){
          let idx = d.indexOf("/ct2/results/rpc/");
          d = d.substring(idx + 17);
          idx = d.indexOf("\",");
          let session = d.substring(0, idx);
          let dt = await fetch(apis.clinicalTrialsApi + session);
          dt.data.map((item) => {
              let str = item[3].substring(item[3].indexOf("\">") + 2);
              str = str.substring(0, str.length - 4);
              let status = item[2].substring(item[2].indexOf("\">") + 2);
              status = status.substring(0, status.indexOf("</span><br/>"));
              if(!(item[1] in clinicalTrials)){
                clinicalTrials[item[1]] = {};
                clinicalTrials[item[1]].title = str;
                clinicalTrials[item[1]].recruitment_status = status;
                clinicalTrials[item[1]].last_update_posted = item[22];
                clinicalTrials[item[1]].publications = [];
                clinicalTrials[item[1]].projects = [];
              }
              if(clinicalTrials[item[1]].projects.indexOf(projectNums[i]) == -1){
                clinicalTrials[item[1]].projects.push(projectNums[i]);
              }
              
          });
      }
    }
  }
}

const getFromPM = async () => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    if(cache_publications[pmIds[p]]){
      console.log(`Found Research Output data in cache for : ${pmIds[p]}`);
      publications[pmIds[p]] = cache_publications[pmIds[p]];
      if(cache_publications[pmIds[p]].geos){
        cache_publications[pmIds[p]].geos.map((g) => {
          geos[g] = cache_geos[g];
        });
      }
      if(cache_publications[pmIds[p]].sras){
        cache_publications[pmIds[p]].sras.map((s) => {
          sras[s] = cache_sras[s];
        });
      }
      
      if(cache_publications[pmIds[p]].dbgaps){
        cache_publications[pmIds[p]].dbgaps.map((d) => {
          dbgaps[d] = cache_dbgaps[d];
        });
      }
      
      continue;
    }
    else{
      console.log(`Collecting Research Output data from PubMed for : ${pmIds[p]}`);
      let d = await fetch(apis.pmArticleSite + pmIds[p] +'/');
      let outputs = "";
      if(d != "failed"){
        let idx = d.indexOf("related-links-list");
        if(idx > -1){
            let tmp = d.substring(idx - 11);
            let idx_end = tmp.indexOf("</ul>");
            outputs = tmp.substring(0, idx_end + 5);
            //Get GEO DataSets
            if(outputs.indexOf("Related GEO DataSets") > -1){
                let dt = await getGEOData(pmIds[p]);
                if(dt != ""){
                    dt.map((d) => {
                        if(!(d.accession in geos)){
                          geos[d.accession] = {};
                          geos[d.accession].status = d.status;
                          geos[d.accession].title = d.title;
                          geos[d.accession].submission_date = d.submission_date;
                          geos[d.accession].last_update_date = d.last_update_date;
                          geos[d.accession].publications = [];
                        }
                        if(geos[d.accession].publications.indexOf(pmIds[p]) == -1){
                          geos[d.accession].publications.push(pmIds[p]);
                        }
                    });
                }
                
            }
            if(outputs.indexOf("Links to Short Read Archive Experiments") > -1){
                let dt = await getSRAData(pmIds[p]);
                if(dt != ""){
                    dt.map((d) => {
                        if(!(d.accession in sras)){
                          sras[d.accession] = {};
                          sras[d.accession].study_title = d.study_title;
                          sras[d.accession].bio_accession = d.bio_accession;
                          sras[d.accession].reg_date = d.reg_date;
                          sras[d.accession].publications = [];
                        }
                        if(sras[d.accession].publications.indexOf(pmIds[p]) == -1){
                          sras[d.accession].publications.push(pmIds[p]);
                        }
                        
                        if(d.geo){
                          if(!(d.geo in geos)){
                            geos[d.geo] = {};
                            geos[d.geo].publications = [];
                          }
                          if(geos[d.geo].publications.indexOf(pmIds[p])  == -1){
                            geos[d.geo].publications.push(pmIds[p]);
                          }
                        }
                        
                    });
                }
            }
            if(outputs.indexOf("Related dbGaP record") > -1){
                let dt = await getDBGapData(pmIds[p]);
                if(dt != ""){
                    dt.map((d) => {
                        if(!(d.accession in dbgaps)){
                          dbgaps[d.accession] = {};
                          dbgaps[d.accession].title = d.title;
                          dbgaps[d.accession].release_date = d.release_date;
                          dbgaps[d.accession].publications = [];
                        }
                        if(dbgaps[d.accession].publications.indexOf(pmIds[p]) == -1){
                          dbgaps[d.accession].publications.push(pmIds[p]);
                        }
                        
                    });
                }
            }
        } 
      }
    }
    
  }
}

const getMoreFromPMC = async () => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting More data from PubMed Central for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    let pmcId = publications[pmIds[p]].pmc_id;
    if(pmcId){
      let content = {};
      let d = await fetch(apis.pmcApiPrefix + pmcId +'/');
      if(d != "failed"){
        //remove reference-list part and then search
        let idx_start = d.indexOf("reference-list");
        d = d.substring(0, idx_start);

        let cache = [];
        //Look for GEO
        content.geo = [];
        let gs = d.match(/GSE[0-9]{5,6}/g);
        if(gs != null && gs.length > 0){
          gs.map(function(geo){
              if(!(geo in geos)){
                geos[geo] = {};
                geos[geo].publications = [];
              }
              if(geos[geo].publications.indexOf(pmIds[p]) == -1){
                geos[geo].publications.push(pmIds[p]);
              }
            })
        }

        /*
        cache = [];
        //Look for SRA
        content.sra = [];
        let sras = d.match(/SRX[0-9]{7}/g);
        if(sras != null && sras.length > 0){
            sras.map(function(sra){
                if(cache.indexOf(sra) == -1){
                    content.sra.push(sra);
                    cache.push(sra);
                }
            })
        }
        */

        cache = [];
        srps = d.match(/SRP[0-9]{6}/g);
        if(srps != null && srps.length > 0){
            srps.map(function(srp){
                if(!(srp in sras)){
                  sras[srp] = {};
                  sras[srp].publications = [];
                }
                if(sras[srp].publications.indexOf(pmIds[p]) == -1){
                  sras[srp].publications.push(pmIds[p]);
                }
            })
        }
        //Look for dbGaP
        cache = [];
        content.dbgap = [];
        let phses = d.match(/phs[0-9]{6}.v{0-9}.p{0-9}/g);
        if(phses != null && phses.length > 0){
            phses.map(function(phs){
                if(!(phs in dbgaps)){
                  dbgaps[phs] = {};
                  dbgaps[phs].publications = [];
                }
                if(dbgaps[phs].publications.indexOf(pmIds[p]) == -1){
                  dbgaps[phs].publications.push(pmIds[p]);
                }
                
            })
        }
        /*
        //Look for PRJNA
        cache = [];
        content.prjna = [];
        let prjnas = d.match(/PRJNA[0-9]{6}/g);
        if(prjnas != null && prjnas.length > 0){
            prjnas.map(function(prjna){
                if(cache.indexOf(prjna) == -1){
                    content.prjna.push(prjna);
                    cache.push(prjna);
                }
            })
        }
        */

        //Look for clinical trials number
        cache = [];
        content.clinical_trials = [];
        let cts = d.match(/NCT[0-9]{8}/g);
        if(cts != null && cts.length > 0){
            cts.map(function(ct){
                if(!(ct in clinicalTrials)){
                  clinicalTrials[ct] = {};
                  clinicalTrials[ct].publications = [];
                  clinicalTrials[ct].projects = [];
                }
                if(clinicalTrials[ct].publications.indexOf(pmIds[p]) == -1){
                  clinicalTrials[ct].publications.push(pmIds[p]);
                }
                
            })
        }
      }
    }
  }
}

const getPMCFromPM = async () => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    if(cache_publications[pmIds[p]]){
      console.log(`Found PubMed Central ID in cache for : ${pmIds[p]}`);
      continue;
    }
    else{
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
      }
    }
    
  }
}

const getPM = async () => {
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    let count = 0;
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_core_id = getCoreId(projectNums[i]);
      let d = await fetch(apis.pmWebsite +  project_core_id +"&sort=date&size=50");
      let idx_start = d.indexOf("data-article-id=");
      let tmp = d;
      while(idx_start > -1){
          tmp = tmp.substring(idx_start + 17);
          let str = tmp.substring(0, 8);
          if(str.length !== 8){
            console.log(tmp);
            console.log(str);
          }
          if(!(str in publications)){
            publications[str] = {};
            publications[str].projects = [];
          }
          publications[str].projects.push(projectNums[i]);
          count++;
          idx_start = tmp.indexOf("data-article-id=");
      }
    }
    console.log(`Collected ${count} Publications from PubMed for project: ${projectNums[i]}`);
  }

  await getIciteData();
}

const getProjectInfo = async () => {
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    let body = {};
    body.criteria = {};
    body.criteria.project_nums = [];
    body.criteria.project_nums.push(projectNums[i]);
    body.offset = 0;
    body.limit = 100;
    body.sort_field = "fiscal_year";
    body.sort_order = "desc";
    let d = await post(apis.nihReporterApi, body);
    if(d.meta && d.meta.total > 0){
      for(let j = 0; j < d.results.length ; j++){
        if(d.results[j].subproject_id === null){
          let dt = d.results[j];
          projects[projectNums[i]].project_id = dt.project_num;
          projects[projectNums[i]].application_id = dt.appl_id;
          projects[projectNums[i]].fiscal_year = dt.fiscal_year;
          projects[projectNums[i]].project_title = dt.project_title;
          projects[projectNums[i]].abstract_text = dt.abstract_text;
          projects[projectNums[i]].keywords = dt.pref_terms;
          projects[projectNums[i]].org_name = dt.organization.org_name;
          projects[projectNums[i]].org_city = dt.organization.org_city;
          projects[projectNums[i]].org_state = dt.organization.org_state;
          projects[projectNums[i]].org_country = dt.organization.org_country;
          let investigators = [];
          dt.principal_investigators.map((pi) => {
            investigators.push(pi.full_name);
          });
          projects[projectNums[i]].principal_investigators = investigators.join();
          let officers = [];
          dt.program_officers.map((po) => {
            officers.push(po.full_name);
          });
          projects[projectNums[i]].program_officers = officers.join();
          projects[projectNums[i]].award_amount = dt.award_amount;
          let fundedAmount = 0;
          dt.agency_ic_fundings.map((aif) => {
            if(aif.code === "CA"){
              fundedAmount += aif.total_cost;
            }
          });
          projects[projectNums[i]].nci_funded_amount = fundedAmount;
          projects[projectNums[i]].award_notice_date = dt.award_notice_date;
          projects[projectNums[i]].project_start_date = dt.project_start_date;
          projects[projectNums[i]].project_end_date = dt.project_end_date;
          projects[projectNums[i]].full_foa = dt.full_foa;
          break;
        }
      }
    }
    
  }
};

const getIciteData = async () => {
  const pmIds = Object.keys(publications);
  const publicaiton2remove = [];
  for(let p = 0; p < pmIds.length; p++){
    let d = await fetch(apis.iciteApi +  pmIds[p]);
    if(d.data.length > 0){
      let pmData = d.data[0];
      publications[pmIds[p]].journal = pmData.journal;
      publications[pmIds[p]].title = pmData.title.replace(/\n/g,"").replace(/<i>/g,"").replace(/<\/i>/g,"").replace(/<sup>/g,"").replace(/<\/sup>/g,"").replace(/<b>/g,"").replace(/<\/b>/g,"");
      publications[pmIds[p]].authors = pmData.authors;
      publications[pmIds[p]].year = pmData.year;
      if(parseInt(pmData.year) < 2014){
        publicaiton2remove.push(pmIds[p]);
      }
      publications[pmIds[p]].citation_count = pmData.citation_count;
      publications[pmIds[p]].doi = pmData.doi;
      publications[pmIds[p]].relative_citation_ratio = pmData.relative_citation_ratio;
      publications[pmIds[p]].nih_percentile = pmData.nih_percentile;
      console.log(`Updated Publication data from icite for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    }
  }
  //remove old publications 
  publicaiton2remove.map((p2r) => {
    delete publications[p2r];
  });
  console.log(`Removed ${publicaiton2remove.length} Publications earlier before 2014`);
};

const generateDataModel = async () => {
  //clear up data such as GEO, SRA, dbGap, clinicaltrial
  
  for(let sra in sras){
    let sraData = sras[sra];
    if(sraData.bio_accession == undefined){
      console.log("collecting additional SRA Data for:" + sra);
      await getSRADataByAccession(sra, sraData.publications);
    }
    sraData.projects = [];
    for(let p = 0; p < sraData.publications.length; p++){
      sraData.projects = _.concat(sraData.projects, publications[sraData.publications[p]].projects);
    }
    sraData.projects = _.uniq(sraData.projects);
  }
  for(let dbgap in dbgaps){
    let dbgapData = dbgaps[dbgap];
    if(dbgapData.title == undefined){
      console.log("collecting additional DBGap Data for:" + dbgap);
      await getDBGapDataByAccession(dbgap);
    }
    dbgapData.projects = [];
    for(let p = 0; p < dbgapData.publications.length; p++){
      dbgapData.projects = _.concat(dbgapData.projects, publications[dbgapData.publications[p]].projects);
    }
    dbgapData.projects = _.uniq(dbgapData.projects);
  }
  for(let geo in geos){
    let geoData = geos[geo];
    if(geoData.title == undefined){
      console.log("collecting additional GEO Data for:" + geo);
      await getGEODataByAccession(geo);
    }
    geoData.projects = [];
    for(let p = 0; p < geoData.publications.length; p++){
      geoData.projects = _.concat(geoData.projects, publications[geoData.publications[p]].projects);
    }
    geoData.projects = _.uniq(geoData.projects);
  }
  for(let clinicaltrial in clinicalTrials){
    let clinicaltrialData = clinicalTrials[clinicaltrial];
    if(clinicaltrialData.title == undefined){
      console.log("collecting additional Clinical Trial Data for:" + clinicaltrial);
      await getClinicaltrialDataByAccession(clinicaltrial);
    }
    for(let p = 0; p < clinicaltrialData.publications.length; p++){
      clinicaltrialData.projects = _.concat(clinicaltrialData.projects, publications[clinicaltrialData.publications[p]].projects);
    }
    clinicaltrialData.projects = _.uniq(clinicaltrialData.projects);
  }
  //console.log(projects);
  console.log(publications);
  console.log(geos);
  console.log(sras);
  console.log(dbgaps);
  console.log(clinicalTrials);
}

const writeToJsonFile = () => {
  let output_file_path = path.join(
    __dirname,
    "..",
    "common",
    "data_files",
    "ins_publications.js"
  );
  fs.writeFileSync(
    output_file_path,
    JSON.stringify(publications),
    (err) => {
      if (err) return logger.error(err);
    }
  );

  output_file_path = path.join(
    __dirname,
    "..",
    "common",
    "data_files",
    "ins_geos.js"
  );
  fs.writeFileSync(
    output_file_path,
    JSON.stringify(geos),
    (err) => {
      if (err) return logger.error(err);
    }
  );

  output_file_path = path.join(
    __dirname,
    "..",
    "common",
    "data_files",
    "ins_sras.js"
  );
  fs.writeFileSync(
    output_file_path,
    JSON.stringify(sras),
    (err) => {
      if (err) return logger.error(err);
    }
  );

  output_file_path = path.join(
    __dirname,
    "..",
    "common",
    "data_files",
    "ins_dbgaps.js"
  );
  fs.writeFileSync(
    output_file_path,
    JSON.stringify(dbgaps),
    (err) => {
      if (err) return logger.error(err);
    }
  );

  output_file_path = path.join(
    __dirname,
    "..",
    "common",
    "data_files",
    "ins_clinicalTrials.js"
  );
  fs.writeFileSync(
    output_file_path,
    JSON.stringify(clinicalTrials),
    (err) => {
      if (err) return logger.error(err);
    }
  );
};

const writeToProjectFile = () => {
  let data = "";
  let columns = ["type","project_id","application_id", "fiscal_year", "project_title","project_type", "abstract_text", "keywords",
   "org_name", "org_city", "org_state", "org_country", "principal_investigators", "lead_doc", "program_officers", "award_amount",
    "nci_funded_amount", "award_notice_date", "project_start_date", "project_end_date", "full_foa", "program.program_id"];
  data = columns.join("\t") + "\n";
  for(let projectID in projects){
    let tmp = [];
    tmp.push("project");
    tmp.push(projects[projectID].project_id);
    tmp.push(projects[projectID].application_id);
    tmp.push(projects[projectID].fiscal_year);
    tmp.push(projects[projectID].project_title);
    tmp.push(projects[projectID].project_type);
    tmp.push(projects[projectID].abstract_text == null ? "" : projects[projectID].abstract_text.replace(/\n/g, "\\n"));
    tmp.push(projects[projectID].keywords);
    tmp.push(projects[projectID].org_name);
    tmp.push(projects[projectID].org_city);
    tmp.push(projects[projectID].org_state);
    tmp.push(projects[projectID].org_country);
    tmp.push(projects[projectID].principal_investigators);
    tmp.push(projects[projectID].lead_doc);
    tmp.push(projects[projectID].program_officers);
    tmp.push(projects[projectID].award_amount);
    tmp.push(projects[projectID].nci_funded_amount);
    tmp.push(projects[projectID].award_notice_date);
    tmp.push(projects[projectID].project_start_date);
    tmp.push(projects[projectID].project_end_date);
    tmp.push(projects[projectID].full_foa);
    tmp.push(projects[projectID].program);
    data += tmp.join("\t") + "\n";
  }
  fs.writeFileSync('data/project.tsv', data);
};

const writeToPublicationFile = () => {
  let data = "";
  let columns = ["type","publication_id","pmc_id", "year", "journal","title", "authors",
   "publish_date", "citation_count", "relative_citation_ratio", "nih_percentile", "doi", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let pubID in publications){
    let tmp = [];
    tmp.push("publication");
    tmp.push(pubID);
    tmp.push(publications[pubID].pmc_id);
    tmp.push(publications[pubID].year);
    tmp.push(publications[pubID].journal);
    tmp.push(publications[pubID].title);
    tmp.push(publications[pubID].authors);
    tmp.push(publications[pubID].publish_date);
    tmp.push(publications[pubID].citation_count);
    tmp.push(publications[pubID].relative_citation_ratio);
    tmp.push(publications[pubID].nih_percentile);
    tmp.push(publications[pubID].doi);
    publications[pubID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/publication.tsv', data);
};

const writeToGEOFile = () => {
  let data = "";

  let columns = ["type","accession","title", "status", "submission_date","last_update_date", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let geoID in geos){
    let tmp = [];
    tmp.push("geo");
    tmp.push(geoID);
    tmp.push(geos[geoID].title);
    tmp.push(geos[geoID].status);
    tmp.push(geos[geoID].submission_date);
    tmp.push(geos[geoID].last_update_date);
    geos[geoID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/geo.tsv', data);
};

const writeToSRAFile = () => {
  let data = "";
  let columns = ["type","accession","study_title", "bioproject_accession", "registration_date","project.project_id"];
  data = columns.join("\t") + "\n";
  for(let sraID in sras){
    let tmp = [];
    tmp.push("sra");
    tmp.push(sraID);
    tmp.push(sras[sraID].study_title);
    tmp.push(sras[sraID].bio_accession);
    tmp.push(sras[sraID].reg_date);
    sras[sraID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/sra.tsv', data);
};

const writeToDBGapFile = () => {
  let data = "";
  let columns = ["type", "accession", "title", "release_date", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let dbgapID in dbgaps){
    let tmp = [];
    tmp.push("dbgap");
    tmp.push(dbgapID);
    tmp.push(dbgaps[dbgapID].title);
    tmp.push(dbgaps[dbgapID].release_date);
    dbgaps[dbgapID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/dbgap.tsv', data);
};

const writeToClinicalTrialsFile = () => {
  let data = "";
  let columns = ["type", "clinical_trial_id", "title", "last_update_posted", "recruitment_status", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let clinicaltrialID in clinicalTrials){
    let tmp = [];
    tmp.push("clinical_trial");
    tmp.push(clinicaltrialID);
    tmp.push(clinicalTrials[clinicaltrialID].title);
    tmp.push(clinicalTrials[clinicaltrialID].last_update_posted);
    tmp.push(clinicalTrials[clinicaltrialID].recruitment_status);
    clinicalTrials[clinicaltrialID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/clinical_trial.tsv', data);
};

const run = async (projectsTodo) => {
  projects = projectsTodo;
	loadCachedData();

  await getProjectInfo();
  await getPM();
  await getPMCFromPM();
  await getFromPM();
  await getMoreFromPMC();
  await getClinicalTrials();

  await generateDataModel();

  writeToJsonFile();

  writeToProjectFile();
  writeToPublicationFile();
  writeToGEOFile();
  writeToSRAFile();
  writeToDBGapFile();
  writeToClinicalTrialsFile();

};

module.exports = {
	run
};