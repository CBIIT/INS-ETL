import os.path
from datetime import datetime

import re
import pandas as pd
import numpy as np


DATA_DIR = os.path.abspath("data")
EXTENSIONS = ["tsv", "txt"]

TARGET_COL = "award_amount_category"
MAP = {"<$1M": [0,1000000], "$1M to $2M": [1000000,2000000], "$2M to $4M": [2000000,4000000], "$4M to $10M": [4000000,10000000], ">$10M": [10000000,np.inf]}

# get project file filenames
project_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("project")]

# load data in all project files
df_project = []
for file in project_files:
    df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t")
    df_project.append(df_temp)

# translate the sum of award amounts over a core project into new ranges
for df_proj in df_project:
    # gorup grant award amounts by core project
    df_temp = df_proj[["project_id", "queried_project_id", "award_amount"]].groupby("queried_project_id", group_keys=False).apply(lambda x: pd.DataFrame({"project_id": x["project_id"], "queried_project_id": x["queried_project_id"], "award_amount": np.sum(x["award_amount"])}))
    # replace award_amount_category with new category derived from aggregate grants
    df_proj[TARGET_COL] = df_temp.apply(lambda x: [key for key in MAP.keys() if MAP[key][0] <= x["award_amount"] < MAP[key][1]][0], axis=1)

for file, df_proj in zip(project_files,df_project):
    print(file)
    df_proj.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)
