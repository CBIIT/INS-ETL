const {
  fetchWithStatusCheck,
  fetch
} = require('../../common/utils');
const apis = require('../../common/apis');


const restrictedAccessEndpointStudyId = "https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/GetRestrictedAccess.cgi?study_id=";
const restrictedAccessEndpointStudyKey = "&study_key=";


const run = async (publications, dbgaps) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting DBGap Detail for publication : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    if (publications[pmIds[p]].dbgap_accession.length === 0) {
      console.log("No DBGaps for publication.");
    }
    else {
      for (let d = 0; d < publications[pmIds[p]].dbgap_accession.length; d++) {
        let dbgap_id = publications[pmIds[p]].dbgap_accession[d];
        if(!(dbgap_id) || dbgaps[dbgap_id]){
          continue;  // details for this dbGaP were found already, or if the cache has cached duplicate dbGaP ids or if the dbGaP id isn't good
        }
        console.log(apis.pmDbgapDetailSite + dbgap_id);
        let dbgap_detail = await fetch(apis.pmDbgapDetailSite + dbgap_id, true);  // true means keep trying
        if(dbgap_detail != "failed"){
          if (dbgap_detail.indexOf("<title>Home - dbGaP - NCBI</title>") === -1) {
            dbgaps[dbgap_id] = {};
            let pos = 0;
            let temp = dbgap_detail;
            pos  = temp.indexOf("name=\"study-name\"");  // 17 characters
            temp = temp.substring(pos + 18);  // 17+1 to skip a ">"  
            pos = temp.indexOf("</span>");
            dbgaps[dbgap_id].title = temp.substring(0, pos);

            pos = 0;
            temp = dbgap_detail;
            let study_key = null;
            pos = temp.indexOf("<body onload=\"initializeReferences('" + dbgap_id + "', '");  // 40 characters plus length of accession string
            temp = temp.substring(pos + 40 + dbgap_id.length);
            pos = temp.indexOf("'");
            study_key = temp.substring(0, pos);

            console.log(restrictedAccessEndpointStudyId + dbgap_id + restrictedAccessEndpointStudyKey + study_key);
            let dbgap_restricted_access_detail = await fetchWithStatusCheck(restrictedAccessEndpointStudyId + dbgap_id + restrictedAccessEndpointStudyKey + study_key, 500);  // keep trying until 500 status code or success
            if (dbgap_restricted_access_detail) {
              pos = 0;
              temp = dbgap_restricted_access_detail;
              pos = temp.indexOf("<b>Release Date:");
              temp = temp.substring(pos + 20);
              pos = temp.indexOf("</li>");
              dbgaps[dbgap_id].release_date = temp.substring(0, pos);
              dbgaps[dbgap_id].release_date = dbgaps[dbgap_id].release_date.replace(/(\r\n|\r|\n|\t|\s)/gm, "");
            }
          }
          else {
            console.log("dbGaP Accession does not exist for " + dbgap_id)
          }
        }
      }
    }
  }
};

module.exports = {
	run
};