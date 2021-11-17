const {
  post,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (projectsTodo) => {
  let projectNums = Object.keys(projectsTodo);
  for(let i = 0; i< projectNums.length; i++){
    let body = {};
    body.criteria = {};
    body.criteria.project_nums = [];
    body.criteria.project_nums.push(projectNums[i]);
    body.offset = 0;
    body.limit = 100;
    body.sort_field = "fiscal_year";
    body.sort_order = "desc";
    let d = await post(apis.nihReporterApi, body, true);  // true is keep trying until successful response
    if(d.meta && d.meta.total > 0){
      for(let j = 0; j < d.results.length ; j++){
        if(d.results[j].subproject_id === null){
          let dt = d.results[j];
          projectsTodo[projectNums[i]].project_id = dt.project_num;
          projectsTodo[projectNums[i]].application_id = dt.appl_id;
          projectsTodo[projectNums[i]].fiscal_year = dt.fiscal_year;
          projectsTodo[projectNums[i]].project_title = dt.project_title;
          projectsTodo[projectNums[i]].abstract_text = dt.abstract_text;
          projectsTodo[projectNums[i]].keywords = dt.pref_terms;
          projectsTodo[projectNums[i]].org_name = dt.organization.org_name;
          projectsTodo[projectNums[i]].org_city = dt.organization.org_city;
          projectsTodo[projectNums[i]].org_state = dt.organization.org_state;
          projectsTodo[projectNums[i]].org_country = dt.organization.org_country;
          let investigators = [];
          dt.principal_investigators.map((pi) => {
            investigators.push(pi.full_name);
          });
          projectsTodo[projectNums[i]].principal_investigators = investigators.join();
          let officers = [];
          dt.program_officers.map((po) => {
            officers.push(po.full_name);
          });
          projectsTodo[projectNums[i]].program_officers = officers.join();
          projectsTodo[projectNums[i]].award_amount = dt.award_amount;
          let fundedAmount = 0;
          dt.agency_ic_fundings.map((aif) => {
            if(aif.code === "CA"){
              fundedAmount += aif.total_cost;
            }
          });
          projectsTodo[projectNums[i]].nci_funded_amount = fundedAmount;
          projectsTodo[projectNums[i]].award_notice_date = dt.award_notice_date;
          projectsTodo[projectNums[i]].project_start_date = dt.project_start_date;
          projectsTodo[projectNums[i]].project_end_date = dt.project_end_date;
          projectsTodo[projectNums[i]].full_foa = dt.full_foa;
          break;
        }
      }
    }
    console.log(`Collected project detail data for : ${projectNums[i]} [${i+1} of ${projectNums.length}]`);
  }
  return projectsTodo;
};

module.exports = {
	run
};