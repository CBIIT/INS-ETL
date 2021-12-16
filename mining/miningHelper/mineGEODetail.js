const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications, geos) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting GEO Detail for publication : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    // let gs = publications[pmIds[p]].geos;
    // if(gs && gs.length > 0){
    //   for(let g = 0; g < gs.length; g++){
    //     let geo_id = gs[g];
    let geo_id = publications[pmIds[p]].geo_accession;
      if (geo_id) {
        if(geos[geo_id]){  // check if seen from a previous publication
          continue;
        }
        console.log(apis.pmGeoDetailSite + geo_id);
        let gd = await fetch(apis.pmGeoDetailSite + geo_id, true);  // true is keep trying
        let pos = 0; 
        if(gd != "failed"){
          if (gd.indexOf("<b>GEO accession display tool</b><br/><br/>") === -1) {
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
          else {
            console.log("GEO Accession does not exist.");
          }
        }
      // }
    }
    else {
      console.log("No GEOs for publication.");
    }
    
  }
};

module.exports = {
	run
};