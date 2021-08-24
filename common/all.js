const axios = require('axios');
const fs = require('fs');

let nih_reporter_api = "https://reporter.nih.gov/services/Projects/Publications?projectId=";
let pmc_api_prefix = "https://www.ncbi.nlm.nih.gov/pmc/articles/";
let pm_website = "https://pubmed.ncbi.nlm.nih.gov/?term=";
let pm_article_site = "https://pubmed.ncbi.nlm.nih.gov/";
let pm_geo_site = "https://www.ncbi.nlm.nih.gov/gds/?linkname=pubmed_gds&from_uid=";
let pm_geo_detail_site = "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=";
let pm_sra_site = "https://www.ncbi.nlm.nih.gov/sra/?linkname=pubmed_sra&from_uid=";
let pm_sra_detail_site = "https://www.ncbi.nlm.nih.gov/sra/";
let pm_bioproject_detail_site = "https://www.ncbi.nlm.nih.gov/bioproject/";
let pm_dbgap_site = "https://www.ncbi.nlm.nih.gov/gap/?linkname=pubmed_gap&from_uid=";
let pm_dbgap_detail_site = "https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=";
let clinical_trials_site = "https://clinicaltrials.gov/ct2/results?cond=&term=";
let clinical_trials_api = "https://clinicaltrials.gov/ct2/results/rpc/";

let clinical_trials_detail_site_study = "https://clinicaltrials.gov/ct2/show/study/";
let clinical_trials_detail_site_record = "https://clinicaltrials.gov/ct2/show/record/";

//data
let programs = {};
let projects = {};
let publications = {};
let geos = {};
let sras = {};
let dbgaps = {};
let clinicalTrials = {};

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

const getGEOData = async (pmId) => {
    let d = await fetch(pm_geo_site + pmId);

    if(d != "failed"){
        let idx_start = d.indexOf("Accession: <");
        let idx_end = 0;
        let tmp = d, geo_set = [];
        while(idx_start > -1){
            tmp = tmp.substring(idx_start + 20);
            idx_end = tmp.indexOf("</dd>");
            let str = tmp.substring(0, idx_end);
            geo_set.push(str);
            tmp = tmp.substring(idx_end);
            idx_start = tmp.indexOf("Accession: <");
        }
        let arr = [];
        for(let g = 0; g < geo_set.length; g++){
            let geo_id = geo_set[g];
            gd = await fetch(pm_geo_detail_site + geo_id);
            let pos = 0; 
            if(gd != "failed"){
                let geo = {};
                geo.accession = geo_id;
                pos = gd.indexOf("Status</td>");
                gd = gd.substring(pos + 16);
                pos = gd.indexOf("</td>");
                geo.status = gd.substring(0, pos);

                pos = gd.indexOf("justify\">");
                gd = gd.substring(pos + 9);
                pos = gd.indexOf("</td>");
                geo.title = gd.substring(0, pos);

                pos = gd.indexOf("Submission date</td>");
                gd = gd.substring(pos + 25);
                pos = gd.indexOf("</td>");
                geo.submission_date = gd.substring(0, pos);

                pos = gd.indexOf("Last update date</td>");
                gd = gd.substring(pos + 26);
                pos = gd.indexOf("</td>");
                geo.last_update_date = gd.substring(0, pos);
                arr.push(geo);
            }
        }
        return arr;
    }
    else{
        return "";
    }
}

const getSRAData = async (pmId) => {
    let d = await fetch(pm_sra_site + pmId);

    if(d != "failed"){
        let idx = d.indexOf("Items:");
        let srx = d.substring(idx+6);
        idx = srx.indexOf("</h3>");
        let count_str = srx.substring(0, idx);
        let count = 0;
        idx = count_str.indexOf("of")
        if(idx > -1){
            count_str = count_str.substring(idx+3);
        }
        count = parseInt(count_str);
        
        idx = srx.indexOf("Accession: ");
        srx = srx.substring(idx + 21);
        idx = srx.indexOf("</dd>");
        let accession_0 = srx.substring(0, idx);
        let srx_arr = [];
        let integer = parseInt(accession_0.substring(3));
        while(count-- > 0){
            srx_arr.push("SRX" + (integer - count));
        }
        let arr = [];
        let sra_detail = await fetch(pm_sra_detail_site + accession_0 + "[accn]");
        let pos = 0; 
        if(sra_detail != "failed"){
            let sra = {};
            pos  = sra_detail.indexOf("Study: ");
            sra_detail = sra_detail.substring(pos + 13);
            pos = sra_detail.indexOf("<div class=\"expand-body\">");
            sra.study_title = sra_detail.substring(0, pos);

            pos = sra_detail.indexOf("Link to BioProject\">");
            sra_detail = sra_detail.substring(pos + 20);
            pos = sra_detail.indexOf("</a>");
            sra.bio_accession = sra_detail.substring(0, pos);

            pos = sra_detail.indexOf("Link to SRA Study\">");
            sra_detail = sra_detail.substring(pos + 19);
            pos = sra_detail.indexOf("</a>");
            sra.accession = sra_detail.substring(0, pos);
            
            //find GEO 
            let bioproject_detail = await fetch(pm_bioproject_detail_site + sra.bio_accession);
            if(bioproject_detail != "failed"){
                let acc = "";
                pos  = bioproject_detail.indexOf(sra.bio_accession+";");
                bioproject_detail = bioproject_detail.substring(pos);
                pos = bioproject_detail.indexOf("</td>");
                acc = bioproject_detail.substring(0, pos);
                let arr_geo = acc.split(";");
                sra.geo = arr_geo[1].trim().substring(5);

                pos = bioproject_detail.indexOf("Registration date");
                sra.reg_date = bioproject_detail.substring(pos+19, pos + 30);
            }
            arr.push(sra);
        }
        return arr;
    }
    else {
        return "";
    }
}

