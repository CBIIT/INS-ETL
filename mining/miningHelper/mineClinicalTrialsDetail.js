const {
  fetch, fetchWithErrorCheck,
} = require('../../common/utils');
const apis = require('../../common/apis');
const _ = require('lodash');

const run = async (projects, publications, clinicalTrials) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    let cts = publications[pmIds[p]].clinicalTrials;  // publications can have clinical trials
    if(cts){
      let prs = publications[pmIds[p]].projects;  // publications have projects
      prs.forEach((pr) => {
        if(!projects[pr].clinicalTrials) {
          projects[pr].clinicalTrials = [];  // projects can have clinical trials (separate from their publications)
        }
        // add to the projects data structure any clinical trials its publications have associated with them
        projects[pr].clinicalTrials = _.concat(projects[pr].clinicalTrials, cts);
      });
    }
  }

  // we are ultimately populating the clinicalTrials data structures based off of the clinical trials in the
  //  projects data structure, plus added information along the way
  let ps = Object.keys(projects);
  for(let k = 0; k < ps.length; k++){
    // get clinical trial details by project, which now has all of its associated publications clinical trials
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