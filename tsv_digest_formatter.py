import os.path
from datetime import datetime

import re
import pandas as pd
import numpy as np


DATA_DIR = os.path.abspath("data")
DIGEST_DIR = os.path.abspath("digest_data")
EXTENSION = "tsv"

# get publication file filenames
publication_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] == EXTENSION and f.startswith("publication")]
# get clinical trial filenames
clinical_trial_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] == EXTENSION and f.startswith("clinical_trial")]
# get sra filenames
sra_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] == EXTENSION and f.startswith("sra")]
# get geo filesnames
geo_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] == EXTENSION and f.startswith("geo")]
# get dbgap filenames
dbgap_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] == EXTENSION and f.startswith("dbgap")]

# load and consolidate data in all publication files
df_publication = None
for file in publication_files:
    if df_publication is None:
        df_publication = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_publication = pd.concat([df_publication, df_temp]).drop_duplicates().reset_index(drop=True)

# load and consolidate data in all clinical trial files
df_clinical_trials = None
for file in clinical_trial_files:
    if df_clinical_trials is None:
        df_clinical_trials = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_clinical_trials = pd.concat([df_clinical_trials, df_temp]).drop_duplicates().reset_index(drop=True)

# load and consolidate data in all sra files
df_sra = None
for file in sra_files:
    if df_sra is None:
        df_sra = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_sra = pd.concat([df_sra, df_temp]).drop_duplicates().reset_index(drop=True)

# load and consolidate data in all geo files
df_geo = None
for file in geo_files:
    if df_geo is None:
        df_geo = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_geo = pd.concat([df_geo, df_temp]).drop_duplicates().reset_index(drop=True)

# load and consolidate datta in all dbgap files
df_dbgap = None
for file in dbgap_files:
    if df_dbgap is None:
        df_dbgap = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_dbgap = pd.concat([df_dbgap, df_temp]).drop_duplicates().reset_index(drop=True)


###################################
# now we want to perform joins for each of clinical trials, sras, geos and dbgaps
#   with the publication data to get associated 'queried_project_ids'
###################################

# clinical trials rename column 'publication.publication_id' to 'publication_id'
df_clinical_trials = df_clinical_trials.rename(columns={"publication.publication_id": "publication_id"})
# clinical trials, we don't want a duplicate 'project.queried_project_id' column
#   just for clinical trials
df_clinical_trials = df_clinical_trials.drop(columns=['project.queried_project_id'], axis=1)
# clinical trials ignore rows with no 'publication_id', after droping 'project.queried_project_id' column
#   just for clinical trials
df_clinical_trials = df_clinical_trials[~pd.isna(df_clinical_trials["publication_id"])]
# clinical trials join with publications in new column 'queried_project_id'
df_clinical_trials["queried_project_id"] = df_clinical_trials.apply(lambda x: df_publication[df_publication["publication_id"] == x["publication_id"]]["project.queried_project_id"].tolist(), axis=1)
df_clinical_trials = df_clinical_trials.explode("queried_project_id").reset_index(drop=True)
# print the new clinical trials file
df_clinical_trials.to_csv(f"{DIGEST_DIR}/digest_clinical_trial.tsv", sep="\t", index=False)

# sra rename column 'publication.publication_id' to 'publication_id'
df_sra = df_sra.rename(columns={"publication.publication_id": "publication_id"})
# sra join with publications in new column 'queried_project_id'
df_sra["queried_project_id"] = df_sra.apply(lambda x: df_publication[df_publication["publication_id"] == x["publication_id"]]["project.queried_project_id"].tolist(), axis=1)
df_sra = df_sra.explode("queried_project_id").reset_index(drop=True)
# print the new sra file
df_sra.to_csv(f"{DIGEST_DIR}/digest_sra.tsv", sep="\t", index=False)

# geo rename column 'publication.publication_id' to 'publication_id'
df_geo = df_geo.rename(columns={"publication.publication_id": "publication_id"})
# geo join with publications in new column 'queried_project_id'
df_geo["queried_project_id"] = df_geo.apply(lambda x: df_publication[df_publication["publication_id"] == x["publication_id"]]["project.queried_project_id"].tolist(), axis=1)
df_geo = df_geo.explode("queried_project_id").reset_index(drop=True)
# print the new geo file
df_geo.to_csv(f"{DIGEST_DIR}/digest_geo.tsv", sep="\t", index=False)

# dbgap rename column 'publication.publication_id' to 'publication_id'
df_dbgap = df_dbgap.rename(columns={"publication.publication_id": "publication_id"})
# dbgap, we don't want a duplicate 'project.queried_project_id' column
df_dbgap = df_dbgap.drop(columns=['project.queried_project_id'], axis=1)
# dbgap ignore rows with no 'publication_id', after droping 'project.queried_project_id' column
df_dbgap = df_dbgap[~pd.isna(df_dbgap["publication_id"])]
# dbgap join with publications in new column 'queried_project_id'
df_dbgap["queried_project_id"] = df_dbgap.apply(lambda x: df_publication[df_publication["publication_id"] == x["publication_id"]]["project.queried_project_id"].tolist(), axis=1)
df_dbgap = df_dbgap.explode("queried_project_id").reset_index(drop=True)
# print the new dbgap file
df_dbgap.to_csv(f"{DIGEST_DIR}/digest_dbgap.tsv", sep="\t", index=False)