const getDBGapData = async (pmId) => {
    let d = await fetch(pm_dbgap_site + pmId);

    if(d != "failed"){
        let idx_start = d.indexOf("font-weight:600");
        let tmp = d, dbgap_set = [];
        while(idx_start > -1){
            tmp = tmp.substring(idx_start + 17);
            idx_start = tmp.indexOf("</span>");
            let str = tmp.substring(0, idx_start);
            dbgap_set.push(str);
            idx_start = tmp.indexOf("font-weight:600");
        }

        let arr = [];

        for(let k = 0; k < dbgap_set.length; k++){
            let study_id = dbgap_set[k];
            let dbgap_detail = await fetch(pm_dbgap_detail_site + study_id);
            let pos = 0; 
            if(dbgap_detail != "failed"){
                let dbgap = {};
                dbgap.accession = study_id;

                pos  = dbgap_detail.indexOf("name=\"study-name\"");
                dbgap_detail = dbgap_detail.substring(pos + 19);
                pos = dbgap_detail.indexOf("</span>");
                dbgap.title = dbgap_detail.substring(0, pos);

                pos = dbgap_detail.indexOf("<b>Release Date:");
                dbgap_detail = dbgap_detail.substring(pos + 20);
                pos = dbgap_detail.indexOf("</li>");
                dbgap.release_date = dbgap_detail.substring(0, pos);
                arr.push(dbgap);
            }
        }

        return arr;
    }
    else {
        return "";
    }
}

const getClinicalTrials = async (project_core_id) => {
    let d = await fetch(clinical_trials_site + project_core_id);
    if(d != "failed"){
        let idx = d.indexOf("/ct2/results/rpc/");
        d = d.substring(idx + 17);
        idx = d.indexOf("\",");
        let session = d.substring(0, idx);
        let dt = await fetch(clinical_trials_api + session);
        let arr = [];
        dt.data.map((item) => {
            let ct = {};
            let str = item[3].substring(item[3].indexOf("\">") + 2);
            str = str.substring(0, str.length - 4);
            ct.title = str;
            ct.ct_id = item[1];
            ct.first_posted = item[21];
            ct.first_submitted = item[21];
            arr.push(ct);
        });
        return arr;
    }
    else{
        return "";
    }
}

const loadFromPM = async (pmId) => {
    let d = await fetch(pm_article_site + pmId +'/');
    let outputs = "";
    let result = "";
    if(d != "failed"){
        let idx = d.indexOf("related-links-list");
        if(idx > -1){
            let tmp = d.substring(idx - 11);
            let idx_end = tmp.indexOf("</ul>");
            outputs = tmp.substring(0, idx_end + 5);
            //Get GEO DataSets
            if(outputs.indexOf("Related GEO DataSets") > -1){
                let dt = await getGEOData(pmId);
                result += "<label style=\"font-weight: 600;\">GEO DataSets</label>";
                if(dt != ""){
                    dt.map((d) => {
                        result += "<div>Accession: " + d.accession + ", Status: " + d.status + ", title: " + d.title + ", Submission Date: " + d.submission_date + ", Last update date: " + d.last_update_date + "</div>";
                    });
                }
                
            }
            if(outputs.indexOf("Links to Short Read Archive Experiments") > -1){
                let dt = await getSRAData(pmId);
                result += "<label style=\"font-weight: 600;\">SRA</label>";
                if(dt != ""){
                    dt.map((d) => {
                        result += "<div>Accession: " + d.accession + ", Study title: " + d.study_title + ", BioProject Accession: " + d.bio_accession + ", GEO: " + d.geo + ", Registration date: " + d.reg_date + "</div>";
                    });
                }
            }
            if(outputs.indexOf("Related dbGaP record") > -1){
                let dt = await getDBGapData(pmId);
                result += "<label style=\"font-weight: 600;\">dbGap</label>";
                if(dt != ""){
                    dt.map((d) => {
                        result += "<div>Accession: " + d.accession + ", Title: " + d.title + ", Release date: " + d.release_date + "</div>";
                    });
                }
            }
        } 
    }
    return result;
}

