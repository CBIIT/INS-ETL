import os
from datetime import datetime

import pandas as pd


DATA_DIR = os.path.abspath("data")
EXTENSIONS = ["tsv", "txt"]
GROUPING = "queried_project_id"
COLUMN = "award_notice_date"

# get project filenames
project_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("project")]

# load and consolidate data in all project files
df_projects = {}  # key value pairs where the key is the filename and the value is a dataframe
for file in project_files:
    df_projects[file] = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)

for key in df_projects.keys():
    df_projects[key][COLUMN] = df_projects[key][COLUMN].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # convert award_notice_date to datetime
    # identify the representative grant
    representatives = df_projects[key].groupby([GROUPING], as_index=False, group_keys=False).apply(lambda x: x.apply(lambda y: y[COLUMN] == max(x[COLUMN]), axis=1))
    representatives.name = 'representative'
    representatives = pd.DataFrame(representatives)
    # combine representative properties (boolean) back into the parent dataframe by preserved index
    df_projects[key] = df_projects[key].join(representatives)
    # revert award_notice_date to string
    df_projects[key][COLUMN] = df_projects[key][COLUMN].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))

# write new project files
for key in df_projects.keys():
    print(key)
    df_projects[key].to_csv(f"{DATA_DIR}/{key}", sep="\t", index=False)
