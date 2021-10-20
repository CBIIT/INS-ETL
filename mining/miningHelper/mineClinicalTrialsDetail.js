const {
  fetch,
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
          continue;
        }
        let d = await fetch(apis.clinicalTrialsDetailSiteStudy + clinicaltrialID);
        if(d != "failed"){
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
          clinicalTrials[clinicaltrialID].recruitment_status = status.indexOf("Terminated") > -1 ? "Terminated" : status;
          idx = d.indexOf(">Last Update Posted <i");
          d = d.substring(idx);
          idx = d.indexOf("</span>");
          d = d.substring(idx + 7);
          let last_update_posted = d.substring(0, d.indexOf("</div"));
          clinicalTrials[clinicaltrialID].last_update_posted = last_update_posted.replace(" :", "").trim();
        }
        else{
          clinicalTrials[clinicaltrialID] = {};
          clinicalTrials[clinicaltrialID].title = "N/A";
          clinicalTrials[clinicaltrialID].recruitment_status = "N/A";
          clinicalTrials[clinicaltrialID].last_update_posted = "N/A";
        }
      }
    }
    
  }

};

module.exports = {
	run
};