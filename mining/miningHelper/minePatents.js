const {
  post,
  getCoreId,
  getActivityCode
} = require('../../common/utils');
const apis = require('../../common/apis');
const util = require('util');


// data paths to change:
//     post_body["query"]["q"]
//     post_body["query"]["query_name"]
//     post_body["query"]["userEnteredQuery"]
let post_body = {"start":0,"pageCount":500,"sort":"date_publ desc","docFamilyFiltering":"familyIdFiltering","searchType":1,"familyIdEnglishOnly":true,"familyIdFirstPreferred":"US-PGPUB","familyIdSecondPreferred":"USPAT","familyIdThirdPreferred":"FPRS","showDocPerFamilyPref":"showEnglish","queryId":0,"tagDocSearch":false,"query":{"caseId":1,"hl_snippets":"2","op":"OR","q":null,"queryName":null,"highlights":"1","qt":"brs","spellCheck":false,"viewName":"tile","plurals":true,"britishEquivalents":true,"databaseFilters":[{"databaseName":"US-PGPUB","countryCodes":[]},{"databaseName":"USPAT","countryCodes":[]},{"databaseName":"USOCR","countryCodes":[]}],"searchType":1,"ignorePersist":true,"userEnteredQuery":null}}

const prepareSearchTerms = (projects) => {
    let cluster = {};
    const keys = Object.keys(projects);
    for (let i = 0; i < keys.length; i++) {
        let project_core_id = getCoreId(keys[i]);
        let project_activity_code = getActivityCode(keys[i]);
        let award_notice_date = projects[keys[i]].award_notice_date

        if (!cluster[project_core_id]) {  // if we haven't seen this core id yet, make a new entry
            cluster[project_core_id] = {"term": project_core_id, "queried_project_id": [project_activity_code+project_core_id], "award_notice_date": award_notice_date};
        }
        else {  // if we have seen it, append a project
            if (cluster[project_core_id].queried_project_id.indexOf(project_activity_code+project_core_id) === -1) {
                cluster[project_core_id].queried_project_id.push(project_activity_code+project_core_id);
                // keep the oldest date in the cluster
                const current = new Date(cluster[project_core_id].award_notice_date);
                const potential = new Date(projects[keys[i]].award_notice_date);
                if (potential < current) {
                    cluster[project_core_id].award_notice_date = projects[keys[i]].award_notice_date;
                }
            }
        }
    }
    return cluster;
};

const run = async (projects, patents) => {
    const cluster = prepareSearchTerms(projects);
    const keys = Object.keys(cluster);
    let counter = 0;
    console.log("Querying patents...");
    for (let i = 0; i < keys.length; i++) {
        const from_date = new Date(cluster[keys[i]].award_notice_date);
        const term = "*" + cluster[keys[i]].term + "*";
        post_body["query"]["q"] = term;
        post_body["query"]["queryName"] = term;
        post_body["query"]["userEnteredQuery"] = term;
        console.log(apis.usptoPubwebappEndpoint);
        let results = await post(apis.usptoPubwebappEndpoint, post_body, true);
        if (results !== "failed") {
            results = results["patents"];
            for (let j = 0; j < results.length; j++) {
                const date_published = new Date(results[j]["datePublished"]);
                if (from_date <= date_published) {
                    if (!patents[results[j]["guid"]]) {
                        patents[results[j]["guid"]] = {};
                        patents[results[j]["guid"]].fulfilled_date = results[j]["datePublished"];
                        if (!patents[results[j]["guid"]].projects) {
                            patents[results[j]["guid"]].projects = [];
                        }
                        // patents[results[j]["guid"]].projects.push(...cluster[keys[i]].project_group);  // 03/11/22 adeforge we shouldn't be deriving this? 
                        patents[results[j]["guid"]].projects.push(...cluster[keys[i]].queried_project_id);  // for downstream queries, this should give the same result, make like publications which also connect directly to projects
                        counter += 1;
                    }
                }
            }
            console.log(counter + " patents found for query term " + term + " [" + (i+1) + "/" + Object.keys(cluster).length + "]");
            counter = 0;
        }
    }
};

module.exports = {
	run
};
