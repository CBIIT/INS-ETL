const fs = require('fs');
const mineProject = require('./miningHelper/mineProject');
const minePublication = require('./miningHelper/minePublication');
const minePM = require('./miningHelper/minePM');
const mineClinicalTrials = require('./miningHelper/mineClinicalTrials');
const mineSRADetail = require('./miningHelper/mineSRADetail');
const mineGEODetail = require('./miningHelper/mineGEODetail');
const mineDBGapDetail = require('./miningHelper/mineDBGapDetail');
const mineClinicalTrialsDetail = require('./miningHelper/mineClinicalTrialsDetail');


let projects = {};
let publications = {};
let geos = {};
let sras = {};
let dbgaps = {};
let clinicalTrials = {};
// capture data during runtime to be written to a file
let metrics = {};

const generateDataModel = async () => {
  // associate publications for GEO, SRA, dbGap
  for(let pid in publications){
    //GEO
    for (let g = 0; g < publications[pid].geo_accession.length; g++) {
      let geo = publications[pid].geo_accession[g];
      if (geo && geos[geo]) {
        if (!geos[geo].publications) {
          geos[geo].publications = [];
        }
        geos[geo].publications.push(pid);
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
      }
    }
  }

  // format projects fields for writing to file
  for (let projectID in projects) {
    let keys = Object.keys(projects[projectID]);
    keys.forEach(key => {
      projects[projectID][key] = projects[projectID][key] ? projects[projectID][key] : "";  // ensure all values are at least empty string
    });
    projects[projectID].abstract_text = projects[projectID].abstract_text ? projects[projectID].abstract_text.replace(/\n/g, "\\n") : "";  // format the abstract
  }

  // format publications fields for writing to file
  for (let pubID in publications) {
    let keys = Object.keys(publications[pubID]);
    keys.forEach(key => {
      publications[pubID][key] = publications[pubID][key] ? publications[pubID][key] : "";  // ensure all values are at least empty string
    });
  }

  // format GEO fields for writing to file
  for (let geoID in geos) {
    let keys = Object.keys(geos[geoID]);
    keys.forEach(key => {
      geos[geoID][key] = geos[geoID][key] ? geos[geoID][key] : "";  // ensure all values are at least empty string
    });
    geos[geoID].title = geos[geoID].title ? geos[geoID].title.replace(/(\r\n|\r|\n|\t)/gm, "") : "";  // format the title
  }

  // format SRA fields for writing to file
  for (let sraID in sras) {
    let keys = Object.keys(sras[sraID]);
    keys.forEach(key => {
      sras[sraID][key] = sras[sraID][key] ? sras[sraID][key] : "";  // ensure all values are at least empty string
    });
    sras[sraID].study_title = sras[sraID].study_title ? sras[sraID].study_title.replace(/(\r\n|\r|\n|\t)/gm, "") : "";  // format the study_title
  }

  // format dbGaP fields for writing to file
  for (let dbgapID in dbgaps) {
    let keys = Object.keys(dbgaps[dbgapID]);
    keys.forEach(key => {
      dbgaps[dbgapID][key] = dbgaps[dbgapID][key] ? dbgaps[dbgapID][key] : "";  // ensure all values are at least empty string
    });
    dbgaps[dbgapID].title = dbgaps[dbgapID].title ? dbgaps[dbgapID].title.replace(/(\r\n|\r|\n|\t)/gm, "") : "";  // format the title
  }
};

// the column names and the data structure field names need to be the same
const writeToFile = (filepath, columns, dataStructure, type) => {
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
    // for the passed columns, if there are projects or publications, they should be listed last. project before publication or just project at the end if no publications
    // if a data structure does not inherently have publications or projects, but that information should be listed, the generateDataModel function is where those
    //   relationships should be populated. the note about projects and publications in the columns passed still applies
    if (dataStructure[key].publications || dataStructure[key].projects) {
      if (dataStructure[key].publications) {  // if there are associated publications, preserve the upstream project id before the publication id
        dataStructure[key].publications.map((p) => {
          publications[p].projects.map((pp) => {
            data += temp.join("\t") + "\t" + pp + "\t" + p + "\n";
          });
        });
      }
      if (dataStructure[key].projects) {  // if there are associated projects
        dataStructure[key].projects.map((p) => {
          data += temp.join("\t") + "\t" + p + "\n";
        });
      }
    }
    else {
      data += temp.join("\t") + "\n";
    }
  }
  fs.writeFileSync(filepath, data);
};


