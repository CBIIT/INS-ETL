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

let file_path = path.join(__dirname, 'config', 'moonshot_ccdi_projects_all.xlsx');

readXlsxFile(file_path, { sheet: 1 }).then(async (rows) => {
    let projects = {};
    
    rows.forEach((item, idx) => {
        //if(idx > 0 && idx < 2){
        //if(idx > 1 && idx < 5){
        //if(idx > 4 && idx < 10){
        //if(idx > 9 && idx < 15){
        //if(idx > 14 && idx < 16){
        //if(idx > 15 && idx < 17){
        //if(idx > 16 && idx < 20){
        //if(idx > 19 && idx < 25){
        //if(idx > 24 && idx < 26){
        //if(idx > 25 && idx < 30){
        //if(idx > 29 && idx < 35){
        //if(idx > 34 && idx < 37){
        //if(idx > 36 && idx < 38){
        //if(idx > 37 && idx < 40){
        //if(idx > 39 && idx < 50){
        //if(idx > 49 && idx < 60){
        //if(idx > 59 && idx < 66){
        //if(idx > 65 && idx < 67){
        //if(idx > 59 && idx < 70){
        //if(idx > 69 && idx < 80){
        //if(idx > 79 && idx < 90){
        //if(idx > 89 && idx < 110){
        //if(idx > 119 && idx < 130){
        //if(idx > 109 && idx < 150){
        //if(idx > 149 && idx < 180){
        //if(idx > 179){
        //if(idx > 184 && idx < 186){
        if(idx > 0){
          projects[item[0]] = {};
          projects[item[0]].project_type = item[1];
          projects[item[0]].program = item[3];
          projects[item[0]].lead_doc = item[4];
        }
    });
    
    await dataMining.run(projects);
    
    console.log(`End of processing, finished data gathering for ${Object.keys(projects).length} projects`);
});



