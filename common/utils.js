const axios = require('axios').default;
const https = require('https');
const path = require('path');
const fs = require("fs");


const dataFilesDir = path.join(__dirname, "data_files");

const fetch = async (url, keep_trying=false) => {
  // 01/31/2022 adeforge, this is to ignore any SSL cert errors, required for uspto.report site for patents
  const agent = new https.Agent({  
    rejectUnauthorized: false
  });
  let counter = 0;
  const MAX_RETRIES = 200;
  while (true) {
    try {
      const response = await axios.get(url, {timeout: 10000, clarifyTimeoutError: false, httpsAgent: agent});  // 01/31/2022 adeforge, timeout bumped to 10 seconds because uspto.report site is inherently slow
      return response.data;
    } catch (error) {
      console.log("GET failed");
      console.log(url);
      console.log(error);
      if (keep_trying === false || counter >= MAX_RETRIES) {
        return "failed";
      }
      counter++;
      console.log("Retry Attempt: " + counter);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

// returns null if failed due to error code or returns the response data otherwise
const fetchWithStatusCheck = async (url, error_code) => {
  // 01/31/2022 adeforge, this is to ignore any SSL cert errors, required for uspto.report site for patents
  const agent = new https.Agent({  
    rejectUnauthorized: false
  });
  let counter = 0;
  const MAX_RETRIES = 200;
  while (true) {
    try {
      const response = await axios.get(url, {timeout: 10000, clarifyTimeoutError: false, httpsAgent: agent});  // 01/31/2022 adeforge, timeout bumped to 10 seconds because uspto.report site is inherently slow
      return response.data;
    } catch (error) {
      console.log("GET failed");
      console.log(url);
      if ((error.response && error.response.status === error_code) || counter >= MAX_RETRIES) {
        return null;
      }
      counter++;
      console.log("Retry Attempt: " + counter);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

const post = async (url, body, keep_trying=false) => {
  let counter = 0;
  const MAX_RETRIES = 200;
  while (true) {
    try {
      const response = await axios.post(url, body);
      return response.data;
    } catch (error) {
      console.log("POST failed");
      console.log(url);
      console.log(error);
      if (keep_trying === false || counter >=MAX_RETRIES) {
        return "failed";
      }
      counter++;
      console.log("Retry Attempt: " + counter);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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

const getLeadingNumeral = (projectId) => {
  let result = projectId.substring(0,1);
  return result;
}

const getSuffix = (projectId) => {
  let result = "";
  let idx = projectId.indexOf("-");
  if (idx > -1) {
    result = projectId.substring(idx);
  }
  return result;
}

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
  getLeadingNumeral,
  getSuffix,
  readCachedPublications,
  readCachedGEOs,
  readCachedSRAs,
  readCachedDBGaps,
  readCachedClinicalTrials,
  fetchWithStatusCheck,
};