const loadFromPMC = async (pmcId) => {
    let content = {};
    let d = await fetch(pmc_api_prefix + pmcId +'/');
    if(d != "failed"){
        let idx_start = d.indexOf("Associated Data");
        if(idx_start == -1){
            content.associated_data = "";
        }
        else{
            let idx_end = d.indexOf("</dl></div>") + 5;
            content.associated_data = d.substring(idx_start + 20, idx_end).replace(/display\: none\;/g, "").replace(/\/pmc\/articles/g, "https://www.ncbi.nlm.nih.gov/pmc/articles")
            .replace("<a href=\"#\" rid=\"data-suppmats\" data-ga-action=\"click_feat_toggler\" data-ga-label=\"Supplementary Materials\" class=\"pmctoggle\">Supplementary Materials</a>", "Supplementary Materials")
            .replace("<a href=\"#\" rid=\"data-avl-stmnt\" data-ga-action=\"click_feat_toggler\" data-ga-label=\"Data Availability Statement\" class=\"pmctoggle\">Data Availability Statement</a>", "Data Availability Statement");
        }

        let cache = [];
        //Look for GEO
        content.geo = [];
        let geos = d.match(/GSE[0-9]{6}/g);
        if(geos != null && geos.length > 0){
            geos.map(function(geo){
                if(cache.indexOf(geo) == -1){
                    content.geo.push(geo);
                    cache.push(geo);
                }
            })
        }

        cache = [];
        //Look for SRA
        content.sra = [];
        let sras = d.match(/SRX[0-9]{7}/g);
        if(sras != null && sras.length > 0){
            sras.map(function(sra){
                if(cache.indexOf(sra) == -1){
                    content.sra.push(sra);
                    cache.push(sra);
                }
            })
        }

        cache = [];
        sras = d.match(/SRP[0-9]{6}/g);
        if(sras != null && sras.length > 0){
            sras.map(function(srp){
                if(cache.indexOf(srp) == -1){
                    content.sra.push(srp);
                    cache.push(srp);
                }
            })
        }
        //Look for dbGaP
        cache = [];
        content.dbgap = [];
        let phses = d.match(/phs[0-9]{6}.v{0-9}.p{0-9}/g);
        if(phses != null && phses.length > 0){
            phses.map(function(phs){
                if(cache.indexOf(phs) == -1){
                    content.dbgap.push(phs);
                    cache.push(phs);
                }
            })
        }
        //Look for PRJNA
        cache = [];
        content.prjna = [];
        let prjnas = d.match(/PRJNA[0-9]{6}/g);
        if(prjnas != null && prjnas.length > 0){
            prjnas.map(function(prjna){
                if(cache.indexOf(prjna) == -1){
                    content.prjna.push(prjna);
                    cache.push(prjna);
                }
            })
        }
        //Look for clinical trials number
        cache = [];
        content.clinical_trials = [];
        let cts = d.match(/NCT[0-9]{8}/g);
        if(cts != null && cts.length > 0){
            cts.map(function(ct){
                if(cache.indexOf(ct) == -1){
                    content.clinical_trials.push(ct);
                    cache.push(ct);
                }
            })
        }

        let have_content = false;
        let result = "<div><ul>";
        if(content.associated_data != ""){
            result += "<li>" + content.associated_data + "</li>";
            have_content = true;
        }
        if(content.geo.length > 0){
            result += "<li><b>GEO</b>: " + content.geo.join() + "</li>";
            have_content = true;
        }
        if(content.sra.length > 0){
            result += "<li><b>SRA</b>: " + content.sra.join() + "</li>";
            have_content = true;
        }
        if(content.dbgap.length > 0){
            result += "<li><b>dbGaP</b>: " + content.dbgap.join() + "</li>";
            have_content = true;
        }
        if(content.prjna.length > 0){
            result += "<li><b>PRJNA</b>: " + content.prjna.join() + "</li>";
            have_content = true;
        }
        if(content.clinical_trials.length > 0){
            result += "<li><b>Clinical Trials</b>: " + content.clinical_trials.join() + "</li>";
            have_content = true;
        }
        result += "</ul></div>";
        return have_content ? result : "";
    }
    else{
        return "";
    }
}

