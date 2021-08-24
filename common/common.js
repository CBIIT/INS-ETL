const axios = require('axios');
const fs = require('fs');

let nih_reporter_api = "https://reporter.nih.gov/services/Projects/Publications?projectId=";
let pmc_api_prefix = "https://www.ncbi.nlm.nih.gov/pmc/articles/";
let pm_website = "https://pubmed.ncbi.nlm.nih.gov/?term=";
let pm_article_site = "https://pubmed.ncbi.nlm.nih.gov/";
let pm_geo_site = "https://www.ncbi.nlm.nih.gov/gds/?linkname=pubmed_gds&from_uid=";
let pm_geo_detail_site = "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=";

const fetch = async (url) => {
    try {
        const response = await axios.get(url)
        //console.log(response.data);
        return response.data;
    } catch (error) {
        return "failed";
    }
}

const getCoreId = (projectId) => {
    let result = projectId.substring(4);
    let idx = result.indexOf("-");
    if(idx > 0){
        result = result.substring(0, idx);
    }
    return result;
}

const buildHtml = (projectIds, pmcIds, pmcData) => {
    let header = '';
    let body ="";
    
    projectIds.map((pid, idx) => {
        let pmcs = pmcIds[idx];
        let content = "";
        content += "<p>" + "<h1>#Project ID: <a href='https://reporter.nih.gov/search/l4QHk2BZy0GR4gxdg2v8RA/project-details/"+pid+"' target='_blank'>"+ pid +"</a></h1><ul>";
        pmcs.map((pmc) => {
            content += "<li><label>PM ID: <a href='https://pubmed.ncbi.nlm.nih.gov/"+pmc.pm_id+"/' target='_blank'>"+ pmc.pm_id +"</a>, PMC ID: <a href='https://www.ncbi.nlm.nih.gov/pmc/articles/PMC"+pmc.pmc_id+"/' target='_blank'>" + pmc.pmc_id + "</a>, pmc_release_date: " + pmc.pmc_release_date +"</label>";
            if(pmcData[pmc.pmc_id] && pmcData[pmc.pmc_id].data){
                content += "<div>" + pmcData[pmc.pmc_id].data + "</div>";
            }
            content += "</li>";
        });
        content += "</ul></p>";
        body += content;
    });    

    return '<!DOCTYPE html>'
       + '<html><head>' + header + '</head><body>' + body + '</body></html>';
}

const buildHtml4PM = (projectIds, pmIds, pmData, projectNums) => {
    let header = '';
    let body ="";
    
    projectIds.map((pid, idx) => {
        let pms = pmIds[idx];
        let content = "";
        content += "<p>" + "<h1>#Project ID: <a href='https://reporter.nih.gov/search/l4QHk2BZy0GR4gxdg2v8RA/project-details/"+pid+"' target='_blank'>"+ pid +"</a>, #Project Number: "+ projectNums[idx] +"</h1><ul>";
        pms.map((pm) => {
            if(pmData[pm].pmc_id == 'N/A'){
                content += "<li><label>PM ID: <a href='https://pubmed.ncbi.nlm.nih.gov/"+pm+"/' target='_blank'>"+ pm +"</a>";
            }
            else{
                content += "<li><label>PM ID: <a href='https://pubmed.ncbi.nlm.nih.gov/"+pm+"/' target='_blank'>"+ pm +"</a>, PMC ID: <a href='https://www.ncbi.nlm.nih.gov/pmc/articles/"+pmData[pm].pmc_id+"/' target='_blank'>" + pmData[pm].pmc_id + "</a>";
            }
            if(pmData[pm] && pmData[pm].outputs){
                content += "<div>" + pmData[pm].outputs + "</div>";
            }
            content += "</li>";
        });
        content += "</ul></p>";
        body += content;
    });    

    return '<!DOCTYPE html>'
       + '<html><head>' + header + '</head><body>' + body + '</body></html>';
}

