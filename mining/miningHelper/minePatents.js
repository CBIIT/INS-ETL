const {
  fetch,
  post,
  getCoreId
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

        if (!cluster[project_core_id]) {  // if we haven't seen this core id yet, make a new entry
            cluster[project_core_id] = {"term": project_core_id, "project_group": [keys[i]]};
        }
        else {  // if we have seen it, append a project
            if (cluster[project_core_id].project_group.indexOf(keys[i]) === -1) {
                cluster[project_core_id].project_group.push(keys[i]);
            }
        }
    }
    return cluster;
};

const run = async (projects, patents) => {
    const cluster = prepareSearchTerms(projects);
    const from_date = new Date("2017-01-01");
    const keys = Object.keys(cluster);
    let counter = 0;
    console.log("Querying patent publications...");
    for (let i = 0; i < keys.length; i++) {
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
                        patents[results[j]["guid"]].projects.push(...cluster[keys[i]].project_group);
                        counter += 1;
                    }
                }
            }
            console.log(counter + " patents found for query term " + term + " [" + (i+1) + "/" + Object.keys(cluster).length + "]");
            counter = 0;
        }
    }
    // // do publications
    // for (let i = 0; i < keys.length; i++) {
    //     const term = cluster[keys[i]].term;
    //     console.log(util.format(apis.usptoApiEndpointPublications,term,from_date));
    //     let results = await fetch(util.format(apis.usptoApiEndpointPublications,term,from_date), true);
    //     results = results["results"];
    //     for (let j = 0; j < results.length; j++) {
    //         if (!patents[results[j]["publicationDocumentIdentifier"]]) {
    //             patents[results[j]["publicationDocumentIdentifier"]] = {};
    //             patents[results[j]["publicationDocumentIdentifier"]].fulfilled_date = results[j]["publicationDate"];
    //             if(!patents[results[j]["publicationDocumentIdentifier"]].projects) {
    //                 patents[results[j]["publicationDocumentIdentifier"]].projects = [];
    //             }
    //             patents[results[j]["publicationDocumentIdentifier"]].projects.push(...cluster[keys[i]].project_group);
    //             counter += 1;
    //         }
    //     }
    //     console.log(counter + " patent publications found for query term " + term + " [" + (i+1) + "/" + Object.keys(cluster).length + "]");
    //     counter = 0;
    // }
    // console.log("Querying patent grants...");
    // // do grants
    // for (let i = 0; i < keys.length; i++) {
    //     const term = cluster[keys[i]].term;
    //     console.log(util.format(apis.usptoApiEndpointGrants,term,from_date));
    //     let results = await fetch(util.format(apis.usptoApiEndpointGrants,term,from_date), true);
    //     results = results["results"];
    //     for (let j = 0; j < results.length; j++) {
    //         if (!patents[results[j]["grantDocumentIdentifier"]]) {
    //             patents[results[j]["grantDocumentIdentifier"]] = {};
    //             patents[results[j]["grantDocumentIdentifier"]].fulfilled_date = results[j]["grantDate"];
    //             if(!patents[results[j]["grantDocumentIdentifier"]].projects) {
    //                 patents[results[j]["grantDocumentIdentifier"]].projects = [];
    //             }
    //             patents[results[j]["grantDocumentIdentifier"]].projects.push(...cluster[keys[i]].project_group);
    //             counter += 1;
    //         }
    //     }
    //     console.log(counter + " patent grants found for query term " + term + " [" + (i+1) + "/" + Object.keys(cluster).length + "]");
    //     counter = 0;
    // }
};

module.exports = {
	run
};
