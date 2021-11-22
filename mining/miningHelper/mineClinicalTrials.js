const {
  fetch,
  getCoreId,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (projects) => {
  let repeats = [];
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    console.log(`Collecting Clinical Trials data for project: ${projectNums[i]}`);
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_core_id = getCoreId(projectNums[i]);
      if (project_core_id in repeats) {
        continue;
      }
      else {
        repeats.push(project_core_id);
      }
      console.log(apis.clinicalTrialsSite + project_core_id);
      // 11/22/2021 adeforge, custom GET logic which does not rely on utils
      //  because the clinical trials site will error with 404, but that is actionable information.
      //  When the GET request errors, that is usually an indication that we want to hit the endpoint again
      //  until we get a non-error-producing response; not in this case, but we still want to avoid errors due to anything else
      let failed = true;  // we need to keep track of whether or not the call failed properly, aside from errors other than 404
      let keep_trying = true;
      let counter = 0;
      const MAX_RETRIES = 100;
      let d = null;
      while (keep_trying && counter < MAX_RETRIES) {  // this handles if the request errors due to anything but a 404
        d = await axios.get(apis.clinicalTrialsSite + project_core_id, {timeout: 60000, clarifyTimeoutError: false})
                        .then(function (response) {
                          keep_trying = false;  // what if the call succeeds
                          failed = false;
                        })
                        .catch(function (error) {
                          if (error.response.status === 404) {
                            keep_trying = false;
                            failed = true;
                          }
                          else {
                            console.log("GET failed");
                            console.log(apis.clinicalTrialsSite + project_core_id);
                            console.log("Retry Attempt: " + (counter + 1));
                          }
                        });
        counter++;
      }
      // if(d != "failed"){
      if (!failed) {
        let idx = d.indexOf("/ct2/results/rpc/");
        d = d.substring(idx + 17);
        idx = d.indexOf("\",");
        let session = d.substring(0, idx);
        console.log(apis.clinicalTrialsApi + session);
        let dt = await fetch(apis.clinicalTrialsApi + session, true);  // keep_trying?
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
      // }
    }
  }
};

module.exports = {
	run
};