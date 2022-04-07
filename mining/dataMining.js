const fs = require('fs');
const mineProject = require('./miningHelper/mineProject');
const minePublication = require('./miningHelper/minePublication');
const minePM = require('./miningHelper/minePM');
const mineClinicalTrials = require('./miningHelper/mineClinicalTrials');
const mineSRADetail = require('./miningHelper/mineSRADetail');
const mineGEODetail = require('./miningHelper/mineGEODetail');
const mineDBGapDetail = require('./miningHelper/mineDBGapDetail');
const mineClinicalTrialsDetail = require('./miningHelper/mineClinicalTrialsDetail');
const mineSraInteractive = require('./miningHelper/mineSRAInteractive');
const minePatents = require('./miningHelper/minePatents');
const {
  getCoreId,
  getActivityCode
} = require('../common/utils');
const util = require('util');


let projects = {};
let publications = {};
let geos = {};
let sras = {};
let dbgaps = {};
let clinicalTrials = {};
let patents = {};
let patent_grants = {};
let patent_applications = {};

const generateDataModel = async () => {
  // associate publications and projects for GEO, SRA, dbGap
  for(let pid in publications){
    //GEO
    for (let g = 0; g < publications[pid].geo_accession.length; g++) {
      let geo = publications[pid].geo_accession[g];
      if (geo && geos[geo]) {
        if (!geos[geo].publications) {
          geos[geo].publications = [];
        }
        geos[geo].publications.push(pid);
        // if (!geos[geo].projects) {
        //   geos[geo].projects = [];
        // }
        // publications[pid].projects.forEach(project => {
        //   geos[geo].projects.push(project);
        // });
        geos[geo].projects = null;  // make sure there are no associated projects
      }
    }
    //SRA
    for (let s = 0; s < publications[pid].sra_accession.length; s++) {
      let sra = publications[pid].sra_accession[s];
      if (sra && sras[sra]) {
        if (!sras[sra].publications) {
          sras[sra].publications = [];
        }
        sras[sra].publications.push(pid);
        // if (!sras[sra].projects) {
        //   sras[sra].projects = [];
        // }
        // publications[pid].projects.forEach(project => {
        //   sras[sra].projects.push(project);
        // });
        sras[sra].projects = null;  // make sure there are no associated projects
      }
    }
    //dbGap
    for (let d = 0; d < publications[pid].dbgap_accession.length; d++) {
      let dbgap = publications[pid].dbgap_accession[d];
      if (dbgap && dbgaps[dbgap]) {
        if (!dbgaps[dbgap].publications) {
          dbgaps[dbgap].publications = [];
        }
        dbgaps[dbgap].publications.push(pid);
        // if (!dbgaps[dbgap].projects) {
        //   dbgaps[dbgap].projects = [];
        // }
        // publications[pid].projects.forEach(project => {
        //   dbgaps[dbgap].projects.push(project);
        // });
        dbgaps[dbgap].projects = null;  // make sure there are no associated projects
      }
    }
  }
  // associate projects for ClinicalTrials  // 03/11/22 adeforge, we shouldn't be deriving project relationships, keep what was populated during scraping
  // let keys = Object.keys(clinicalTrials);
  // for (let i = 0; i < keys.length; i++) {
  //   if (clinicalTrials[keys[i]].publications) {
  //     clinicalTrials[keys[i]].publications.forEach(pub => {
  //       publications[pub].projects.forEach(proj => {
  //         if (!clinicalTrials[keys[i]].projects) {
  //           clinicalTrials[keys[i]].projects = [];
  //         }
  //         clinicalTrials[keys[i]].projects.push(proj);  // there may be duplicates if multiple publications come from the same project
  //       });
  //     });
  //   }
  // }
  
  // format projects fields for writing to file
  for (let projectID in projects) {
    let keys = Object.keys(projects[projectID]);
    keys.forEach(key => {
      // TODO 03/18/2022 adeforge, put this other places
      projects[projectID][key] = (projects[projectID][key] != null && projects[projectID][key] != undefined) ? projects[projectID][key] : "";  // ensure all values are at least empty string
    });
    projects[projectID].abstract_text = projects[projectID].abstract_text ? projects[projectID].abstract_text.replace(/\n/g, "\\n") : "";  // format the abstract
    // Publications key off of this queried_project_id for relationships in Neo4j upon data loading. When publications are scraped, they are scraped with respect to
    //  the activiity code and core id -- we don't have information more granular than that -- an entire set of projects that share a (activity code + core id) are
    //  all treated the same. Therefore, this 'queried_project_id' property must be formatted into just the activity code + core id.
    projects[projectID].queried_project_id = getActivityCode(projectID) + getCoreId(projectID);
    // populate the 'award_amount_category' field
    if (projects[projectID].award_amount < 250000) {
      projects[projectID].award_amount_category = "<$250k";
    } 
    else if (250000 <= projects[projectID].award_amount < 500000) {
      projects[projectID].award_amount_category = "$250k to $499k";
    }
    else if (500000 <= projects[projectID].award_amount < 750000) {
      projects[projectID].award_amount_category = "$500k to $749k";
    }
    else if (750000 <= projects[projectID].award_amount < 1000000) {
      projects[projectID].award_amount_category = "$750k to $999k";
    }
    else if (projects[projectID].award_amount >= 1000000) {
      projects[projectID].award_amount_category = ">=$1M";
    }

    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(projects[projectID].award_notice_date);
    projects[projectID].award_notice_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
    temp = new Date(projects[projectID].project_start_date);
    projects[projectID].project_start_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
    temp = new Date(projects[projectID].project_end_date);
    projects[projectID].project_end_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
  }

  // format publications fields for writing to file
  for (let pubID in publications) {
    let keys = Object.keys(publications[pubID]);
    keys.forEach(key => {
      publications[pubID][key] = (publications[pubID][key] != null && publications[pubID][key] != undefined) ? publications[pubID][key] : "";  // ensure all values are at least empty string
    });
    // populate 'queried_project_ids' field
    publications[pubID].queried_project_ids = publications.projects.join(",");
    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(publications[pubID].publish_date);
    publications[pubID].publish_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
  }

  // format GEO fields for writing to file
  for (let geoID in geos) {
    let keys = Object.keys(geos[geoID]);
    keys.forEach(key => {
      geos[geoID][key] = (geos[geoID][key] != null && geos[geoID][key] != undefined) ? geos[geoID][key] : "";  // ensure all values are at least empty string
    });
    geos[geoID].title = geos[geoID].title ? geos[geoID].title.replace(/(\r\n|\r|\n|\t)/gm, "") : "";  // format the title
    geos[geoID].publications = [...new Set(geos[geoID].publications)];  // unique publications
    geos[geoID].projects = [...new Set(geos[geoID].projects)];  // unique projects
    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(geos[geoID].submission_date);
    geos[geoID].submission_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
    temp = new Date(geos[geoID].last_update_date);
    geos[geoID].last_update_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
  }

  // format SRA fields for writing to file
  for (let sraID in sras) {
    let keys = Object.keys(sras[sraID]);
    keys.forEach(key => {
      sras[sraID][key] = (sras[sraID][key] != null && sras[sraID][key] != undefined) ? sras[sraID][key] : "";  // ensure all values are at least empty string
    });
    sras[sraID].study_title = sras[sraID].study_title ? sras[sraID].study_title.replace(/(\r\n|\r|\n|\t)/gm, "") : "";  // format the study_title
    sras[sraID].publications = [...new Set(sras[sraID].publications)];  // unique publications
    sras[sraID].projects = [...new Set(sras[sraID].projects)];  // unique projects
    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(sras[sraID].registration_date);
    sras[sraID].registration_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
  }

  // format dbGaP fields for writing to file
  for (let dbgapID in dbgaps) {
    let keys = Object.keys(dbgaps[dbgapID]);
    keys.forEach(key => {
      dbgaps[dbgapID][key] = (dbgaps[dbgapID][key] != null && dbgaps[dbgapID][key] != undefined) ? dbgaps[dbgapID][key] : "";  // ensure all values are at least empty string
    });
    dbgaps[dbgapID].title = dbgaps[dbgapID].title ? dbgaps[dbgapID].title.replace(/(\r\n|\r|\n|\t)/gm, "") : "";  // format the title
    dbgaps[dbgapID].publications = [...new Set(dbgaps[dbgapID].publications)];  // unique publications
    dbgaps[dbgapID].projects = [...new Set(dbgaps[dbgapID].projects)];  // unique projects
    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(dbgaps[dbgapID].release_date);
    dbgaps[dbgapID].release_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
  }

  // format clinicalTrial fields for writing to file
  for (let clinicalTrialID in clinicalTrials) {
    let keys = Object.keys(clinicalTrials[clinicalTrialID]);
    keys.forEach(key => {
      clinicalTrials[clinicalTrialID][key] = (clinicalTrials[clinicalTrialID][key] != null && clinicalTrials[clinicalTrialID][key] != undefined) ? clinicalTrials[clinicalTrialID][key] : "";  // ensure all values are at least empty string
    });
    if (clinicalTrials[clinicalTrialID].publications) {
      clinicalTrials[clinicalTrialID].publications = [...new Set(clinicalTrials[clinicalTrialID].publications)];  // unique publications
    }
    clinicalTrials[clinicalTrialID].projects = [...new Set(clinicalTrials[clinicalTrialID].projects)];  // unique projects
    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(clinicalTrials[clinicalTrialID].last_update_posted);
    clinicalTrials[clinicalTrialID].last_update_posted = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
  }

  // format patent fields for writing to file
  for (let patentID in patents) {
    let keys = Object.keys(patents[patentID]);
    keys.forEach(key => {
      patents[patentID][key] = (patents[patentID][key] != null && patents[patentID][key] != undefined) ? patents[patentID][key] : "";  // ensure all values are at least empty string
    });
    // date formatting DD-AbrevMonth-YYYY, 25-Jan-2017
    const date_format = '%s-%s-%s';
    const formatter = new Intl.DateTimeFormat('us', { month: 'short' });
    let temp = new Date(patents[patentID].fulfilled_date);
    patents[patentID].fulfilled_date = util.format(date_format,temp.getDate(),formatter.format(temp).toString(),temp.getFullYear());
    // define patent_grants vs patent_applications
    const temp_arr = patentID.split("-");
    if (temp_arr[temp_arr.length - 1].indexOf("A1") > -1) {
      patent_applications[patentID] = patents[patentID];
    }
    else if (temp_arr[temp_arr.length - 1].indexOf("B2") > -1) {
      patent_grants[patentID] = patents[patentID];
    }
    else {
      console.log("Error classifying patent ID" + patentID);
    }
  }
};

