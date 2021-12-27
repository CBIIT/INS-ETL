let _ = require("lodash");
const {
  fetch,
  getCoreId,
  getActivityCode,
  getLeadingNumeral,
  getSuffix,
} = require('../../common/utils');
const apis = require('../../common/apis');
const fs = require('fs');
const {
  loadCache,
  writeToCache
} = require('../miningHelper/miningCacher');

// caching feature for icite publication details
let icite_cache = {};
const icite_cache_location = "config/icite_publication_cache.tsv";
const icite_cache_columns = ["pmid", "journal", "title", "authors", "year", "citation_count", "doi", "relative_citation_ratio", "rcr_range", "nih_percentile"];

const getIciteData = async (publications) => {
  const pmIds = Object.keys(publications);
  for(let p = 0; p < pmIds.length; p++){
    // check for a cache hit
    if (icite_cache[pmIds[p]]) {
      publications[pmIds[p]].journal = icite_cache[pmIds[p]]["journal"];
      publications[pmIds[p]].title = icite_cache[pmIds[p]]["title"];
      publications[pmIds[p]].authors = icite_cache[pmIds[p]]["authors"];
      publications[pmIds[p]].year = icite_cache[pmIds[p]]["year"];
      publications[pmIds[p]].citation_count = icite_cache[pmIds[p]]["citation_count"];
      publications[pmIds[p]].doi = icite_cache[pmIds[p]]["doi"];
      publications[pmIds[p]].relative_citation_ratio = icite_cache[pmIds[p]]["relative_citation_ratio"];
      publications[pmIds[p]].rcr_range = icite_cache[pmIds[p]]["rcr_range"];
      publications[pmIds[p]].nih_percentile = icite_cache[pmIds[p]]["nih_percentile"];
      console.log("Icite cache hit for publication: " + pmIds[p]);
      continue;
    }

    let d = await fetch(apis.iciteApi +  pmIds[p], true);  // true to keep trying until successful response

    if(d.data && d.data.length > 0){
      let pmData = d.data[0];
      publications[pmIds[p]].journal = pmData.journal;
      publications[pmIds[p]].title = pmData.title.replace(/\n/g,"").replace(/<i>/g,"").replace(/<\/i>/g,"").replace(/<sup>/g,"").replace(/<\/sup>/g,"").replace(/<b>/g,"").replace(/<\/b>/g,"");
      publications[pmIds[p]].authors = pmData.authors;
      publications[pmIds[p]].year = pmData.year;
      publications[pmIds[p]].citation_count = pmData.citation_count;
      publications[pmIds[p]].doi = pmData.doi;
      publications[pmIds[p]].relative_citation_ratio = pmData.relative_citation_ratio;
      //calculate rcr_range
      publications[pmIds[p]].rcr_range = "< 0.2";
      if(pmData.relative_citation_ratio == null){
        publications[pmIds[p]].rcr_range = "N/A";
      }
      else if(pmData.relative_citation_ratio < 0.2) {
        publications[pmIds[p]].rcr_range = "< 0.2";
      }
      else if(pmData.relative_citation_ratio >= 0.2 && pmData.relative_citation_ratio < 0.5) {
        publications[pmIds[p]].rcr_range = "0.2 to 0.5";
      }
      else if(pmData.relative_citation_ratio >= 0.5 && pmData.relative_citation_ratio < 0.8) {
        publications[pmIds[p]].rcr_range = "0.5 to 0.8";
      }
      else if(pmData.relative_citation_ratio >= 0.8 && pmData.relative_citation_ratio < 1.25) {
        publications[pmIds[p]].rcr_range = "0.8 to 1.25";
      }
      else if(pmData.relative_citation_ratio >= 1.25 && pmData.relative_citation_ratio < 2) {
        publications[pmIds[p]].rcr_range = "1.25 to 2";
      }
      else if(pmData.relative_citation_ratio >= 2 && pmData.relative_citation_ratio < 5) {
        publications[pmIds[p]].rcr_range = "2 to 5";
      }
      else {
        publications[pmIds[p]].rcr_range = "> 5";
      }

      publications[pmIds[p]].nih_percentile = pmData.nih_percentile;

      // write to icite publication cache since it was a cache miss
      writeToCache(icite_cache_location, [pmIds[p], publications[pmIds[p]].journal, publications[pmIds[p]].title, publications[pmIds[p]].authors,
                                          publications[pmIds[p]].year, publications[pmIds[p]].citation_count, publications[pmIds[p]].doi,
                                          publications[pmIds[p]].relative_citation_ratio, publications[pmIds[p]].rcr_range, publications[pmIds[p]].nih_percentile]);

      console.log(`Updated Publication data from icite for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    }
    else{
      publications[pmIds[p]].journal = "N/A";
      publications[pmIds[p]].title = "N/A";
      publications[pmIds[p]].authors = "N/A";
      publications[pmIds[p]].year = "N/A";
      publications[pmIds[p]].citation_count = "N/A";
      publications[pmIds[p]].doi = "N/A";
      publications[pmIds[p]].relative_citation_ratio = "N/A";
      //calculate rcr_range
      publications[pmIds[p]].rcr_range = "N/A";
      publications[pmIds[p]].nih_percentile = "N/A";
      console.log(`No data found, initiated Publication data from icite for : ${pmIds[p]}, (${p+1}/${pmIds.length})`);
    }
  }
};

// returns a parsed page with one publication
const parsePublicationPage = async (hypertext, filter_date) => {
  let pubs = {};
  let data_article_id = null;
  let publish_date = null;

  // get the PubMed id
  let idx_id = hypertext.indexOf("id=\"article-page");
  if (idx_id <= -1) {
    return pubs;
  } 
  else {
    let tmp_hypertext = hypertext.substring(idx_id);
    let idx_pmid = tmp_hypertext.indexOf("data-article-pmid=");
    if (idx_pmid <= -1) {
      return pubs;
    }
    else {
      tmp_hypertext = tmp_hypertext.substring(idx_pmid + 19);  // skip of the 19 characters that is 'data-article-pmid='
      data_article_id = tmp_hypertext.substring(0,8);  // PubMed id is 8 numbers
    }
  }

  // get the publication publish date
  let idx_class = hypertext.indexOf("class=\"cit\">");
  if (idx_class <= -1) {
    console.log("Failed to parse citation on single page result.");
    return pubs;
  }
  else {
    temp_hypertext = hypertext.substring(idx_class + 12);  // skip the 12 characters that is 'class="cit">'
    let idx_end_citation_0 = temp_hypertext.indexOf(";") === -1 ? 99999999 : temp_hypertext.indexOf(";");
    let idx_end_citation_1 = temp_hypertext.indexOf(":") === -1 ? 99999999 : temp_hypertext.indexOf(":");
    let idx_end_citation_2 = temp_hypertext.indexOf(".") === -1 ? 99999999 : temp_hypertext.indexOf(".");
    let idx_end_citation = Math.min(idx_end_citation_0, idx_end_citation_1, idx_end_citation_2);
    publish_date = temp_hypertext.substring(0, idx_end_citation);
  }

  // check to see if the publish date is too old to record, otherwise record
  if(Date.parse(publish_date) >= filter_date){
    pubs[data_article_id] = {};
    pubs[data_article_id].publish_date = publish_date;
    console.log("Result's PubMed ID " + data_article_id);
  }
  else {
    console.log("Result too old to record.");
  }
  return pubs;
};

// returns a parsed page of publications
const parsePublicationsPages = async (hypertext, uri, filter_date, project_core_id) => {
  let pubs = {};
  let idx_start = 0;
  let currPage = 1;
  let isEnd = false;
  while (!isEnd){
    let d = null;
    // the first page is given as the 'hypertext' parameter
    if (currPage >= 2) {
      d = await fetch(uri + currPage, true);  // true to keep trying until successful response
    }
    else {
      d = hypertext;
    }
    
    // check to see if project core id was excluded by PubMed search
    // only searches on a single 'term with a space' need this, the problem with terms with a space is part of the term can be excluded,
    //  leaving results for only part of a search term (false positives).
    if (currPage === 1) {
      let idx_not_found_0 = d.indexOf("The following term was not found in PubMed: ");  // 44 characters
      let idx_not_found_1 = d.indexOf("The following terms were not found in PubMed: ");  // 46 characters
      let idx_not_found = Math.max(idx_not_found_0, idx_not_found_1);
      if (idx_not_found > -1) {
        let message_offset = (idx_not_found === idx_not_found_0) ? 44 : 46;  // figure out how many characters to skip to get to terms
        let temp_d = d.substring(idx_not_found + message_offset);  // offset substring past 'The following term...'
        let idx_terms_not_found_0 = temp_d.indexOf("\"");
        let idx_terms_not_found_1 = temp_d.indexOf("<");
        let idx_terms_not_found = Math.min(idx_terms_not_found_0, idx_terms_not_found_1);  // no need to check for positive index
        let temp_terms_not_found = temp_d.substring(0, idx_terms_not_found);
        let terms_not_found = temp_terms_not_found.split(", ");
        // check if project core id was excluded from search terms
        // for when terms with a space are searched (individually)
        let excluded = false;
        for (var i = 0; i < terms_not_found.length; i++) {
          if (terms_not_found[i].split("-")[0] === project_core_id) {  // doesn't matter if it has a suffix
            excluded = true;
            break;
          }
        }
        if (excluded === true) {
          break;
        }
      }
    }

    currPage ++;
    idx_start = d.indexOf("data-article-id=");
    if(idx_start === -1){
      break;
    }
    let tmp = d;
    while(idx_start > -1){
        tmp = tmp.substring(idx_start + 17);
        let str = tmp.substring(0, 8);
        idx_start = tmp.indexOf("full-journal-citation");
        tmp = tmp.substring(idx_start + 23);
        idx_start = tmp.indexOf(". ");
        tmp = tmp.substring(idx_start + 2);
        idx_start = tmp.indexOf(";") === -1 ? 99999999 : tmp.indexOf(";");
        let idx_start_1 = tmp.indexOf(":") === -1 ? 99999999 : tmp.indexOf(":");
        let idx_start_2 = tmp.indexOf(".") === -1 ? 99999999 : tmp.indexOf(".");
        idx_start = Math.min(idx_start, idx_start_1, idx_start_2);
        let publish_date = tmp.substring(0, idx_start);
        if(Date.parse(publish_date) >= filter_date){
          pubs[str] = {};
          pubs[str].publish_date = publish_date;
        }
        else{
          isEnd = true;
        }
        idx_start = tmp.indexOf("data-article-id=");
    }
  }
  return pubs;
};

const searchPublications = async (keyword, project_award_date, project_core_id) => {
  let filter_date = Date.parse(project_award_date);
  let pubs = {};

  // pre-flight, check for single result or no results
  let GET_params = "&sort=date&size=200&page=";
  var uri = apis.pmWebsite + keyword + GET_params + "1";  // start on the first page manually here
  console.log(uri);
  console.log("Project Award Date " + project_award_date);
  let hypertext = await fetch(uri, true);  // true to keep trying until successful response

  // the search returned a single result
  if (hypertext.indexOf("id=\"article-page") > -1){
    console.log("Single result");
    pubs = await parsePublicationPage(hypertext, filter_date);
    return pubs;
  }
  
  // the search returned nothing
  let idx_page_input = hypertext.indexOf("id=\"page-number-input");
  if (idx_page_input <= -1) {
    console.log("Failed to detect 'No reported results'. There should be pagination and none was detected.");
    return pubs;
  }
  else {
    let temp_hypertext = hypertext.substring(idx_page_input + 21); // skip the 21 characters that is 'id="page-number-input'
    let idx_value = temp_hypertext.indexOf("value=\"");
    if (idx_value <= -1) {
      console.log("Failed to detect 'No Reported Results'. There should be a page value and none was detected.");
      return pubs;
    }
    else {
      temp_hypertext = temp_hypertext.substring(idx_value + 7); // skip the 7 characters that is 'value="'
      let value = temp_hypertext.substring(0,1);
      if (value != 0) {
        // more than one page, could be multiple results
      }
      else {
        console.log("No Reported Results");
        return pubs;
      }
    }
  }

  // the search returned multiple results
  console.log("Multiple results");
  pubs = await parsePublicationsPages(hypertext, uri, filter_date, project_core_id);
  console.log(Object.keys(pubs).length + " results");
  return pubs;
};

const getSearchTermComponents = (projects) => {
  let result = {};
  let projectNums = Object.keys(projects);
  for (var i = 0; i < projectNums.length; i++) {
    let core_id = getCoreId(projectNums[i]);
    let activity_code = getActivityCode(projectNums[i]);
    let leading_numeral = getLeadingNumeral(projectNums[i]);
    let suffix = getSuffix(projectNums[i]);
    let key = activity_code + core_id;
    if (!(key in result)) {
      result[key] = {"award_date": projects[projectNums[i]].award_notice_date, "leading_numerals": new Set(), "suffix_pairs": {}, "hit": false};
      result[key]["leading_numerals"].add(leading_numeral); // we want all of the leading numerals
      if (suffix != "") {
        result[key]["suffix_pairs"][suffix] = [];  // we want all of the suffixes and their associated leading numerals
        result[key]["suffix_pairs"][suffix].push(leading_numeral);
      }
    }
    else {
      // we want all of the leading numerals
      result[key]["leading_numerals"].add(leading_numeral);
      // we want all of the suffixes and their associated leading numerals
      if (suffix != "") {
        if (!(suffix in result[key]["suffix_pairs"])) {
          result[key]["suffix_pairs"][suffix] = [];
        }
        result[key]["suffix_pairs"][suffix].push(leading_numeral);
      }
      // we want the oldest award date
      if (result[key]["award_date"] > projects[projectNums[i]].award_notice_date) {
        result[key]["award_date"] = projects[projectNums[i]].award_notice_date;
      }
    }
  }
  return result;
}

const run = async (projects, publications) => {
  let search_term_components = getSearchTermComponents(projects);
  let projectNums = Object.keys(projects);
  
  console.log("Loading icite publication cache.");
  icite_cache = loadCache(icite_cache_location, icite_cache_columns);
  console.log("Number of cached publications loaded: " + Object.keys(icite_cache).length);

  for(let i = 0; i< projectNums.length; i++){
    console.time("pubmed_project_scrape");
    let pubs = {};
    
    if(projects[projectNums[i]].project_type !== "Contract") {
      let project_award_date = projects[projectNums[i]].award_notice_date;
      let project_core_id = getCoreId(projectNums[i]);
      let project_activity_code = getActivityCode(projectNums[i]);

      // 11/17/2021 adeforge, terms with a space in them need to be searched individually, otherwise we get false negatives (missed publications).
      //  In an advanced search, if a term with a space fails (its project core id is excluded), it nullifies any good results from any other terms
      //  in an irrecoverable way -- completely pollutes the results; therefore, all are rejected resulting in lost good publications
      let keywords = [];

      // determine whether or not to run Advanced Search query
      //  we want to run the Advanced Search query once and with the oldest project award date
      let search_term_key = project_activity_code + project_core_id;
      if (search_term_components[search_term_key]["award_date"] === project_award_date && search_term_components[search_term_key]["hit"] === false) {
        search_term_components[search_term_key]["hit"] = true;

        let bases = [project_activity_code + project_core_id, project_activity_code + " " + project_core_id];

        let leading_numerals = Array.from(search_term_components[search_term_key]["leading_numerals"]);
        if (!("" in leading_numerals)) {
          leading_numerals.push("");  // empty string for the case when there is no leading numeral
        }

        let suffix_pairs = search_term_components[search_term_key]["suffix_pairs"];

        let advanced_keywords = [];
        bases.forEach(base => {
          // all combinations of bases and leading numerals
          leading_numerals.forEach(num => {
              // if a term doesn't have a leading numeral, it shouldn't have a suffix
              // terms with a space must be searched individually
              if (base.indexOf(" ") > -1) {
                keywords.push(num + base);
              }
              else {
                advanced_keywords.push(num + base);
              }
          });
          // we only want to search a term with a suffix also too with a leading numeral,
          //  we also don't want to pair a suffix with a leading numeral that isn't seen
          //  in one of the raw project ids
          // key is a suffix, value is an array of associated leading numerals
          for (const [key, value] of Object.entries(suffix_pairs)) {
            value.forEach(val => {
              if (base.indexOf(" ") > -1) {
                keywords.push(val + base + key);
              }
              else {
                advanced_keywords.push(val + base + key);
              }
            });
          }
        });

        // make sure keywords are unique
        keywords = Array.from(new Set(keywords));
        advanced_keywords = Array.from(new Set(advanced_keywords));

        // prepare the Advanced Search query
        let advanced_keyword = "";
        for (var j = 0; j < advanced_keywords.length; j++) {
          if (j > 0) {
            advanced_keyword += " OR ";
          }
          advanced_keyword += "(" + advanced_keywords[j] + ")";
        }
        keywords.push(advanced_keyword);
      }
      else {
        console.log("Project ID " + projectNums[i] + " line item skipped to optimize results for group " + project_activity_code + project_core_id);
      }

      // scrape PubMed for all keywords
      for (var k = 0; k < keywords.length; k++) {
        let pubs_1 = await searchPublications(keywords[k], project_award_date, project_core_id);
        Object.keys(pubs_1).forEach((key) => {
          if(!(key in pubs)){
            pubs[key] = pubs_1[key];
          }
        });
      }

      await getIciteData(pubs);
  
      Object.keys(pubs).forEach((key) => {
        if(!(key in publications)){
          publications[key] = pubs[key];
          publications[key].projects = [];
        }
        publications[key].projects.push(project_activity_code + project_core_id);
      });
    }
    console.timeEnd("pubmed_project_scrape");
    console.log(`Collected ${Object.keys(pubs).length} Publications from PubMed for project: ${projectNums[i]} [project ${i+1} of ${projectNums.length}]\n`);
  }
};

module.exports = {
	run
};