const loadPMC = async (projectIds) => {
    let pmc_ids = [];
    let pmc_data = {};
	if(projectIds && projectIds.length > 0){
		//synchronziedLoadPMC_ID(projectIds,pmc_ids, 0);
        for(let i = 0; i< projectIds.length; i++){
            let d = await fetch(nih_reporter_api + projectIds[i]);
            let results = d.results;
            let pmc_set = [];
            results.forEach(element => {
                pmc_set.push({
                    pm_id: element.pm_id,
                    pmc_id: element.pmc_id,
                    pmc_release_date: element.pmc_release_date
                });
            });
            pmc_ids.push(pmc_set);
        }

        console.log(pmc_ids);

        for(let j = 0; j < pmc_ids.length; j++){
            let pmcs = pmc_ids[j];
            for(let k = 0; k < pmcs.length; k++){
                if(pmcs[k].pmc_id != null && !(pmcs[k].pmc_id in pmc_data)){
                    let d = await fetch(pmc_api_prefix + pmcs[k].pmc_id +'/');
                    if(d == "failed"){
                        pmc_data[pmcs[k].pmc_id] = {
                            release_date: pmcs[k].pmc_release_date
                        }
                    }
                    else{
                        let idx_start = d.indexOf("Associated Data");
                        if(idx_start == -1){
                            pmc_data[pmcs[k].pmc_id] = {
                                release_date: pmcs[k].pmc_release_date,
                                data: "N/A"
                            }
                        }
                        else{
                            let idx_end = d.indexOf("</dl></div>") + 5;

                            console.log(idx_start);

                            console.log(idx_end);

                            //console.log(d.substring(idx_start, len));

                            pmc_data[pmcs[k].pmc_id] = {
                                release_date: pmcs[k].pmc_release_date,
                                data: d.substring(idx_start + 20, idx_end).replace(/display\: none\;/g, "").replace(/\/pmc\/articles/g, "https://www.ncbi.nlm.nih.gov/pmc/articles")
                            }
                        }
                        
                    }
                }
            }
        }
	}
	else{
		console.log('No data need to be processed!!');
	}

    //console.log("PMC Data: ", pmc_data);
    let fileName = './output.html';
    let stream = fs.createWriteStream(fileName);

    stream.once('open', function(fd) {
        let html = buildHtml(projectIds, pmc_ids, pmc_data);

        stream.end(html);
    });

	
};

const loadPM = async (pm_id) => {
    let d = await fetch(pm_article_site + pm_id +'/');
    let result = {};
    result.pm_id = pm_id;
    result.pmc_id = "N/A";
    result.outputs = "";
    if(d != "failed"){
        let idx = d.indexOf("\"PMCID\"");
        
        if(idx > -1){
            result.pmc_id = d.substring(idx + 20, idx + 30);
        }
        else{
            idx = d.indexOf("\"PMC ID\"");
            if(idx > -1){
                result.pmc_id = d.substring(idx + 9, idx + 19);
            }
        }

        idx = d.indexOf("related-links-list");
        if(idx > -1){
            let tmp = d.substring(idx - 11);
            let idx_end = tmp.indexOf("</ul>");
            result.outputs = tmp.substring(0, idx_end + 5);
        } 
    }
    return result;
}

const loadFromPM = async (projectNums, projectIds) => {
    let pm_ids = [];
    let pm_data = {};

	if(projectNums && projectNums.length > 0){
		for(let i = 0; i< projectNums.length; i++){
            let project_core_id = getCoreId(projectNums[i]);
            let d = await fetch(pm_website +  project_core_id +"&size=100");
            let idx_start = d.indexOf("data-article-id=");
            let tmp = d, pm_set = [];
            while(idx_start > -1){
                tmp = tmp.substring(idx_start + 17);
                let str = tmp.substring(0, 8);
                pm_set.push(str);
                idx_start = tmp.indexOf("data-article-id=");
            }
            pm_ids.push(pm_set);
        }

        console.log(pm_ids);

        for(let j = 0; j < pm_ids.length; j++){
            let pms = pm_ids[j];
            for(let k = 0; k < pms.length; k++){
                if(pms[k] != null && !(pms[k] in pm_data)){
                    let d = await loadPM(pms[k]);
                    
                    pm_data[pms[k]] = d;
                }
            }
        }
	}
	else{
		console.log('No data need to be processed!!');
	}

    //console.log("PMC Data: ", pmc_data);
    let fileName = './output_pm.html';
    let stream = fs.createWriteStream(fileName);

    stream.once('open', function(fd) {
        let html = buildHtml4PM(projectIds, pm_ids, pm_data, projectNums);

        stream.end(html);
    });
	
};

module.exports = {
	loadPMC,
    loadFromPM
};