import os.path
from datetime import datetime

import re
import pandas as pd
import numpy as np


DATA_DIR = os.path.abspath("data")
DIGEST_DIR = os.path.abspath("digest_data")
EXTENSIONS = ["tsv", "txt"]

# get project filenames
project_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("project")]
# get publication filenames
publication_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("publication")]
# get clinical trial filenames
clinical_trial_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("clinical_trial")]
# get sra filenames
sra_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("sra")]
# get geo filesnames
geo_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("geo")]
# get dbgap filenames
dbgap_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("dbgap")]

# load and consolidate data in all project files
#  we need all of these in one dataframe, we're not rewriting this data to files, so it's ok
df_project = None
for file in project_files:
    if df_project is None:
        df_project = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_project = pd.concat([df_project, df_temp]).drop_duplicates().reset_index(drop=True)

# load and consolidate data in all publication files
#  we need all of these in one dataframe, we're not rewriting this data to files, so it's ok
df_publication = None
for file in publication_files:
    if df_publication is None:
        df_publication = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_publication = pd.concat([df_publication, df_temp]).drop_duplicates().reset_index(drop=True)

# load clinical trial files
df_clinical_trials = []
for file in clinical_trial_files:
    df_clinical_trials.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))

# load sra files
df_sra = []
for file in sra_files:
    df_sra.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))

# load geo files
df_geo = []
for file in geo_files:
    df_geo.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))

# load dbgap files
df_dbgap = []
for file in dbgap_files:
    df_dbgap.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))


###############################################
# What we want to do is trim outputs by the oldest upstream grant's award_notice_date, for all associated core projects
# we will care about the oldest award_notice_date as it relates to the queried_project_id (core project) with the oldest award_notice_date
# we will care about outputs as they relate to publication_id
# publication_id and queried_project_id are a defined relationship in the data
# we will care to compare the award_notice_date through the publication link to all outputs and their relevant dates
###############################################


