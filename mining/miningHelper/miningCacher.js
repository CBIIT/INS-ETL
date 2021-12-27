import { readFileSync, writeFileSync, appendFileSync } from 'fs';


const loadCache = (cacheFilepath, columns) => {
    let corrupt_lines = false;
    var data = null;
    let result = {};
    try {
      data = readFileSync(cacheFilepath).toString();
      data = data.split('\n');  // get each line
      for (var i = 1; i < data.length; i++) {  // parse each line, skipping the header
        if (data[i] === "") {  // check for empty lines
          continue;
        }
        let line = data[i].split("\t");
        if (line.length !== columns.length) {  // check line integrity
          console.log("Cache line corrupted, marking cache file " + cacheFilepath + " for correction.");
          corrupt_lines = true;
          continue;  // move on to next line
        }
        for (var j = 1; j < line.length; j++) {  // parse columns, index starts at 1 to skip the primary id, which is the dictionary key
          if (!result[line[0]]) {
            result[line[0]] = {};  // for each row, there is a dictionary where the keys of that dictionary are the column names and the associated values are what is in the cache
          }
          result[line[0]][columns[j]] = line[j]; // load the cache
        }
      }
      if (corrupt_lines === true) {  // overwrite corrupted cache file with known-good read cache, if any corrupted lines
        console.log("Rewriting cache file due to corrupted line(s).");
        let new_data = columns.join("\t") + "\n";
        const keys = Object.keys(result);
        for (var i = 0; i < keys.length; i++) {
          let temp = [];
          temp.push(keys[i]);
          columns.forEach(col => {
            temp.push(result[keys[i]][col]);
          });
          new_data += temp.join("\t") + "\n";
        }
        writeFileSync(cacheFilepath, new_data)
      }
    }
    catch (error) {  // check if the file exists
      // console.log(error);
      console.log("File doesn't exist, writing");
      const header = columns.join("\t") + "\n";
      writeFileSync(cacheFilepath, header);
    }

    return result;
}

const writeToCache = (cacheFilepath, args) => {
    let data = "";
    let tmp = [];
    args.forEach(element => {
        tmp.push(element);
    });
    data += tmp.join("\t") + "\n";
    appendFileSync(cacheFilepath, data);
}

export default {
	loadCache,
    writeToCache
};