// const writeToProjectFile = () => {
//   let data = "";
//   let columns = ["type","project_id","application_id", "fiscal_year", "project_title","project_type", "abstract_text", "keywords",
//    "org_name", "org_city", "org_state", "org_country", "principal_investigators", "lead_doc", "program_officers", "award_amount",
//     "nci_funded_amount", "award_notice_date", "project_start_date", "project_end_date", "full_foa", "program.program_id"];
//   data = columns.join("\t") + "\n";
//   for(let projectID in projects){
//     let tmp = [];
//     tmp.push("project");
//     tmp.push(projects[projectID].project_id);
//     tmp.push(projects[projectID].application_id);
//     tmp.push(projects[projectID].fiscal_year);
//     tmp.push(projects[projectID].project_title);
//     tmp.push(projects[projectID].project_type);
//     tmp.push(projects[projectID].abstract_text == null ? "" : projects[projectID].abstract_text.replace(/\n/g, "\\n"));
//     tmp.push(projects[projectID].keywords);
//     tmp.push(projects[projectID].org_name);
//     tmp.push(projects[projectID].org_city);
//     tmp.push(projects[projectID].org_state);
//     tmp.push(projects[projectID].org_country);
//     tmp.push(projects[projectID].principal_investigators);
//     tmp.push(projects[projectID].lead_doc);
//     tmp.push(projects[projectID].program_officers);
//     tmp.push(projects[projectID].award_amount);
//     tmp.push(projects[projectID].nci_funded_amount);
//     tmp.push(projects[projectID].award_notice_date);
//     tmp.push(projects[projectID].project_start_date);
//     tmp.push(projects[projectID].project_end_date);
//     tmp.push(projects[projectID].full_foa);
//     tmp.push(projects[projectID].program);
//     data += tmp.join("\t") + "\n";
//   }
//   fs.writeFileSync('data/project.tsv', data);
// };

// const writeToPublicationFile = () => {
//   let data = "";
//   let columns = ["type","publication_id","pmc_id", "year", "journal","title", "authors",
//    "publish_date", "citation_count", "relative_citation_ratio", "rcr_range", "nih_percentile", "doi", "project.project_id"];
//   data = columns.join("\t") + "\n";
//   for(let pubID in publications){
//     let tmp = [];
//     tmp.push("publication");
//     tmp.push(pubID);
//     tmp.push(publications[pubID].pmc_id);
//     tmp.push(publications[pubID].year);
//     tmp.push(publications[pubID].journal);
//     tmp.push(publications[pubID].title);
//     tmp.push(publications[pubID].authors);
//     tmp.push(publications[pubID].publish_date);
//     tmp.push(publications[pubID].citation_count);
//     tmp.push(publications[pubID].relative_citation_ratio);
//     tmp.push(publications[pubID].rcr_range);
//     tmp.push(publications[pubID].nih_percentile);
//     tmp.push(publications[pubID].doi);
//     publications[pubID].projects.map((p) => {
//       data += tmp.join("\t") + "\t" + p + "\n";
//     });
//   }
//   fs.writeFileSync('data/publication.tsv', data);
// };

// const writeToGEOFile = () => {
//   let data = "";

//   let columns = ["type","accession","title", "status", "submission_date","last_update_date", "project.project_id", "publication.publication_id"];
//   data = columns.join("\t") + "\n";
//   for(let geoID in geos){
//     let tmp = [];
//     tmp.push("geo");
//     tmp.push(geoID);
//     tmp.push(geos[geoID].title);
//     tmp.push(geos[geoID].status);
//     tmp.push(geos[geoID].submission_date);
//     tmp.push(geos[geoID].last_update_date);
//     if (geos[geoID].publications) {
//       geos[geoID].publications.map((p) => {
//         publications[p].projects.map((pp) => {
//           data += tmp.join("\t") + "\t" + pp + "\t" + p + "\n";  // preserve the publication's project
//         });
//       });
//     }
//   }
//   fs.writeFileSync('data/geo.tsv', data);
// };

