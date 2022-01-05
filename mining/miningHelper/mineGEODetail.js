const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications, geos) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting GEO Detail for publication : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    if (publications[pmIds[p]].geo_accession.length === 0) {
      console.log("No GEOs for publication.");
    }
    else {
      for (let g = 0; g < publications[pmIds[p]].geo_accession.length; g++) {
        let geo_id = publications[pmIds[p]].geo_accession[g];
        if(!(geo_id) || geos[geo_id]){
          continue;  // details for this GEO id was found already, or if the cache has cached duplicate GEO ids or if the GEO id isn't good
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
            console.log("GEO details found.");
          }
          else {
            console.log("GEO Accession does not exist for " + geo_id);
          }
        }
      }
    }
  }
};

module.exports = {
	run
};