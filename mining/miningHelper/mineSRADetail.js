const {
  fetch,
  fetchWithStatusCheck
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications, sras) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting SRA Detail for publication : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    if (publications[pmIds[p]].sra_accession.length === 0) {
      console.log("No SRAs for publication.")
    }
    else {
      for (let s = 0; s < publications[pmIds[p]].sra_accession.length; s++) {
        let srp = publications[pmIds[p]].sra_accession[s];
        if(!(srp) || sras[srp]){
          continue;  // details for this SRA were found already, or if the cache has cached duplicate SRP numbers or if the SRP number isn't good
        }
        console.log(apis.pmSrpDetailSite + srp);
        let d = await fetch(apis.pmSrpDetailSite + srp, true);  // true is keep trying
        if(d != "failed"){
          if (d.indexOf("<div class=\"error\">SRA Study " + srp + " does not exist</div>") === -1) {
            let cumulative_srx_runs = 0;
            // get metric related to number of runs vs number of SRX results for publication
            let temp = d;
            let idx_total_runs = temp.indexOf("href=\"https://www.ncbi.nlm.nih.gov//sra/?term=" + srp + "\">");  // 48 characters plus srp string length
            temp = temp.substring(idx_total_runs + 48 + srp.length);
            idx_total_runs = temp.indexOf("<");
            let run_results = parseInt(temp.substring(0,idx_total_runs));
            cumulative_srx_runs += run_results;
            // 20 is the max results for the page originally scraped
            if (cumulative_srx_runs > 20 && publications[pmIds[p]].total_srx_results > cumulative_srx_runs) {  // the second part of the conditional is to check if any results past 20 belong to the same SRA being checked
              publications[pmIds[p]].sra_overflow = cumulative_srx_runs;  // where to start for the sra overflow portion of the script, otherwise undefined
            }
            else {
              s += run_results;  // skip past the accessions in the same SRA
            }

            sras[srp] = {};
            let idx = d.indexOf("h1>");  // 3 characters
            d = d.substring(idx + 3);
            let idx_end = d.indexOf("</h1>");
            sras[srp].study_title = d.substring(0, idx_end);
            idx = d.indexOf("bioproject\/");  // 11 characters
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
            console.log("SRA Accession does not exist for " + srp);
          }
        }
      }
    }
  }
};

module.exports = {
	run
};