// const writeToSRAFile = () => {
//   let data = "";
//   let columns = ["type","accession","study_title", "bioproject_accession", "registration_date","project.project_id", "publication.publication_id"];
//   data = columns.join("\t") + "\n";
//   for(let sraID in sras){
//     let tmp = [];
//     tmp.push("sra");
//     tmp.push(sraID);
//     tmp.push(sras[sraID].study_title);
//     tmp.push(sras[sraID].bioproject_accession);
//     tmp.push(sras[sraID].registration_date);
//     if (sras[sraID].publications) {
//       sras[sraID].publications.map((p) => {
//         publications[p].projects.map((pp) => {
//           data += tmp.join("\t") + "\t" + pp + "\t" + p + "\n";  // preserve the publication's project
//         });
//       });
//     }
//   }
//   fs.writeFileSync('data/sra.tsv', data);
// };

// const writeToDBGapFile = () => {
//   let data = "";
//   let columns = ["type", "accession", "title", "release_date", "project.project_id", "publication.publication_id"];
//   data = columns.join("\t") + "\n";
//   for(let dbgapID in dbgaps){
//     let tmp = [];
//     tmp.push("dbgap");
//     tmp.push(dbgapID);
//     tmp.push(dbgaps[dbgapID].title);
//     tmp.push(dbgaps[dbgapID].release_date);
//     if (dbgaps[dbgapID].publications) {
//       dbgaps[dbgapID].publications.map((p) => {
//         publications[p].projects.map((pp) => {
//           data += tmp.join("\t") + "\t" + pp + "\t" + p + "\n";  // preserve the publication's project
//         });
//       });
//     }
//   }
//   fs.writeFileSync('data/dbgap.tsv', data);
// };

// const writeToClinicalTrialsFile = () => {
//   let data = "";
//   let columns = ["type", "clinical_trial_id", "title", "last_update_posted", "recruitment_status", "project.project_id", "publication.publication_id"];
//   data = columns.join("\t") + "\n";
//   for(let clinicaltrialID in clinicalTrials){
//     let tmp = [];
//     tmp.push("clinical_trial");
//     tmp.push(clinicaltrialID);
//     tmp.push(clinicalTrials[clinicaltrialID].title);
//     tmp.push(clinicalTrials[clinicaltrialID].last_update_posted);
//     tmp.push(clinicalTrials[clinicaltrialID].recruitment_status);
//     if (clinicalTrials[clinicaltrialID].projects) {
//       clinicalTrials[clinicaltrialID].projects.map((p) => {
//         data += tmp.join("\t") + "\t" + p + "\t" + "" + "\n";  // if a clinical trial came from a project id
//       });
//     }
//     if (clinicalTrials[clinicaltrialID].publications)
//     clinicalTrials[clinicaltrialID].publications.map((p) => {
//       publications[p].projects.map((pp) => {
//         data += tmp.join("\t") + "\t" + pp + "\t" + p + "\n";  // if a clinical trial came from a publication id, and preserve the publication's project
//       });
//     });
//   }
//   fs.writeFileSync('data/clinical_trial.tsv', data);
// };

// const writeToMetricsFile = () => {
//   let data = "";
//   let columns = ["publication.publication_id", "totalGeoResults", "totalSrxResults", "totalSrpRunResults", "multipleSrpResults"];
//   data += columns.join("\t") + "\n";
//   let metricIds = Object.keys(metrics);
//   for (var i = 0; i < metricIds.length; i++) {
//     let tmp = [];
//     tmp.push(metricIds[i]);
//     tmp.push(metrics[metricIds[i]]["totalGeoResults"]?metrics[metricIds[i]]["totalGeoResults"]:"0");
//     tmp.push(metrics[metricIds[i]]["totalSrxResults"]?metrics[metricIds[i]]["totalSrxResults"]:"0");
//     tmp.push(metrics[metricIds[i]]["totalSrpRunResults"]?metrics[metricIds[i]]["totalSrpRunResults"]:"0")
//     tmp.push(metrics[metricIds[i]]["multipleSrpResults"]?metrics[metricIds[i]]["multipleSrpResults"]:"N/A");
//     data += tmp.join("\t") + "\n";
//   }
//   fs.writeFileSync('config/metrics.tsv', data);
// };

