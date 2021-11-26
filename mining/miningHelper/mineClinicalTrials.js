const {
  fetch,
  getCoreId,
  fetchWithStatusCheck,
} = require('../../common/utils');
const apis = require('../../common/apis');

// mine clinical trials by project and publication
const run = async (projects, publications, clinicalTrials) => {
  // mine clinical trials by project
  let repeats = [];
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    console.log(`Collecting Clinical Trials data for project: ${projectNums[i]}`);
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_core_id = getCoreId(projectNums[i]);
      // project core ids may not be unique
      if (project_core_id in repeats) {
        console.log("Project ID " + projectNums[i] + " line item skipped to optimize results for group " + project_core_id + "\n");
        continue;
      }
      else {
        repeats.push(project_core_id);
      }
      console.log("Getting clinical trials session for project: " + project_core_id);
      console.log(apis.clinicalTrialsSite + project_core_id);

      // only fail on HTTP error code 404, otherwise keep trying
      let d = await fetchWithStatusCheck(apis.clinicalTrialsSite + project_core_id, 404);

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
              // save clinical trial id in clinicalTrials data structure to be populated with details later
              if (!clinicalTrials[item[1]]) {
                clinicalTrials[item[1]] = {};
              }
              if (!clinicalTrials[item[1]].projects) {
                clinicalTrials[item[1]].projects = [];
              }
              // preserve the publication that this clinical trial came from
              clinicalTrials[item[1]].projects.push(projectNums[i]);
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

    // only fail on HTTP error code 404, otherwise keep trying
    let d = await fetchWithStatusCheck(apis.pmArticleSite + publicationNums[i], 404);

    if (d != null) {
      let tmp = d;
      idx_start = tmp.indexOf("id=\"supplemental-data-ClinicalTrials.gov-NCT");  // 41 characters before 'NCT'
      while(idx_start > -1){
        let clinical_trial = tmp.substring(idx_start+41,idx_start+52);  // clinical trials have 11 characters, 'NCT' and then 8 numerals
        if (!publications[publicationNums[i]].clinicalTrials) {
          publications[publicationNums[i]].clinicalTrials = []
        }
        if(publications[publicationNums[i]].clinicalTrials.indexOf(clinical_trial) === -1){
          // associate clinical trial id only with publication
          publications[publicationNums[i]].clinicalTrials.push(clinical_trial);
          // save clinical trial id in clinicalTrials data structure to be populated with details later
          if (!clinicalTrials[clinical_trial]) {
            clinicalTrials[clinical_trial] = {};
          }
          if (!clinicalTrials[clinical_trial].publications) {
              clinicalTrials[clinical_trial].publications = [];
          }
          // preserve the publication that this clinical trial came from
          clinicalTrials[clinical_trial].publications.push(publicationNums[i]);
        }
        tmp = tmp.substring(idx_start+52);  // iterate past this clinical trial
        idx_start = tmp.indexOf("id=\"supplemental-data-ClinicalTrials.gov-NCT");  // get the next clinical trial if it is there
      }
    }
    console.log(`Collected ${publications[publicationNums[i]].clinicalTrials ? publications[publicationNums[i]].clinicalTrials.length : 0} Clinical Trials for publication: ${publicationNums[i]} [publication ${i+1} of ${publicationNums.length}]\n`);
  }
};

module.exports = {
	run
};