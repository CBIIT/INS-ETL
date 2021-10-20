const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications, geos) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting GEO Detail for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    let gs = publications[pmIds[p]].geos;
    if(gs && gs.length > 0){
      for(let g = 0; g < gs.length; g++){
        let geo_id = gs[g];
        if(geos[geo_id]){
          continue;
        }
        let gd = await fetch(apis.pmGeoDetailSite + geo_id);
        let pos = 0; 
        if(gd != "failed"){
          geos[geo_id] = {};
          pos = gd.indexOf("Status</td>");
          gd = gd.substring(pos + 16);
          pos = gd.indexOf("</td>");
          geos[geo_id].status = gd.substring(0, pos);

          pos = gd.indexOf("justify\">");
          gd = gd.substring(pos + 9);
          pos = gd.indexOf("</td>");
          geos[geo_id].title = gd.substring(0, pos);

          pos = gd.indexOf("Submission date</td>");
          gd = gd.substring(pos + 25);
          pos = gd.indexOf("</td>");
          geos[geo_id].submission_date = gd.substring(0, pos);

          pos = gd.indexOf("Last update date</td>");
          gd = gd.substring(pos + 26);
          pos = gd.indexOf("</td>");
          geos[geo_id].last_update_date = gd.substring(0, pos);
        }
        else{
          console.log("Cannot get GEO: "+ geo_id, pmIds[p]);
        }
      }
    }
    
  }
};

module.exports = {
	run
};