const run = async (projectsTodo) => {
  console.time('mineProject');
  projects = await mineProject.run(projectsTodo);
  console.timeEnd('mineProject');

  console.time('minePublication');
  await minePublication.run(projects, publications);
  console.timeEnd('minePublication');
  console.log("Number of publications: " + Object.keys(publications).length);
  
  console.time('mineGeoSraDbgap');
  await minePM.run(publications, metrics);
  console.timeEnd('mineGeoSraDbgap');

  console.time('mineClinicalTrials');
  await mineClinicalTrials.run(projects, publications, clinicalTrials);
  console.log("Number of clinical trials: " + Object.keys(clinicalTrials).length);
  console.timeEnd('mineClinicalTrials');

  console.time('mineSRADetail');
  await mineSRADetail.run(publications, sras, metrics);
  console.log("Number of SRAs: " + Object.keys(sras).length);
  console.timeEnd('mineSRADetail');

  console.time('mineGEODetail');
  await mineGEODetail.run(publications, geos);
  console.log("Number of GEOs: " + Object.keys(geos).length);
  console.timeEnd('mineGEODetail');
  
  console.time('mineDBGapDetail');
  await mineDBGapDetail.run(publications, dbgaps);
  console.log("Number of DBGaps: " + Object.keys(dbgaps).length);
  console.timeEnd('mineDBGapDetail');

  console.time('mineClinicalTrialsDetail');
  await mineClinicalTrialsDetail.run(clinicalTrials);
  console.timeEnd('mineClinicalTrialsDetail');

  await generateDataModel();

  console.log('Writing Files...');
  // project file
  // writeToProjectFile();
  let columns = ["type", "given_project_id", "project_id","application_id", "fiscal_year", "project_title", "abstract_text", "keywords",
  "org_name", "org_city", "org_state", "org_country", "principal_investigators", "program_officers", "award_amount",
   "nci_funded_amount", "award_notice_date", "project_start_date", "project_end_date", "full_foa"];
  let filepath = 'data/project.tsv';
  writeToFile(filepath, columns, projects, "project");

  // publications file
  // writeToPublicationFile();
  columns = ["type","publication_id", "year", "journal", "title", "authors",
   "publish_date", "citation_count", "relative_citation_ratio", "rcr_range", "nih_percentile", "doi", "project.project_id"];
  filepath = 'data/publication.tsv';
  writeToFile(filepath, columns, publications, "publication");

  // GEO file
  // writeToGEOFile();
  columns = ["type","accession","title", "status", "submission_date","last_update_date", "project.project_id", "publication.publication_id"];
  filepath = 'data/geo.tsv';
  writeToFile(filepath, columns, geos, "geo");

  // SRA file
  // writeToSRAFile();
  columns = ["type","accession","study_title", "bioproject_accession", "registration_date","project.project_id", "publication.publication_id"];
  filepath = 'data/sra.tsv';
  writeToFile(filepath, columns, sras, "sra");

  // dbGaP file
  // writeToDBGapFile();
  columns = ["type", "accession", "title", "release_date", "project.project_id", "publication.publication_id"];
  filepath = 'data/dbgap.tsv';
  writeToFile(filepath, columns, dbgaps, "dbgap");

  // clinical trials file
  // writeToClinicalTrialsFile();
  columns = ["type", "clinical_trial_id", "title", "last_update_posted", "recruitment_status", "project.project_id", "publication.publication_id"];
  filepath = 'data/clinical_trial.tsv';
  writeToFile(filepath, columns, clinicalTrials, "clinical_trial");

  // writeToMetricsFile();
};

module.exports = {
	run
};