// the column names and the data structure field names need to be the same
const writeToDataFile = (filepath, columns, dataStructure, type, hasProjects, hasPublications) => {
  let data = "";
  data += columns.join("\t") + "\n";
  for (let key in dataStructure) {
    let temp = [type, key];  // the first column is 'type' and is hard coded and the same for the entire file
                             //  the second column is the key for the data structure
    columns.forEach(col => {  // iterate through the column properties in order
      if (dataStructure[key][col] != undefined) {  // some columns don't represent data structure properties
        temp.push(dataStructure[key][col]);
      }
    });
    // For the passed columns, publication.publication_id, projects.queried_project_id and program.program_id should be listed last (whichever applies).
    // If an entity has both relationships to projects and publications, then the listed columns, at the end of the list of columns, should include
    //   'publication.publication_id' and then 'project.queried_project_id', in that order.
    if (hasProjects || hasPublications) {  // these checks mostly have to do with writing with the proper spacing depending upon whether there are both publication and project columns or either
      if (hasProjects && hasPublications) {
        if (dataStructure[key].projects) {
          dataStructure[key].projects.map((p) => {
            data += temp.join("\t") + "\t" + "" + "\t" + p + "\n";  // empty string is a placeholder for publication_id
          });
        }
        if (dataStructure[key].publications) {
          dataStructure[key].publications.map((p) => {
            data += temp.join("\t") + "\t" + p + "\t" + "" + "\n";  // empty string is a placeholder for queried_project_id
          });
        }
      }
      else {
        if (hasProjects) {
          dataStructure[key].projects.map((p) => {
            data += temp.join("\t") + "\t" + p + "\n";  // just projects, 'project.queried_project_id' should be the last column passed
          });
        }
        if (hasPublications) {
          dataStructure[key].publications.map((p) => {
            data += temp.join("\t") + "\t" + p + "\n";  // just publications, 'publication.publication_id' should be the last column passed
          });
        }
      }
    }
    else if (dataStructure[key].program) {  // if it doesn't have projects or publications, it is a project, which has a program
      data += temp.join("\t") + "\t" + dataStructure[key].program + "\n";
    }
    else {
      data += temp.join("\t") + "\n";
    }
  }
  fs.writeFileSync(filepath, data);
};

