const {
  fetch,
  fetchWithStatusCheck
} = require('../../common/utils');
const apis = require('../../common/apis');
// const {
//   loadCache,
//   writeToCache
// } = require('../miningHelper/miningCacher');


const searchPatentDetail = async (patent, patentID) => {
    console.log(apis.usptoPatentsDetailSite + patentID);
    let d = await fetch(apis.usptoPatentsDetailSite + patentID, true);  // true is keep trying
    if (d !== "failed") {
        if (d.indexOf("<title>  []</title>") === -1) {
            let temp = d;
            // get kind code
            let idx = temp.indexOf("<b>Kind Code</b></td>");  // 21 characters
            if (idx > -1) {
                temp = temp.substring(idx + 21);
                idx = temp.indexOf("</b></td>");
                let kind_code = temp.substring((idx-2), idx);
                patent.kind_code = kind_code;
            }
            else {
                patent.kind_code = "N/A";
            }

            // get filed date
            temp = d;
            idx = temp.indexOf("<tr><td>Filed Date</td><td>");  // 27 characters
            if (idx > -1) {
                temp = temp.substring(idx + 27);
                idx = temp.indexOf("</td></tr></table>");
                let filed_date = temp.substring(0, idx);
                patent.filed_date = filed_date;
            }
            else {
                patent.filed_date = "N/A";
            }

            // get cited project ids
            patent.cited_pattern_project_id = "N/A";
            patent.cited_raw_project_id = "N/A";
            temp = d;
            idx = temp.indexOf("Goverment Interests");  // 19 characters, it is misspelled on the site
            if (idx > -1) {
                temp = temp.substring(idx);
                idx = temp.indexOf("Claims");
                if (idx > -1) {
                    temp = temp.substring(0,idx);  // what we want to search is in the 'Goverment[sic] Interests' section before the 'Claims' section
                    for (let i = 0; i < patent.queried_project_id.length; i++) {
                        // pattern means find what's in this section of the forms we're aware of
                        if (patent.cited_pattern_project_id === "N/A") {
                            patent.cited_pattern_project_id = [];
                        }
                        let pattern = /([A-Z][0-9]{2}[ -]?)?[A-Z]{2}[0-9]{6}([ -]?[0-9]{2}([A-Z][0-9])?)?/g;  // matches a project ID
                        let t = temp.replace(/(\r\n|\r|\n|\t)/gm, "");
                        t = t.match(pattern);
                        if (t) {
                            patent.cited_pattern_project_id.push(...t);  // strip newlines (and tabs) and pattern match
                        }

                        // raw means see what's around the found project id
                        idx = temp.indexOf(patent.queried_project_id[i]);
                        while (idx > -1) {
                            if (patent.cited_raw_project_id === "N/A") {
                                patent.cited_raw_project_id = [];
                            }
                            let low_end = idx - 15;
                            low_end = (idx < 0) ? 0 : low_end;
                            let high_end = idx + patent.queried_project_id[i].length + 15;
                            high_end = (idx > temp.length) ? temp.length-1 : high_end;
                            patent.cited_raw_project_id.push(temp.substring(low_end,high_end).replace(/(\r\n|\r|\n|\t)/gm, ""));  // 15 characters on either side of the matched query term
                            temp = temp.substring(idx + patent.queried_project_id[i].length);  // get past the queried term
                            idx = temp.indexOf(patent.queried_project_id[i]);  // see if there is another result
                        }
                    }
                    console.log("Citation details acquired.");
                }
            }
            console.log("Details acquired for patent " + patentID);
        }
    }
};

const run = async (patents) => {
    const patentNums = Object.keys(patents);
    for (let i = 0; i < patentNums.length; i++) {
        console.log("Mining details for patent: " + patentNums[i] + " [" + (i+1) + "/" + patentNums.length + "]");
        await searchPatentDetail(patents[patentNums[i]], patentNums[i]);
    }
};

module.exports = {
	run
};
  