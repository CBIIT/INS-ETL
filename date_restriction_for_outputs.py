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
# get patent filenames
patent_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("patent")]


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
df_sras = []
for file in sra_files:
    df_sras.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))

# load geo files
df_geos = []
for file in geo_files:
    df_geos.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))

# load dbgap files
df_dbgaps = []
for file in dbgap_files:
    df_dbgaps.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))

# load patent files
df_patents = []
for file in patent_files:
    df_patents.append(pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object))


###############################################
# What we want to do is trim outputs by the oldest upstream grant's award_notice_date, for all associated core projects
# we will care about the oldest award_notice_date as it relates to the queried_project_id (core project) with the oldest award_notice_date
# we will care about outputs as they relate to publication_id
# publication_id and queried_project_id are a defined relationship in the data
# we will care to compare the award_notice_date through the publication link to all outputs and their relevant dates
###############################################

# populate main dataframe relating publication_id to award_notice_date of interest (and also keep queried_project_ids)
#   clinical trials by core project will be handled later
df_lookup = None

# prepare the publication dataframe for merger
df_publication = df_publication.rename(columns={"project.queried_project_id": "queried_project_id"})
df_publication = df_publication[["publication_id","queried_project_id"]]

# prepare the project dataframe for merger
df_project["award_notice_date"] = df_project["award_notice_date"].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
df_project = df_project.groupby("queried_project_id", group_keys=False).apply(lambda x: pd.DataFrame({"queried_project_id": x["queried_project_id"], "award_notice_date": min(x["award_notice_date"])}))

# publications should be unique and be associated with the oldest award_notice_date (and associated queried_project_id) from its upstream grants
df_lookup = df_publication.merge(df_project, on="queried_project_id").drop_duplicates().reset_index(drop=True)
df_lookup = df_lookup.groupby("publication_id", as_index=False, group_keys=False).apply(lambda x: pd.DataFrame([{"award_notice_date": min(x["award_notice_date"]), "publication_id": x.iloc[0]["publication_id"], "queried_project_id": x.sort_values("award_notice_date").reset_index(drop=True).iloc[0]["queried_project_id"]}])).reset_index(drop=True)
print(df_lookup.describe())


AWARD_NOTICE_DATE = "award_notice_date"
LAST_UPDATE_POSTED = "last_update_posted"
QUERIED_PROJECT_ID = "queried_project_id"
DOT_QUERIED_PROJECT_ID = "project.queried_project_id"
PUBLICATION_ID = "publication_id"
DOT_PUBLICATION_ID = "publication.publication_id"
REGISTRATION_DATE = "registration_date"
LAST_UPDATE_DATE = "last_update_date"
RELEASE_DATE = "release_date"
FULFILLED_DATE = "fulfilled_date"

# filter clinical trials by 'queried_project_id' and then 'publication_id'
for df_ct in df_clinical_trials:
    print(df_ct.describe())
    # convert String date to datetime object
    df_ct[LAST_UPDATE_POSTED] = df_ct[LAST_UPDATE_POSTED].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    # create a mask based upon 'queried_project_id'
    proj_mask = df_ct.apply(lambda x: 1 if x[LAST_UPDATE_POSTED] >= np.min(df_lookup[df_lookup[QUERIED_PROJECT_ID]==x[DOT_QUERIED_PROJECT_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    # create a mask based upon 'publication_id'
    pub_mask = df_ct.apply(lambda x: 1 if x[LAST_UPDATE_POSTED] >= np.min(df_lookup[df_lookup[PUBLICATION_ID]==x[DOT_PUBLICATION_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    # combine masks and drop clinical trials based upon the mask
    mask = proj_mask | pub_mask
    df_ct = df_ct.drop(mask)
    # convert datetime back to string
    df_ct[LAST_UPDATE_POSTED] = df_ct[LAST_UPDATE_POSTED].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_ct.describe())

# filter sras by 'publication_id'
for df_sra in df_sras:
    print(df_sra.describe())
    # convert String date to datetime object
    df_sra[REGISTRATION_DATE] = df_sra[REGISTRATION_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    # create a mask based upon 'publication_id'
    mask = df_sra.apply(lambda x: 1 if x[REGISTRATION_DATE] >= np.min(df_lookup[df_lookup[PUBLICATION_ID]==x[DOT_PUBLICATION_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    df_sra = df_sra.drop(mask)
    # convert datetime back to string
    df_sra[REGISTRATION_DATE] = df_sra[REGISTRATION_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_sra.describe())

# filter geos by 'publication_id'
for df_geo in df_geos:
    print(df_geo.describe())
    # convert String date to datetime object
    df_geo[LAST_UPDATE_DATE] = df_geo[LAST_UPDATE_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    # create a mask based upon 'publication_id'
    mask = df_geo.apply(lambda x: 1 if x[LAST_UPDATE_DATE] >= np.min(df_lookup[df_lookup[PUBLICATION_ID]==x[DOT_PUBLICATION_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    df_geo = df_geo.drop(mask)
    # convert datetime back to string
    df_geo[LAST_UPDATE_DATE] = df_geo[LAST_UPDATE_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_geo.describe())

# filter dbgaps by 'publication_id' OR 'queried_project_id'
for df_dbgap in df_dbgaps:
    print(df_dbgap.describe())
    # convert String date to datetime object
    df_dbgap[RELEASE_DATE] = df_dbgap[RELEASE_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    # create a mask based upon 'publication_id'
    if DOT_PUBLICATION_ID in df_dbgap.columns:
        mask = df_dbgap.apply(lambda x: 1 if x[RELEASE_DATE] >= np.min(df_lookup[df_lookup[PUBLICATION_ID]==x[DOT_PUBLICATION_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    elif DOT_QUERIED_PROJECT_ID in df_dbgap.columns:
        mask = df_dbgap.apply(lambda x: 1 if x[RELEASE_DATE] >= np.min(df_lookup[df_lookup[QUERIED_PROJECT_ID]==x[DOT_QUERIED_PROJECT_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    df_dbgap = df_dbgap.drop(mask)
    # convert datetime back to string
    df_dbgap[RELEASE_DATE] = df_dbgap[RELEASE_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_dbgap.describe())

# filter patents by 'queried_project_id'
for df_patent in df_patents:
    print(df_patent.describe())
    # convert String date to datetime object
    df_patent[FULFILLED_DATE] = df_patent[FULFILLED_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    # create a mask based upon 'publication_id'
    mask = df_patent.apply(lambda x: 1 if x[FULFILLED_DATE] >= np.min(df_lookup[df_lookup[QUERIED_PROJECT_ID]==x[DOT_QUERIED_PROJECT_ID]][AWARD_NOTICE_DATE]) else 0, axis=1)
    df_patent = df_patent.drop(mask)
    # convert datetime back to string
    df_patent[FULFILLED_DATE] = df_patent[FULFILLED_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_patent.describe())
