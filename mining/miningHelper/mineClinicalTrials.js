const {
  fetch,
  getCoreId,
  fetchWithStatusCheck,
  getActivityCode,
} = require('../../common/utils');
const apis = require('../../common/apis');
const fs = require('fs');
const {
  loadCache,
  writeToCache
} = require('../miningHelper/miningCacher');


// caching feature for pubmed clinical trials by publication
// we only want to cache clinical trials for publications because publications are final,
//  projects are not, the number of clinical trials associated with a project may change over time
let pubmed_clinicaltrial_cache_publications = {};
const pubmed_clinicaltrial_cache_publications_location = "config/pubmed_clinicaltrial_publications_cache.tsv";
const pubmed_clinicaltrial_cache_publications_columns = ["publication", "clinical_trial_id"];

const formatCache = () => {
  const keys = Object.keys(pubmed_clinicaltrial_cache_publications);
  for (var i = 0; i < keys.length; i++) {
    if (pubmed_clinicaltrial_cache_publications[keys[i]]["clinical_trial_id"] === "") {
      pubmed_clinicaltrial_cache_publications[keys[i]]["clinical_trial_id"] = [""];
    }
    else {
      pubmed_clinicaltrial_cache_publications[keys[i]]["clinical_trial_id"] = pubmed_clinicaltrial_cache_publications[keys[i]]["clinical_trial_id"].split(",");  // turn a comma delimited string into an array of values
    }
  }
};