const buildHtml = async (projectIds, pmIds, pmData, projectNums) => {
    let header = '';
    let body ="";

    for(let p = 0; p < projectIds.length; p++){
        console.log("Collecting data for project: ", projectNums[p]);
        let pid = projectIds[p];
        let pms = pmIds[p];
        let content = "";
        content += "<p>" + "<h1>#Project ID: <a href='https://reporter.nih.gov/search/l4QHk2BZy0GR4gxdg2v8RA/project-details/"+pid+"' target='_blank'>"+ pid +"</a>, Project Number: "+ projectNums[p] +"</h1>";
        content += "<h2>Publications</h2>";
        content += "<ul>";
        for(let m = 0; m < pms.length ; m++){
            let pm = pms[m];
            if(pmData[pm].pmc_id == 'N/A'){
                content += "<li><label  style=\"font-weight: 600;\">PM ID: <a href='https://pubmed.ncbi.nlm.nih.gov/"+pm+"/' target='_blank'>"+ pm +"</a>, DOI: " + pmData[pm].DOI +", Citation: " + pmData[pm].citations + "</label>";
            }
            else{
                content += "<li><label  style=\"font-weight: 600;\">PM ID: <a href='https://pubmed.ncbi.nlm.nih.gov/"+pm+"/' target='_blank'>"+ pm +"</a>, PMC ID: <a href='https://www.ncbi.nlm.nih.gov/pmc/articles/"+pmData[pm].pmc_id+"/' target='_blank'>" + pmData[pm].pmc_id + "</a>, DOI: " + pmData[pm].DOI + ", Citation: " + pmData[pm].citations + "</label>";
            }

            content += "<div style=\"display: flex;\">";
            //content for PM
            
            let ctt = await loadFromPM(pm);
            if(ctt != ""){
                content += "<div style=\"width:40%;border: 1px solid black;margin: 10px;border-radius: 5px;\"><h4>PubMed</h4>";
                content += ctt;
                content += "</div>";
            }
            
            //content for PMC
            
            if(pmData[pm].pmc_id != 'N/A'){
                ctt = await loadFromPMC(pmData[pm].pmc_id);
                if(ctt != ""){
                    content += "<div style=\"width:40%;border: 1px solid black;margin: 10px;border-radius: 5px;\"><h4>PubMed Central</h4>";
                    content += ctt;
                    content += "</div>";
                }
                
            }
            content += "</div>";
            content += "</li>";
        }
        content += "</ul>";
        content += "<h2>Clinical Trials</h2>";
        let ct = await getClinicalTrials(getCoreId(projectNums[p]));
        if(ct == ""){
            content += "<div>N/A</div>";
        }
        else{
            ct.map((d) => {
                content += "<div>Title: " + d.title + ", Clinical Trial Number: " + d.ct_id + ", First Posted Date: " + d.first_posted + "</div>";
            });
        }
        content += "<h2>Patent</h2>";
        content += "</p>";
        body += content;
        console.log("Collected data for project: ", projectNums[p]);
    }

    return '<!DOCTYPE html>'
       + '<html><head>' + header + '</head><body style="word-break: break-word;">' + body + '</body></html>';
}

const getPMCFromPM = async (pm_id) => {
    let d = await fetch(pm_article_site + pm_id +'/');
    let result = {};
    result.pm_id = pm_id;
    result.pmc_id = "N/A";
    result.DOI = "";
    result.citations = 0;
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

        idx = d.indexOf("\"DOI\"");
        let tmp = d.substring(idx + 18, idx + 200);
        idx = tmp.indexOf("</a>");
        let doi = tmp.substring(0, idx);
        result.DOI = doi.trim();
        idx = d.indexOf("\"amount\"");
        if(idx > -1){
            tmp = d.substring(idx, idx + 50);
            result.citations = d.substring(idx + 9, idx + tmp.indexOf("</em>"));
        }
    }
    return result;
}

const loadAll = async (projectNums) => {
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

        

        for(let j = 0; j < pm_ids.length; j++){
            let pms = pm_ids[j];
            console.log("Getting PM IDs for ",projectNums[j], ": ", pms);
            for(let k = 0; k < pms.length; k++){
                if(pms[k] != null && !(pms[k] in pm_data)){
                    let d = await getPMCFromPM(pms[k]);
                    console.log("Done for ",pms[k]);
                    pm_data[pms[k]] = d;
                }
            }
            console.log("PMC data collected for project :", projectNums[j]);
        }
	}
	else{
		console.log('No data need to be processed!!');
	}

    let html = await buildHtml(projectIds, pm_ids, pm_data, projectNums);

    //console.log("PMC Data: ", pmc_data);
    let fileName = './output_all.html';
    let stream = fs.createWriteStream(fileName);

    stream.once('open', function(fd) {
        
        stream.end(html);
    });
};

module.exports = {
	loadAll
};