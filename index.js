#!/usr/bin/env node

const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const path = require('path');
const dataMining = require('./mining/dataMining');
//const dataMining = require('./mining/dataMining_v2');
//const excel = require('node-excel-export');

const [,, ...args] = process.argv;
console.log(`Received paramaters: ${args}`);

console.log("Start processing...");

let file_path = path.join(__dirname, 'config', 'CCDI project list_ no P30s.xlsx');

readXlsxFile(file_path, { sheet: 1 }).then(async (rows) => {
  console.time('full_run');
  let projects = {};
    
    rows.forEach((item, idx) => {
        if (idx >= 1) {  // skip the header
          projects[item[0]] = {};
          projects[item[0]].project_type = item[1];
          projects[item[0]].program = item[3];
          projects[item[0]].lead_doc = item[4];
        }
    });

    await dataMining.run(projects);  // change me to dataMiningPublicationsOnly to only scrape publications, usually for exploratory reasons with new project ids
    console.timeEnd('full_run');

    console.log(`End of processing, finished data gathering for ${Object.keys(projects).length} projects`);
});



