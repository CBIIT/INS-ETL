const axios = require('axios');
const path = require('path');
const fs = require("fs");


const dataFilesDir = path.join(__dirname, "data_files");

const fetch = async (url) => {
  try {
      const response = await axios.get(url, {timeout: 60000, clarifyTimeoutError: false})
      return response.data;
  } catch (error) {
      return "failed";
  }
};

const post = async (url, body) => {
  try {
      const response = await axios.post(url, body)
      //console.log(response.data);
      return response.data;
  } catch (error) {
      return "failed";
  }
};

const getCoreId = (projectId) => {
  let result = projectId.substring(4);
  let idx = result.indexOf("-");
  if(idx > 0){
      result = result.substring(0, idx);
  }
  return result;
};

const getActivityCode = (projectId) => {
  let result = projectId.substring(1, 4);
  return result;
};

const readCachedPublications = () => {
  let content = fs.readFileSync(dataFilesDir + "/ins_publications.js").toString();
  return JSON.parse(content);
};

const readCachedGEOs = () => {
  let content = fs.readFileSync(dataFilesDir + "/ins_geos.js").toString();
  return JSON.parse(content);
};

const readCachedSRAs = () => {
  let content = fs.readFileSync(dataFilesDir + "/ins_sras.js").toString();
  return JSON.parse(content);
};

const readCachedDBGaps = () => {
  let content = fs.readFileSync(dataFilesDir + "/ins_dbgaps.js").toString();
  return JSON.parse(content);
};

const readCachedClinicalTrials = () => {
  let content = fs.readFileSync(dataFilesDir + "/ins_clinicalTrials.js").toString();
  return JSON.parse(content);
};

module.exports = {
	fetch,
  post,
  getCoreId,
  getActivityCode,
  readCachedPublications,
  readCachedGEOs,
  readCachedSRAs,
  readCachedDBGaps,
  readCachedClinicalTrials,
};