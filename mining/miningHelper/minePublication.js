let _ = require("lodash");
const {
  fetch,
  post,
  getCoreId,
  getActivityCode,
} = require('../../common/utils');
const apis = require('../../common/apis');

const getIciteData = async (publications) => {
  const pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    let d = await fetch(apis.iciteApi +  pmIds[p]);
    if(d.data && d.data.length > 0){
      let pmData = d.data[0];
      publications[pmIds[p]].journal = pmData.journal;
      publications[pmIds[p]].title = pmData.title.replace(/\n/g,"").replace(/<i>/g,"").replace(/<\/i>/g,"").replace(/<sup>/g,"").replace(/<\/sup>/g,"").replace(/<b>/g,"").replace(/<\/b>/g,"");
      publications[pmIds[p]].authors = pmData.authors;
      publications[pmIds[p]].year = pmData.year;
      publications[pmIds[p]].citation_count = pmData.citation_count;
      publications[pmIds[p]].doi = pmData.doi;
      publications[pmIds[p]].relative_citation_ratio = pmData.relative_citation_ratio;
      //calculate rcr_range
      publications[pmIds[p]].rcr_range = "< 0.2";
      if(pmData.relative_citation_ratio == null){
        publications[pmIds[p]].rcr_range = "N/A";
      }
      else if(pmData.relative_citation_ratio < 0.2) {
        publications[pmIds[p]].rcr_range = "< 0.2";
      }
      else if(pmData.relative_citation_ratio >= 0.2 && pmData.relative_citation_ratio < 0.5) {
        publications[pmIds[p]].rcr_range = "0.2 to 0.5";
      }
      else if(pmData.relative_citation_ratio >= 0.5 && pmData.relative_citation_ratio < 0.8) {
        publications[pmIds[p]].rcr_range = "0.5 to 0.8";
      }
      else if(pmData.relative_citation_ratio >= 0.8 && pmData.relative_citation_ratio < 1.25) {
        publications[pmIds[p]].rcr_range = "0.8 to 1.25";
      }
      else if(pmData.relative_citation_ratio >= 1.25 && pmData.relative_citation_ratio < 2) {
        publications[pmIds[p]].rcr_range = "1.25 to 2";
      }
      else if(pmData.relative_citation_ratio >= 2 && pmData.relative_citation_ratio < 5) {
        publications[pmIds[p]].rcr_range = "2 to 5";
      }
      else {
        publications[pmIds[p]].rcr_range = "> 5";
      }

      publications[pmIds[p]].nih_percentile = pmData.nih_percentile;
      console.log(`Updated Publication data from icite for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    }
    else{
      publications[pmIds[p]].journal = "N/A";
      publications[pmIds[p]].title = "N/A";
      publications[pmIds[p]].authors = "N/A";
      publications[pmIds[p]].year = "N/A";
      publications[pmIds[p]].citation_count = "N/A";
      publications[pmIds[p]].doi = "N/A";
      publications[pmIds[p]].relative_citation_ratio = "N/A";
      //calculate rcr_range
      publications[pmIds[p]].rcr_range = "N/A";
      publications[pmIds[p]].nih_percentile = "N/A";
      console.log(`No data found, initiated Publication data from icite for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    }

  }
};

const searchPublications = async (keyword, project_award_date, project_core_id) => {
  let filter_date = Date.parse(project_award_date);
  let pubs = {};
  let idx_start = 0;
  let currPage = 1;
  let isEnd = false;
  while (!isEnd){
    let d = await fetch(apis.pmWebsite +  keyword +"&sort=date&size=200&page=" + currPage);
    if(currPage === 1 && d.indexOf("The following term was not found in PubMed: " +project_core_id) > -1){
      break;
    }
    currPage ++;
    idx_start = d.indexOf("data-article-id=");
    if(idx_start === -1){
      break;
    }
    let tmp = d;
    while(idx_start > -1){
        tmp = tmp.substring(idx_start + 17);
        let str = tmp.substring(0, 8);
        if(str.length !== 8){
          console.log(tmp);
          console.log(str);
        }
        idx_start = tmp.indexOf("full-journal-citation");
        tmp = tmp.substring(idx_start + 23);
        idx_start = tmp.indexOf(". ");
        tmp = tmp.substring(idx_start + 2);
        idx_start = tmp.indexOf(";") === -1 ? 99999999 : tmp.indexOf(";");
        let idx_start_1 = tmp.indexOf(":") === -1 ? 99999999 : tmp.indexOf(":");
        let idx_start_2 = tmp.indexOf(".") === -1 ? 99999999 : tmp.indexOf(".");
        idx_start = Math.min(idx_start, idx_start_1, idx_start_2);
        let publish_date = tmp.substring(0, idx_start);
        //console.log(keyword, str, publish_date, project_award_date);
        if(Date.parse(publish_date) >= filter_date){
          pubs[str] = {};
          pubs[str].publish_date = publish_date;
        }
        else{
          isEnd = true;
        }
        idx_start = tmp.indexOf("data-article-id=");
    }
  }
  
  return pubs;
};

const run = async (projects, publications) => {
  let projectNums = Object.keys(projects);
  for(let i = 0; i< projectNums.length; i++){
    let count = 0;
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_award_date = projects[projectNums[i]].award_notice_date;
      let project_core_id = getCoreId(projectNums[i]);
      let project_activity_code = getActivityCode(projectNums[i]);
      //search by activity_code + core_id
      let keyword = project_activity_code + project_core_id;
      let pubs_1 = await searchPublications(keyword, project_award_date, project_core_id);
      //search by activity_code + " " + core_id
      keyword = project_activity_code + " " + project_core_id;
      let pubs_2 = await searchPublications(keyword, project_award_date, project_core_id);
      //search by core_id only
      //keyword = project_core_id;
      //let pubs_3 = await searchPublications(keyword, project_award_date, project_core_id);
      let pubs = {};
      Object.keys(pubs_1).forEach((key) => {
        if(!(key in pubs)){
          pubs[key] = pubs_1[key];
        }
      });
      Object.keys(pubs_2).forEach((key) => {
        if(!(key in pubs)){
          pubs[key] = pubs_2[key];
        }
      });
      /*
      Object.keys(pubs_3).forEach((key) => {
        if(!(key in pubs)){
          pubs[key] = pubs_3[key];
        }
      });
      */
      await getIciteData(pubs);
      count = Object.keys(pubs).length;
      Object.keys(pubs).forEach((key) => {
        if(!(key in publications)){
          publications[key] = pubs[key];
          publications[key].projects = [];
        }
        publications[key].projects.push(projectNums[i]);
      });
    }
    console.log(`Collected ${count} Publications from PubMed for project: ${projectNums[i]}`);
  }

  
};

module.exports = {
	run
};