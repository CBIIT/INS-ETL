const {
  fetch,
  getCoreId,
  getActivityCode
} = require('../../common/utils');
const apis = require('../../common/apis');


// we can't use caching because projects update dynamically
const searchPatents = async (search_terms, patents, project_group) => {
    let counter = 0;
    for (let i = 0; i < search_terms.length; i++) {
        let term = search_terms[i];
        console.log(apis.usptoPatentsSite + term);
        let d = await fetch(apis.usptoPatentsSite + term, true);  // true is keep trying
        let pattern = new RegExp(/\/patent\/app\/\d{11}#:~:text=/, "g");  // patent numbers are 11 digits, 01/31/2022 adeforge are they always 11 digits?
        let result = d.match(pattern);
        result = [...new Set(result)];  // unique results
        if (result !== null) {
            for (let j = 0; j < result.length; j++) {
                result[j] = result[j].substring(12);  // get past '/patent/app/'
                let idx = result[j].indexOf("#:~:text=");
                let p = result[j].substring(0,idx);  // the patent id we want
                if (!patents[p]) {
                    patents[p] = {};
                    counter += 1;
                }
                if (!patents[p].queried_project_id) {
                    patents[p].queried_project_id = [];
                }
                if (patents[p].queried_project_id.indexOf(term) === -1) {
                    patents[p].queried_project_id.push(term);
                }
                if (!patents[p].projects) {
                    patents[p].projects = [];
                }
                project_group.forEach(element => {
                    if (patents[p].projects.indexOf(element) === -1) {
                        patents[p].projects.push(element);
                    }
                });
            }
        }
    }
    console.log("Found " + counter + " patent(s).");
};

const prepareSearchTerms = (projects) => {
    let cluster = {};
    const keys = Object.keys(projects);
    for (let i = 0; i < keys.length; i++) {
        let project_core_id = getCoreId(keys[i]);
        let project_activity_code = getActivityCode(keys[i]);

        if (cluster[project_activity_code + project_core_id] == undefined) {  // if we haven't seen this activity code + core id yet, make a new entry
            cluster[project_activity_code + project_core_id] = {"search_terms": [project_activity_code + project_core_id, project_core_id], "project_group": [keys[i]]};
        }
        else {  // if we have seen it, append a project
            if (cluster[project_activity_code + project_core_id].project_group.indexOf(keys[i]) === -1) {
                cluster[project_activity_code + project_core_id].project_group.push(keys[i]);
            }
        }
    }
    return cluster;
};

const run = async (projects, patents) => {
    let cluster = prepareSearchTerms(projects);
    const keys = Object.keys(cluster);
    for (let i = 0; i < keys.length; i++) {
        let search_terms = cluster[keys[i]].search_terms;
        let project_group = cluster[keys[i]].project_group;
        console.log("Mining patents for project group: " + keys[i] + " [" + (i+1) + "/" + keys.length + "]");  // the first search term is activity code + core id
        await searchPatents(search_terms, patents, project_group);
    } 
};

module.exports = {
	run
};
