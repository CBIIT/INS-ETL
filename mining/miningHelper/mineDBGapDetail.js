const {
  fetch,
  fetchWithStatusCheck
} = require('../../common/utils');
const apis = require('../../common/apis');


const restrictedAccessEndpointStudyId = "https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/GetRestrictedAccess.cgi?study_id=";
const restrictedAccessEndpointStudyKey = "&study_key=";


const run = async (publications, dbgaps) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting DBGap Detail for publication : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    // let dbs = publications[pmIds[p]].dbgaps;
    // if(dbs && dbs.length > 0){
    //   for(let db = 0; db < dbs.length; db++){
    //     let accession = dbs[db];
    let accession = publications[pmIds[p]].dbgap_accession;
      if (accession) {
        if(dbgaps[accession]){
          continue;
        }
        console.log(apis.pmDbgapDetailSite + accession);
        let dbgap_detail = await fetchWithStatusCheck(apis.pmDbgapDetailSite + accession, 302);  // keep trying until 302 status code or success
        if(dbgap_detail){
          dbgaps[accession] = {};
          let pos = 0;
          let temp = dbgap_detail;
          pos  = temp.indexOf("name=\"study-name\"");
          temp = temp.substring(pos + 19);
          pos = temp.indexOf("</span>");
          dbgaps[accession].title = temp.substring(0, pos);

          pos = 0;
          temp = dbgap_detail;
          let study_key = null;
          pos = temp.indexOf("<body onload=\"initializeReferences('" + accession + "', '");  // 40 characters plus length of accession string
          temp = temp.substring(pos + 40 + accession.length);
          pos = temp.indexOf("'");
          study_key = temp.substring(0, pos);

          console.log(restrictedAccessEndpointStudyId + accession + restrictedAccessEndpointStudyKey + study_key);
          let dbgap_restricted_access_detail = await fetchWithStatusCheck(restrictedAccessEndpointStudyId + accession + restrictedAccessEndpointStudyKey + study_key, 500);  // keep trying until 500 status code or success
          if (dbgap_restricted_access_detail) {
            pos = 0;
            temp = dbgap_restricted_access_detail;
            pos = temp.indexOf("<b>Release Date:");
            temp = temp.substring(pos + 20);
            pos = temp.indexOf("</li>");
            dbgaps[accession].release_date = temp.substring(0, pos);
          }

        }
      // }
    }
    else {
      console.log("No DBGaps for publication.");
    }
    
  }
};

module.exports = {
	run
};