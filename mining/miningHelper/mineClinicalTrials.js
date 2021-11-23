const axios = require('axios').default;

const {
  fetch,
  getCoreId,
  fetchWithErrorCheck,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (projects, publications) => {
  // mine clinical trials by project
  let repeats = [];
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    console.log(`Collecting Clinical Trials data for project: ${projectNums[i]}`);
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_core_id = getCoreId(projectNums[i]);
      if (project_core_id in repeats) {
        console.log("Project ID " + projectNums[i] + " line item skipped to optimize results for group " + project_core_id + "\n");
        continue;
      }
      else {
        repeats.push(project_core_id);
      }
      console.log("Getting clinical trials session for project: " + project_core_id);
      console.log(apis.clinicalTrialsSite + project_core_id);
      // 11/22/2021 adeforge, custom GET logic which does not rely on utils
      //  because the clinical trials site will error with 404, but that is actionable information.
      //  When the GET request errors, that is usually an indication that we want to hit the endpoint again
      //  until we get a non-error-producing response; not in this case, but we still want to avoid errors due to anything else
      // let failed = true;  // we need to keep track of whether or not the call failed properly, aside from errors other than 404
      // let keep_trying = true;
      // let counter = 0;
      // const MAX_RETRIES = 100;
      // let d = null;
      // while (keep_trying && counter < MAX_RETRIES) {  // this handles if the request errors due to anything but a 404
      //   await axios.get(apis.clinicalTrialsSite + project_core_id, {timeout: 60000, clarifyTimeoutError: false})
      //                   .then(function (response) {
      //                     keep_trying = false;  // what if the call succeeds
      //                     failed = false;
      //                     d = response.data;  // get the response
      //                   })
      //                   .catch(function (error) {
      //                     if (error.response && error.response.status === 404) {
      //                       keep_trying = false;
      //                       failed = true;
      //                     }
      //                     else {
      //                       console.log("GET failed");
      //                       console.log(apis.clinicalTrialsSite + project_core_id);
      //                       console.log("Retry Attempt: " + (counter + 1));
      //                     }
      //                   });
      //   if (keep_trying) {
      //     await new Promise(resolve => setTimeout(resolve, 500));
      //   }
      //   counter++;
      // }

      // only fail on HTTP error code 404, otherwise keep trying
      let d = fetchWithErrorCheck(apis.clinicalTrialsSite + project_core_id, 404);

      if (d) {
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
              projects[projectNums[i]].clinicalTrials.push(item[1]);
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
    // 11/23/2021 adeforge, custom GET logic which does not rely on utils
    //  because PubMed will error with 404, but that is actionable information.
    //  When the GET request errors, that is usually an indication that we want to hit the endpoint again
    //  until we get a non-error-producing response; not in this case, but we still want to avoid errors due to anything else
    // let failed = true;  // we need to keep track of whether or not the call failed properly, aside from errors other than 404
    // let keep_trying = true;
    // let counter = 0;
    // const MAX_RETRIES = 100;
    // let d = null;
    // while (keep_trying && counter < MAX_RETRIES) {  // this handles if the request errors due to anything but a 404
    //   await axios.get(apis.pmArticleSite + publicationNums[i], {timeout: 60000, clarifyTimeoutError: false})
    //                   .then(function (response) {
    //                     keep_trying = false;  // what if the call succeeds
    //                     failed = false;
    //                     d = response.data;  // get the response
    //                   })
    //                   .catch(function (error) {
    //                     if (error.response && error.response.status === 404) {
    //                       keep_trying = false;
    //                       failed = true;
    //                     }
    //                     else {
    //                       console.log("GET failed");
    //                       console.log(apis.pmArticleSite + publicationNums[i]);
    //                       console.log("Retry Attempt: " + (counter + 1));
    //                     }
    //                   });
    //   if (keep_trying) {
    //     await new Promise(resolve => setTimeout(resolve, 500));
    //   }
    //   counter++;
    // }

    // only fail on HTTP error code 404, otherwise keep trying
    let d = fetchWithErrorCheck(apis.pmArticleSite + publicationNums[i], 404);

    if (d) {
      let tmp = d;
      idx_start = tmp.indexOf("id=\"supplemental-data-ClinicalTrials.gov-NCT");  // 41 characters before 'NCT'
      while(idx_start > -1){
        let clinical_trial = tmp.substring(idx_start+41,idx_start+52);  // clinical trials have 11 characters, 'NCT' and then 8 numerals
        if (!publications[publicationNums[i]].clinicalTrials) {
          publications[publicationNums[i]].clinicalTrials = []
        }
        publications[publicationNums[i]].clinicalTrials.push(clinical_trial);
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