// the column names and the data structure field names need to be the same
// explicitly writes publication relationships
const writeToDataDigestFile = (filepath, columns, dataStructure, type) => {
  let data = "";
  data += columns.join("\t") + "\n";
  for (let key in dataStructure) {
    let temp = [type, key];  // the first column is 'type' and is hard coded and the same for the entire file
                             //  the second column is the key for the data structure
    columns.forEach(col => {  // iterate through the column properties in order
      if (dataStructure[key][col] != undefined) {  // some columns don't represent data structure properties
        temp.push(dataStructure[key][col]);
      }
    });
    // for the passed columns, if there are projects or publications or programs, they should be listed last. program before project before publication
    // if a data structure does not inherently have a program or publications or projects, but that information should be listed, the generateDataModel function is where those
    //   relationships should be populated. the note about projects and publications in the columns passed still applies
    if (dataStructure[key].publications || dataStructure[key].projects) {
      if (dataStructure[key].publications) {  // if there are associated publications, preserving upstream project and program
        dataStructure[key].publications.map((p) => {
          publications[p].projects.map((pp) => {
            data += temp.join("\t") + "\t" + pp + "\t" + p + "\n";
          });
        });
      }
      if (dataStructure[key].projects) {  // if there are associated projects, preserving upstream program
        dataStructure[key].projects.map((p) => {
          data += temp.join("\t") + "\t" + p + "\n";
        });
      }
    }
    else if (dataStructure[key].program) {  // it is assumed a dataStructure entity has only one program associated with it, if any explicitly
      data += temp.join("\t") + "\t" + dataStructure[key].program + "\n";
    }
    else {
      data += temp.join("\t") + "\n";
    }
  }
  fs.writeFileSync(filepath, data);
};

