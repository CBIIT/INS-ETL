const {
  fetch,
  getCoreId,
  fetchWithStatusCheck,
  getActivityCode,
} = require('../../common/utils');
const apis = require('../../common/apis');
const {
  loadCache,
  writeToCache
} = require('../miningHelper/miningCacher');


const searchPatents = async (search_terms, patents, project) => {
    search_terms.forEach(term => {
        let d = await fetch(apis.usptoPatentsSite + term, true);  // true is keep trying
        let temp = d;
        let idx = temp.indexOf("#:~:text=" + term + "\">");  // 11 characters plus length of 'term'
        while (idx > -1) {
            temp = temp.substring(idx + 11 + term.length);
            idx = temp.indexOf("</a></td>");  // 9 characters
            if (idx > -1) {
                let p = temp.substring(idx);
                if (!patents[p]) {
                    patents[p] = {};
                }
                if (!patents[p].projects) {
                    patents[p].projects = [];
                }
                patents[p].projects.push(project);
                temp = temp.substring(idx + 9);
            }
            idx = temp.indexOf("#:~:text=" + term);
        }
    });
};

const run = async (projects, patents) => {
  const projectNums = Object.keys(projects);
  for (let i = 0; i < projectNums.length; i++) {
      let project_core_id = getCoreId(projectNums[i]);
      let project_activity_code = getActivityCode(projectNums[i]);

      let search_terms = [project_activity_code + project_core_id, project_core_id];

      await searchPatents(search_terms, patents, projectNums[i]);
  } 
};

module.exports = {
	run
};
