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
        console.log(apis.pmSrpDetailEndpoint + srp);
        let d = await fetch(apis.pmSrpDetailEndpoint + srp, true);  // true is keep trying
        if(d != "failed"){
          if (d.indexOf("SRA Study " + srp + " does not exist") === -1) {
            let cumulative_srx_runs = 0;
            // get metric related to number of runs vs number of SRX results for publication
            let temp = d;
            // let idx_total_runs = temp.indexOf("href=\"https://www.ncbi.nlm.nih.gov//sra/?term=" + srp + "\">");  // 48 characters plus srp string length
            // temp = temp.substring(idx_total_runs + 48 + srp.length);
            // idx_total_runs = temp.indexOf("<");
            // let run_results = parseInt(temp.substring(0,idx_total_runs));

            // FOR PARSING XML
            // SRX numbers designate experiments
            let idx_total_runs = temp.indexOf("exp_cnt=\"");  // 9 characters
            temp = temp.substring(idx_total_runs + 9);
            idx_total_runs = temp.indexOf("\"");
            temp = temp.substring(0, idx_total_runs);
            
            let run_results = parseInt(temp);
            cumulative_srx_runs += run_results;

            // 20 is the max results for the page originally scraped
            if (cumulative_srx_runs > 20) {
              publications[pmIds[p]].sra_overflow = cumulative_srx_runs;  // where to start for the sra overflow portion of the script, otherwise undefined
            }
            s += run_results;  // skip past the accessions in the same SRA

            sras[srp] = {};
            // let idx = d.indexOf("h1>");  // 3 characters
            // d = d.substring(idx + 3);
            // let idx_end = d.indexOf("</h1>");

            // FOR PARSING XML
            temp = d;
            let idx = temp.indexOf("<STUDY_TITLE>");  // 13 characters
            temp = temp.substring(idx + 13)
            let idx_end = temp.indexOf("</STUDY_TITLE>");

            sras[srp].study_title = temp.substring(0, idx_end);
            // idx = d.indexOf("bioproject\/");  // 11 characters
            // d = d.substring(idx);
            // idx_end = d.indexOf("\">");

            // FOR PARSING XML
            temp = d;
            idx = temp.indexOf("<EXTERNAL_ID namespace=\"BioProject\" label=\"primary\">");  // 52 characters
            temp = temp.substring(idx + 52);
            idx_end = temp.indexOf("</EXTERNAL_ID>");

            sras[srp].bioproject_accession = temp.substring(0, idx_end);
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