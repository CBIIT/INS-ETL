const {
  fetch,
} = require('../../common/utils');
const apis = require('../../common/apis');

const run = async (publications) => {
  let pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    console.log(`Collecting More data from PubMed Central for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    let pmcId = publications[pmIds[p]].pmc_id;
    if(pmcId){
      let d = await fetch(apis.pmcApiPrefix + pmcId +'/');
      if(d != "failed"){
        //remove reference-list part and then search
        let idx_start = d.indexOf("reference-list");
        d = d.substring(0, idx_start);

        let gs = d.match(/GSE[0-9]{5,6}/g);
        if(gs != null && gs.length > 0){
          gs.map(function(geo){
            if(!publications[pmIds[p]].geos){
              publications[pmIds[p]].geos = [];
            }
            if(publications[pmIds[p]].geos.indexOf(geo) === -1){
              publications[pmIds[p]].geos.push(geo);
            }
          })
        }

        srps = d.match(/SRP[0-9]{6}/g);
        if(srps != null && srps.length > 0){
          console.log("Found SRAs from PMC:", srps);
          srps.map(function(srp){
            if(!publications[pmIds[p]].sras){
              publications[pmIds[p]].sras = [];
            }
            if(publications[pmIds[p]].sras.indexOf(srp) === -1){
              publications[pmIds[p]].sras.push(srp);
            }
          })
        }
        
        let phses = d.match(/phs[0-9]{6}.v{0-9}.p{0-9}/g);
        if(phses != null && phses.length > 0){
          phses.map(function(phs){
            if(!publications[pmIds[p]].dbgaps){
              publications[pmIds[p]].dbgaps = [];
            }
            if(publications[pmIds[p]].dbgaps.indexOf(phs) === -1){
              publications[pmIds[p]].dbgaps.push(phs);
            }
          })
        }

        //Look for clinical trials number
        let cts = d.match(/NCT[0-9]{8}/g);
        if(cts != null && cts.length > 0){
          cts.map(function(ct){
            if(!publications[pmIds[p]].clinicalTrials){
              publications[pmIds[p]].clinicalTrials = [];
            }
            if(publications[pmIds[p]].clinicalTrials.indexOf(ct) === -1){
              publications[pmIds[p]].clinicalTrials.push(ct);
            }
          })
        }
      }
    }
  }
};

module.exports = {
	run
};