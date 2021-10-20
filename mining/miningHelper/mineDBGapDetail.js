const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications, dbgaps) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting DBGap Detail for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    let dbs = publications[pmIds[p]].dbgaps;
    if(dbs && dbs.length > 0){
      for(let db = 0; db < dbs.length; db++){
        let accession = dbs[db];
        if(dbgaps[accession]){
          continue;
        }
        let dbgap_detail = await fetch(apis.pmDbgapDetailSite + accession);
        let pos = 0;
        if(dbgap_detail != "failed"){
          dbgaps[accession] = {};
          pos  = dbgap_detail.indexOf("name=\"study-name\"");
          dbgap_detail = dbgap_detail.substring(pos + 19);
          pos = dbgap_detail.indexOf("</span>");
          dbgaps[accession].title = dbgap_detail.substring(0, pos);

          pos = dbgap_detail.indexOf("<b>Release Date:");
          dbgap_detail = dbgap_detail.substring(pos + 20);
          pos = dbgap_detail.indexOf("</li>");
          dbgaps[accession].release_date = dbgap_detail.substring(0, pos);
        }
      }
    }
    
  }
};

module.exports = {
	run
};