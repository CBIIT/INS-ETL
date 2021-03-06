const {
  fetch,
  post,
  getCoreId,
  readCachedPublications,
  readCachedGEOs,
  readCachedSRAs,
  readCachedDBGaps,
  readCachedClinicalTrials
} = require('../common/utils');
const fs = require('fs');
const mineProject = require('./miningHelper/mineProject');
const minePublication = require('./miningHelper/minePublication');
const minePM = require('./miningHelper/minePM');
const mineResearchOutputsFromPMC = require('./miningHelper/mineResearchOutputsFromPMC');
const mineClinicalTrials = require('./miningHelper/mineClinicalTrials');
const mineSRADetail = require('./miningHelper/mineSRADetail');
const mineGEODetail = require('./miningHelper/mineGEODetail');
const mineDBGapDetail = require('./miningHelper/mineDBGapDetail');
const mineClinicalTrialsDetail = require('./miningHelper/mineClinicalTrialsDetail');

//projects {pubs: [], clinicalTrials: []}
let projects = {};
// publications {geos: [], sras: [], dbgaps: [], clinicalTrials: []}
let publications = {};
//details for research outputs
let geos = {};
let sras = {};
let dbgaps = {};
let clinicalTrials = {};

const generateDataModel = async () => {
  //clinicaltrial
  for(let key in projects){
    let cts = projects[key].clinicalTrials;
    if(cts){
      cts.forEach((ct) => {
        if(!clinicalTrials[ct].projects) {
          clinicalTrials[ct].projects = [];
        }
        clinicalTrials[ct].projects.push(key);
      });
    }
  }

  //GEO, SRA, dbGap, 
  for(let pid in publications){
    //GEO
    let gs = publications[pid].geos;
    if(gs){
      gs.forEach((g) => {
        geos[g].projects = publications[pid].projects;
      });
    }
    //SRA
    let ss = publications[pid].sras;
    if(ss){
      ss.forEach((s) => {
        sras[s].projects = publications[pid].projects;
      });
    }
    //dbGap
    let ds = publications[pid].dbgaps;
    if(ds){
      ds.forEach((d) => {
        dbgaps[d].projects = publications[pid].projects;
      });
    }
  }
};

const writeToProjectFile = () => {
  let data = "";
  let columns = ["type","project_id","application_id", "fiscal_year", "project_title","project_type", "abstract_text", "keywords",
   "org_name", "org_city", "org_state", "org_country", "principal_investigators", "lead_doc", "program_officers", "award_amount",
    "nci_funded_amount", "award_notice_date", "project_start_date", "project_end_date", "full_foa", "program.program_id"];
  data = columns.join("\t") + "\n";
  for(let projectID in projects){
    let tmp = [];
    tmp.push("project");
    tmp.push(projects[projectID].project_id);
    tmp.push(projects[projectID].application_id);
    tmp.push(projects[projectID].fiscal_year);
    tmp.push(projects[projectID].project_title);
    tmp.push(projects[projectID].project_type);
    tmp.push(projects[projectID].abstract_text == null ? "" : projects[projectID].abstract_text.replace(/\n/g, "\\n"));
    tmp.push(projects[projectID].keywords);
    tmp.push(projects[projectID].org_name);
    tmp.push(projects[projectID].org_city);
    tmp.push(projects[projectID].org_state);
    tmp.push(projects[projectID].org_country);
    tmp.push(projects[projectID].principal_investigators);
    tmp.push(projects[projectID].lead_doc);
    tmp.push(projects[projectID].program_officers);
    tmp.push(projects[projectID].award_amount);
    tmp.push(projects[projectID].nci_funded_amount);
    tmp.push(projects[projectID].award_notice_date);
    tmp.push(projects[projectID].project_start_date);
    tmp.push(projects[projectID].project_end_date);
    tmp.push(projects[projectID].full_foa);
    tmp.push(projects[projectID].program);
    data += tmp.join("\t") + "\n";
  }
  fs.writeFileSync('data/project.tsv', data);
};

