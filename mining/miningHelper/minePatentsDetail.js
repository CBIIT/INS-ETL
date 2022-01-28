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


const searchPatentDetail = async (patent, patentID) => {
    let d = await fetch(apis.usptoPatentsSite + patentID, true)  // true is keep trying
    let temp = d;
    let idx = temp.indexOf("US " + patentID + " ");  // 4 characters plus length of 'patentID' (the most reliable way to get this is at the bottom of the page, by inspection)
    if (idx > -1) {
        // get kind code
        temp = temp.substring(idx + 4 + patentID.length);
        idx = temp.indexOf("</div><hr>");
        if (idx > -1) {
            let kind_code = temp.substring(0, idx);
            patent.kind_code = kind_code;
        }

        // get filed date
        temp = d;
        idx = temp.indexOf("<tr><td>Filed Date</td><td>");  // 27 characters
        if (idx > -1) {
            temp = temp.substring(idx + 27);
            idx = temp.indexOf("</td></tr></table>");
            let filed_date = temp.substring(0, idx);
            patent.filed_date = filed_date;
        }
    }
};

const run = async (patents) => {
    const patentNums = Object.keys(patents);
    for (let i = 0; i < patentNums.length; i++) {
        await searchPatentDetail(patents[patentNums[i]], patentNums[i]);
    }
};

module.exports = {
	run
};
  