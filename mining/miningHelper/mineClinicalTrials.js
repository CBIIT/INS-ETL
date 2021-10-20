const {
  fetch,
  getCoreId,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (projects) => {
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    console.log(`Collecting Clinical Trials data for project: ${projectNums[i]}`);
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_core_id = getCoreId(projectNums[i]);
      let d = await fetch(apis.clinicalTrialsSite + project_core_id);
      if(d != "failed"){
          let idx = d.indexOf("/ct2/results/rpc/");
          d = d.substring(idx + 17);
          idx = d.indexOf("\",");
          let session = d.substring(0, idx);
          let dt = await fetch(apis.clinicalTrialsApi + session);
          if(dt && dt.data){
            dt.data.map((item) => {
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
  }
};

module.exports = {
	run
};