const writeToPublicationFile = () => {
  let data = "";
  let columns = ["type","publication_id","pmc_id", "year", "journal","title", "authors",
   "publish_date", "citation_count", "relative_citation_ratio", "rcr_range", "nih_percentile", "doi", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let pubID in publications){
    let tmp = [];
    tmp.push("publication");
    tmp.push(pubID);
    tmp.push(publications[pubID].pmc_id);
    tmp.push(publications[pubID].year);
    tmp.push(publications[pubID].journal);
    tmp.push(publications[pubID].title);
    tmp.push(publications[pubID].authors);
    tmp.push(publications[pubID].publish_date);
    tmp.push(publications[pubID].citation_count);
    tmp.push(publications[pubID].relative_citation_ratio);
    tmp.push(publications[pubID].rcr_range);
    tmp.push(publications[pubID].nih_percentile);
    tmp.push(publications[pubID].doi);
    publications[pubID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/publication.tsv', data);
};

const writeToGEOFile = () => {
  let data = "";

  let columns = ["type","accession","title", "status", "submission_date","last_update_date", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let geoID in geos){
    let tmp = [];
    tmp.push("geo");
    tmp.push(geoID);
    tmp.push(geos[geoID].title);
    tmp.push(geos[geoID].status);
    tmp.push(geos[geoID].submission_date);
    tmp.push(geos[geoID].last_update_date);
    geos[geoID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/geo.tsv', data);
};

const writeToSRAFile = () => {
  let data = "";
  let columns = ["type","accession","study_title", "bioproject_accession", "registration_date","project.project_id"];
  data = columns.join("\t") + "\n";
  for(let sraID in sras){
    let tmp = [];
    tmp.push("sra");
    tmp.push(sraID);
    tmp.push(sras[sraID].study_title);
    tmp.push(sras[sraID].bio_accession);
    tmp.push(sras[sraID].reg_date);
    sras[sraID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/sra.tsv', data);
};

const writeToDBGapFile = () => {
  let data = "";
  let columns = ["type", "accession", "title", "release_date", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let dbgapID in dbgaps){
    let tmp = [];
    tmp.push("dbgap");
    tmp.push(dbgapID);
    tmp.push(dbgaps[dbgapID].title);
    tmp.push(dbgaps[dbgapID].release_date);
    dbgaps[dbgapID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/dbgap.tsv', data);
};

const writeToClinicalTrialsFile = () => {
  let data = "";
  let columns = ["type", "clinical_trial_id", "title", "last_update_posted", "recruitment_status", "project.project_id"];
  data = columns.join("\t") + "\n";
  for(let clinicaltrialID in clinicalTrials){
    let tmp = [];
    tmp.push("clinical_trial");
    tmp.push(clinicaltrialID);
    tmp.push(clinicalTrials[clinicaltrialID].title);
    tmp.push(clinicalTrials[clinicaltrialID].last_update_posted);
    tmp.push(clinicalTrials[clinicaltrialID].recruitment_status);
    clinicalTrials[clinicaltrialID].projects.map((p) => {
      data += tmp.join("\t") + "\t" + p + "\n";
    });
  }
  fs.writeFileSync('data/clinical_trial.tsv', data);
};

const run = async (projectsTodo) => {
  projects = await mineProject.run(projectsTodo);
  await minePublication.run(projects, publications);
  await minePM.run(publications);
  await mineResearchOutputsFromPMC.run(publications);
  await mineClinicalTrials.run(projects);

  await mineSRADetail.run(publications, sras);
  await mineGEODetail.run(publications, geos);
  
  await mineDBGapDetail.run(publications, dbgaps);
  await mineClinicalTrialsDetail.run(projects, publications, clinicalTrials);
  await generateDataModel();

  writeToProjectFile();
  writeToPublicationFile();
  writeToGEOFile();
  writeToSRAFile();
  writeToDBGapFile();
  writeToClinicalTrialsFile();
};

module.exports = {
	run
};