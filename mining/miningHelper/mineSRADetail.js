const {
  fetch,
  fetchWithStatusCheck
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications, sras, metrics) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    
    // metrics[pmIds[p]]["multipleSrpResults"] = null;
    // metrics[pmIds[p]]["totalSrpRunResults"] = null;

    console.log(`Collecting SRA Detail for publication : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    let srp = publications[pmIds[p]].sra_accession;  // there is one per publication
      if (srp) {
        if(sras[srp]){
          continue;  // details for this SRA were found already
        }
        console.log(apis.pmSrpDetailSite + srp);
        let d = await fetch(apis.pmSrpDetailSite + srp, true);  // true is keep trying
        if(d != "failed"){
          if (d.indexOf("<div class=\"error\">SRA Study " + srp + " does not exist</div>") === -1) {

            // get metric related to number of runs vs number of SRX results for publication
            // let temp = d;
            // let idx_total_runs = temp.indexOf("href=\"https://www.ncbi.nlm.nih.gov//sra/?term=" + srp + "\">");  // 48 characters plus srp string length
            // temp = temp.substring(idx_total_runs + 48 + srp.length);
            // idx_total_runs = temp.indexOf("<");
            // let run_results = parseInt(temp.substring(0,idx_total_runs));
            // metrics[pmIds[p]]["totalSrpRunResults"] = run_results;
            // if (run_results < metrics[pmIds[p]]["totalSrxResults"]) {
            //   metrics[pmIds[p]]["multipleSrpResults"] = "TRUE";
            // } else {
            //   metrics[pmIds[p]]["multipleSrpResults"] = "FALSE";
            // }

            sras[srp] = {};
            let idx = d.indexOf("h1>");
            d = d.substring(idx + 3);
            let idx_end = d.indexOf("</h1>");
            sras[srp].study_title = d.substring(0, idx_end);
            idx = d.indexOf("bioproject\/");
            d = d.substring(idx);
            idx_end = d.indexOf("\">");
            sras[srp].bioproject_accession = d.substring(11, idx_end);
            console.log(apis.pmBioprojectDetailSite + sras[srp].bioproject_accession);
            let bioproject_detail = await fetchWithStatusCheck(apis.pmBioprojectDetailSite + sras[srp].bioproject_accession, 404);  // keep trying unless 404
            if(bioproject_detail){
                let acc = "";
                pos  = bioproject_detail.indexOf(sras[srp].bioproject_accession + ";");
                if(pos !== -1){
                  bioproject_detail = bioproject_detail.substring(pos);
                  pos = bioproject_detail.indexOf("</td>");
                  acc = bioproject_detail.substring(0, pos);
                  let arr_geo = acc.split(";");
                  sras[srp].geo = arr_geo[1].trim().substring(5);
                  let gs = sras[srp].geo.match(/GSE[0-9]{5,6}/g);
                  if(gs != null && gs.length > 0){
                    if(!publications[pmIds[p]].geos){
                      publications[pmIds[p]].geos = [];
                    }
                    if(publications[pmIds[p]].geos.indexOf(sras[srp].geo) === -1){
                      publications[pmIds[p]].geos.push(sras[srp].geo);
                    }
                  }
                }
                pos = bioproject_detail.indexOf("Registration date");
                sras[srp].registration_date = bioproject_detail.substring(pos+19, pos + 30);
                sras[srp].registration_date = sras[srp].registration_date.replace('<','');
            }
          }
          else {
            console.log("SRA Accession does not exist.");
          }
        }
      }
      else {
        console.log("No SRAs for publication.")
      }
  }
};

module.exports = {
	run
};