const run = async (projectsTodo) => {
  console.time('mineProject');
  projects = await mineProject.run(projectsTodo);
  console.timeEnd('mineProject');

  console.time('minePublication');
  await minePublication.run(projects, publications);
  console.timeEnd('minePublication');
  console.log("Number of publications: " + Object.keys(publications).length);

  // caching happens here for dbGaPs, SRAs and GEOs
  console.time('mineGeoSraDbgap');
  await minePM.run(publications);
  console.timeEnd('mineGeoSraDbgap');

  console.time('mineSRADetail');
  await mineSRADetail.run(publications, sras);
  console.log("Number of SRAs before coverage feature: " + Object.keys(sras).length);
  console.timeEnd('mineSRADetail');

  // sort of performs the function of both minePM and mineSRADetail, but for filling out edge cases
  console.time('mineSraInteractive');
  await mineSraInteractive.run(publications, sras);
  console.log("Number of SRAs: " + Object.keys(sras).length);
  console.timeEnd('mineSraInteractive');

  console.time('mineGEODetail');
  await mineGEODetail.run(publications, geos);
  console.log("Number of GEOs: " + Object.keys(geos).length);
  console.timeEnd('mineGEODetail');
  
  console.time('mineDBGapDetail');
  await mineDBGapDetail.run(publications, dbgaps);
  console.log("Number of DBGaps: " + Object.keys(dbgaps).length);
  console.timeEnd('mineDBGapDetail');

  console.time('mineClinicalTrials');
  await mineClinicalTrials.run(projects, publications, clinicalTrials);
  console.log("Number of clinical trials: " + Object.keys(clinicalTrials).length);
  console.timeEnd('mineClinicalTrials');

  console.time('mineClinicalTrialsDetail');
  await mineClinicalTrialsDetail.run(clinicalTrials);
  console.timeEnd('mineClinicalTrialsDetail');

  console.time('minePatents');
  await minePatents.run(projects, patents);
  console.log("Number of Patents: " + Object.keys(patents).length);
  console.timeEnd('minePatents');

  await generateDataModel();

  console.log('Writing Files...');
  // project file
  // writeToProjectFile();
  let columns = ["type", "project_id", "queried_project_id","application_id", "fiscal_year", "project_title", "project_type", "abstract_text", "keywords",
   "org_name", "org_city", "org_state", "org_country", "principal_investigators", "lead_doc", "program_officers", "award_amount", "award_amount_category",
    "nci_funded_amount", "award_notice_date", "project_start_date", "project_end_date", "full_foa", "program", "program.program_id"];
  let filepath = 'digest_data/project.tsv';
  writeToDataDigestFile(filepath, columns, projects, "project");
  filepath = 'data/project.tsv';
  writeToDataFile(filepath, columns, projects, "project");

  // publications file
  // writeToPublicationFile();
  columns = ["type","publication_id", "year", "journal", "title", "authors",
   "publish_date", "citation_count", "relative_citation_ratio", "rcr_range", "nih_percentile", "doi", "queried_project_ids", "project.queried_project_id"];
  filepath = 'digest_data/publication.tsv';
  writeToDataDigestFile(filepath, columns, publications, "publication");
  columns = ["type","publication_id", "year", "journal", "title", "authors",
  "publish_date", "citation_count", "relative_citation_ratio", "rcr_range", "nih_percentile", "doi", "queried_project_ids", "project.queried_project_id"];
  filepath = 'data/publication.tsv';
  writeToDataFile(filepath, columns, publications, "publication", hasProjects=true, hasPublications=false);

  // GEO file
  // writeToGEOFile();
  columns = ["type","accession","title", "status", "submission_date","last_update_date", "project.queried_project_id", "publication.publication_id"];
  filepath = 'digest_data/geo.tsv';
  writeToDataDigestFile(filepath, columns, geos, "geo");
  columns = ["type","accession","title", "status", "submission_date","last_update_date", "publication.publication_id"];
  filepath = 'data/geo.tsv';
  writeToDataFile(filepath, columns, geos, "geo", hasProjects=false, hasPublications=true);

  // SRA file
  // writeToSRAFile();
  columns = ["type","accession","study_title", "bioproject_accession", "registration_date", "project.queried_project_id", "publication.publication_id"];
  filepath = 'digest_data/sra.tsv';
  writeToDataDigestFile(filepath, columns, sras, "sra");
  columns = ["type","accession","study_title", "bioproject_accession", "registration_date", "publication.publication_id"];
  filepath = 'data/sra.tsv';
  writeToDataFile(filepath, columns, sras, "sra", hasProjects=false, hasPublications=true);

  // dbGaP file
  // writeToDBGapFile();
  columns = ["type", "accession", "title", "release_date", "project.queried_project_id", "publication.publication_id"];
  filepath = 'digest_data/dbgap.tsv';
  writeToDataDigestFile(filepath, columns, dbgaps, "dbgap");
  columns = ["type", "accession", "title", "release_date", "publication.publication_id"];
  filepath = 'data/dbgap.tsv';
  writeToDataFile(filepath, columns, dbgaps, "dbgap", hasProjects=false, hasPublications=true);

  // clinical trials file
  // writeToClinicalTrialsFile();
  columns = ["type", "clinical_trial_id", "title", "last_update_posted", "recruitment_status", "project.queried_project_id", "publication.publication_id"];
  filepath = 'digest_data/clinical_trial.tsv';
  writeToDataDigestFile(filepath, columns, clinicalTrials, "clinical_trial");
  columns = ["type", "clinical_trial_id", "title", "last_update_posted", "recruitment_status", "publication.publication_id", "project.queried_project_id"];
  filepath = 'data/clinical_trial.tsv';
  writeToDataFile(filepath, columns, clinicalTrials, "clinical_trial", hasProjects=true, hasPublications=true);

  // patent application files
  columns = ["type", "patent_id", "fulfilled_date", "project.queried_project_id"];
  filepath = 'digest_data/patent_application.tsv';
  writeToDataDigestFile(filepath, columns, patent_applications, "patent_application");
  columns = ["type", "patent_id", "fulfilled_date", "project.queried_project_id"];
  filepath = 'data/patent_application.tsv';
  writeToDataFile(filepath, columns, patent_applications, "patent_application", hasProjects=true, hasPublications=false);

  // granted patent files
  columns = ["type", "patent_id", "fulfilled_date", "project.queried_project_id"];
  filepath = 'digest_data/patent_grant.tsv';
  writeToDataDigestFile(filepath, columns, patent_grants, "granted_patent");  // granted_patent is the node type name
  columns = ["type", "patent_id", "fulfilled_date", "project.queried_project_id"];
  filepath = 'data/patent_grant.tsv';
  writeToDataFile(filepath, columns, patent_grants, "granted_patent", hasProjects=true, hasPublications=false);  // granted_patent is the node type name
};

module.exports = {
	run
};
