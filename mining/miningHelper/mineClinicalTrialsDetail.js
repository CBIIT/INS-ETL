const {
  fetch, fetchWithErrorCheck,
} = require('../../common/utils');
const apis = require('../../common/apis');
const _ = require('lodash');

const run = async (clinicalTrials) => {
  let counter = 0;
  for (var clinicaltrialID in clinicalTrials) {
    console.log(`Collecting Clinical Trials Detail for clinical trial id : ${clinicaltrialID}, (${counter+1}/${Object.keys(clinicalTrials).length})`);
    console.log(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID);

    // only fail on HTTP error code 400, otherwise keep trying
    let d = await fetchWithErrorCheck(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID, 400);

    if (d === null) {
      clinicalTrials[clinicaltrialID].title = "N/A";
      clinicalTrials[clinicaltrialID].recruitment_status = "N/A";
      clinicalTrials[clinicaltrialID].last_update_posted = "N/A";
    }
    else {
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
    counter++;
  }
};

module.exports = {
	run
};