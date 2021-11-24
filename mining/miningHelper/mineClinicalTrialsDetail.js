const axios = require('axios').default;

const {
  fetch, fetchWithErrorCheck,
} = require('../../common/utils');
const apis = require('../../common/apis');
const _ = require('lodash');

const run = async (projects, publications, clinicalTrials) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    let cts = publications[pmIds[p]].clinicalTrials;
    if(cts){
      let prs = publications[pmIds[p]].projects;
      prs.forEach((pr) => {
        if(!projects[pr].clinicalTrials) {
          projects[pr].clinicalTrials = [];
        }
        // add clinical trials from publications data structure to projects data structure
        projects[pr].clinicalTrials = _.concat(projects[pr].clinicalTrials, cts);
      });
    }
  }

  let ps = Object.keys(projects);
  for(let k = 0; k < ps.length; k++){
    console.log(`Collecting Clinical Trials Detail for project : ${ps[k]}, (${k+1}/${ps.length})`);
    let cts = projects[ps[k]].clinicalTrials;
    if(cts && cts.length > 0){
      for(let ct = 0; ct < cts.length; ct++){
        let clinicaltrialID = cts[ct];
        if(clinicalTrials[clinicaltrialID]){
          console.log("Clinical trial data already collected for " + clinicaltrialID + ", skipping.");
          continue;
        }
        console.log("Collecting data for clinical trial " + clinicaltrialID + " (" + (ct+1) + "/" + cts.length + ")");
        console.log(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID);
        // 11/22/2021 adeforge, custom GET logic which does not rely on utils
        //  because the clinical trials site study will error with 400, but that is actionable information.
        //  When the GET request errors, that is usually an indication that we want to hit the endpoint again
        //  until we get a non-error-producing response; not in this case, but we still want to avoid errors due to anything else
        // let failed = true; // we need to keep track of whether or not the call failed properly, aside from errors other than 400
        // let keep_trying = true;
        // let counter = 0;
        // const MAX_RETRIES = 100;
        // let d = null;
        // while (keep_trying && counter < MAX_RETRIES) {  // this handles if the request errors due to anything but a 400
        //   await axios.get(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID, {timeout: 60000, clarifyTimeoutError: false})
        //                   .then(function (response) {
        //                     keep_trying = false;  // what if the call succeeds
        //                     failed = false;
        //                     d = response.data;  // get the response
        //                   })
        //                   .catch(function (error) {
        //                     if (error.response && error.response.status === 400) {
        //                       keep_trying = false;
        //                       failed = true;
        //                     }
        //                     else {
        //                       console.log("GET failed");
        //                       console.log(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID);
        //                       console.log("Retry Attempt: " + (counter + 1));
        //                     }
        //                   });
        //   if (keep_trying) {
        //     await new Promise(resolve => setTimeout(resolve, 500));
        //   }
        //   counter++;
        // }

        // only fail on HTTP error code 400, otherwise keep trying
        let d = await fetchWithErrorCheck(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID, 400);

        if (d === null) {
          clinicalTrials[clinicaltrialID] = {};
          clinicalTrials[clinicaltrialID].title = "N/A";
          clinicalTrials[clinicaltrialID].recruitment_status = "N/A";
          clinicalTrials[clinicaltrialID].last_update_posted = "N/A";
        }
        else {
          clinicalTrials[clinicaltrialID] = {};
          let idx = d.indexOf("tr-solo_record");
          d = d.substring(idx + 16);
          idx = d.indexOf("</h1>");
          clinicalTrials[clinicaltrialID].title = d.substring(0, idx);
          idx = d.indexOf("data-term=\"recruitment status\"");
          d = d.substring(idx);
          idx = d.indexOf("</span>");
          d = d.substring(idx + 7);
          let status = d.substring(0, d.indexOf("<div")).replace(" :", "").trim();
          if(status.indexOf("Terminated") > -1){
            clinicalTrials[clinicaltrialID].recruitment_status = "Terminated";
          }
          else if(status.indexOf("Suspended") > -1) {
            clinicalTrials[clinicaltrialID].recruitment_status = "Suspended";
          }
          else if(status.indexOf("Withdrawn") > -1) {
            clinicalTrials[clinicaltrialID].recruitment_status = "Withdrawn";
          }
          else {
            clinicalTrials[clinicaltrialID].recruitment_status = status;
          }
          idx = d.indexOf(">Last Update Posted <i");
          d = d.substring(idx);
          idx = d.indexOf("</span>");
          d = d.substring(idx + 7);
          let last_update_posted = d.substring(0, d.indexOf("</div"));
          clinicalTrials[clinicaltrialID].last_update_posted = last_update_posted.replace(" :", "").trim();
        }
      }
    }
  }
};

module.exports = {
	run
};