// mine clinical trials by project and publication
const run = async (projects, publications, clinicalTrials) => {
  console.log("Loading PubMed clinical trial cache.");
  pubmed_clinicaltrial_cache_publications = loadCache(pubmed_clinicaltrial_cache_publications_location, pubmed_clinicaltrial_cache_publications_columns);
  formatCache();
  console.log("Number of cached publications for clinical trials loaded: " + Object.keys(pubmed_clinicaltrial_cache_publications).length);

  // mine clinical trials by project
  let repeats = [];
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    console.log(`Collecting Clinical Trials data for project: ${projectNums[i]}`);
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_activity_code = getActivityCode(projectNums[i]);
      let project_core_id = getCoreId(projectNums[i]);
      let term = project_activity_code + project_core_id;
      
      // project core ids may not be unique
      if (repeats.indexOf(term) > -1) {
        console.log("Project ID " + projectNums[i] + " line item skipped to optimize results for group " + term + "\n");
        continue;
      }
      else {
        repeats.push(term);
      }

      console.log("Getting clinical trials session for project: " + term);
      console.log(apis.clinicalTrialsSite + term);

      // only fail on HTTP error code 404, otherwise keep trying
      let d = await fetchWithStatusCheck(apis.clinicalTrialsSite + term, 404);

      if (d != null) {
        let idx = d.indexOf("/ct2/results/rpc/");
        d = d.substring(idx + 17);
        idx = d.indexOf("\",");
        let session = d.substring(0, idx);
        console.log("Getting clinical trials for session: " + apis.clinicalTrialsApi + session);
        let dt = await fetch(apis.clinicalTrialsApi + session, true);  // true is keep trying
        if(dt && dt.data){
          dt.data.forEach((item) => {
            if(!projects[projectNums[i]].clinicalTrials){
              projects[projectNums[i]].clinicalTrials = [];
            }
            if(projects[projectNums[i]].clinicalTrials.indexOf(item[1]) === -1){
              // associate clinical trial id only with project
              projects[projectNums[i]].clinicalTrials.push(item[1]);
            }
            // save clinical trial id in clinicalTrials data structure to be populated with details later
            if (!clinicalTrials[item[1]]) {
              clinicalTrials[item[1]] = {};
            }
            if (!clinicalTrials[item[1]].projects) {
              clinicalTrials[item[1]].projects = [];
            }
            // preserve the project that this clinical trial came from, we search by core id, but want the activity code and core id association
            if (clinicalTrials[item[1]].projects.indexOf(term) === -1) {
              clinicalTrials[item[1]].projects.push(term);
            }
          });
        }
      }
    }
    console.log(`Collected ${projects[projectNums[i]].clinicalTrials ? projects[projectNums[i]].clinicalTrials.length : 0} Clinical Trials for project: ${projectNums[i]} [project ${i+1} of ${projectNums.length}]\n`);
  }

  // mine clinical trials by publication
  let publicationNums = Object.keys(publications);
  for (var i = 0; i < publicationNums.length; i++) {
    console.log(`Collecting Clinical Trials data for publication: ${publicationNums[i]}`);
    console.log(apis.pmArticleSite + publicationNums[i]);

    // check for a cache hit
    if (pubmed_clinicaltrial_cache_publications[publicationNums[i]]) {
      console.log("PubMed cache hit for publication: " + publicationNums[i]);
      if (pubmed_clinicaltrial_cache_publications[publicationNums[i]]["clinical_trial_id"].indexOf("") > -1) {  // the presence of an empty string means empty array (no clinical trials)
        publications[publicationNums[i]].clinicalTrials = [];
      }
      else {
        publications[publicationNums[i]].clinicalTrials = pubmed_clinicaltrial_cache_publications[publicationNums[i]]["clinical_trial_id"];  // store clinical trials in publications data structure
        pubmed_clinicaltrial_cache_publications[publicationNums[i]]["clinical_trial_id"].forEach((ct) => {
          if (!clinicalTrials[ct]) {
            clinicalTrials[ct] = {};
          }
          if (!clinicalTrials[ct].publications) {
            clinicalTrials[ct].publications = [];
          }
          clinicalTrials[ct].publications.push(publicationNums[i]);  // associate publications with their clinical trials in the clinical trials data structure
        });
      }
      continue;
    }

    // only fail on HTTP error code 404, otherwise keep trying
    let d = await fetchWithStatusCheck(apis.pmArticleSite + publicationNums[i], 404);

    if (d != null) {
      let tmp = d;
      idx_start = tmp.indexOf("id=\"supplemental-data-ClinicalTrials.gov-NCT");  // 41 characters before 'NCT'
      while (idx_start > -1) {
        let clinical_trial = tmp.substring(idx_start+41,idx_start+52);  // clinical trials have 11 characters, 'NCT' and then 8 numerals
        if (!publications[publicationNums[i]].clinicalTrials) {
          publications[publicationNums[i]].clinicalTrials = []
        }
        if(publications[publicationNums[i]].clinicalTrials.indexOf(clinical_trial) === -1){
          // associate clinical trial id only with publication
          publications[publicationNums[i]].clinicalTrials.push(clinical_trial);
        }
        // save clinical trial id in clinicalTrials data structure to be populated with details later
        if (!clinicalTrials[clinical_trial]) {
          clinicalTrials[clinical_trial] = {};
        }
        if (!clinicalTrials[clinical_trial].publications) {
          clinicalTrials[clinical_trial].publications = [];
        }
        // preserve the publication that this clinical trial came from
        if (clinicalTrials[clinical_trial].publications.indexOf(publicationNums[i]) === -1) {
          clinicalTrials[clinical_trial].publications.push(publicationNums[i]);
        }
        tmp = tmp.substring(idx_start+52);  // iterate past this clinical trial
        idx_start = tmp.indexOf("id=\"supplemental-data-ClinicalTrials.gov-NCT");  // get the next clinical trial if it is there
      }
      if (!publications[publicationNums[i]].clinicalTrials) {
        writeToCache(pubmed_clinicaltrial_cache_publications_location, [publicationNums[i], ""]);  // if there were no clinical trials for a publication, we want to preserve that with the empty string
      }
      else {
        writeToCache(pubmed_clinicaltrial_cache_publications_location, [publicationNums[i], publications[publicationNums[i]].clinicalTrials.join(",")])  // save the clinical trials for this publication as a csv string in the clinical_trial_id column
      }
    }
    console.log(`Collected ${publications[publicationNums[i]].clinicalTrials ? publications[publicationNums[i]].clinicalTrials.length : 0} Clinical Trials for publication: ${publicationNums[i]} [publication ${i+1} of ${publicationNums.length}]\n`);
  }
};

module.exports = {
	run
};