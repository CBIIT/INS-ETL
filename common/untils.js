const axios = require('axios');

const fetch = async (url) => {
  try {
      const response = await axios.get(url)
      //console.log(response.data);
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

module.exports = {
	fetch,
  post,
  getCoreId,
};