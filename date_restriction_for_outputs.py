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
df_project_lookup = df_project.groupby("queried_project_id", group_keys=False).apply(lambda x: pd.DataFrame({"queried_project_id": x["queried_project_id"], "award_notice_date": x["award_notice_date"]}).explode("award_notice_date"))
print(len(df_project))
print(df_project_lookup.head(15))

df_publication_lookup = df_publication.groupby("publication_id", group_keys=False).apply(lambda x: pd.DataFrame({"publication_id": x["publication_id"], "queried_project_id": x["queried_project_id"]}).explode("queried_project_id"))
print(df_publication_lookup.head(15))


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
DOT_PROJECT_ID = "project.project_id"

def project_lookup_by_publication(df):
    result = df.apply(lambda x: df_publication_lookup[df_publication_lookup[PUBLICATION_ID] == str(x[DOT_PUBLICATION_ID])][QUERIED_PROJECT_ID].tolist() if DOT_PUBLICATION_ID in x and str(x[DOT_PUBLICATION_ID])!="" else np.nan, axis=1)
    result = result.explode()
    result = result.dropna().reset_index(drop=True)
    return result

def get_queried_project_ids(df):
    result = df.apply(lambda x: x[DOT_QUERIED_PROJECT_ID] if DOT_QUERIED_PROJECT_ID in x and x[DOT_QUERIED_PROJECT_ID]!="" else np.nan, axis=1)
    result = result.explode()
    result = result.dropna().reset_index(drop=True)
    return result

def get_project_id(df):
    result = df.apply(lambda x: x[DOT_PROJECT_ID] if DOT_PROJECT_ID in x and x[DOT_PROJECT_ID]!="" else np.nan, axis=1)
    result = result.explode()
    result = result.dropna().reset_index(drop=True)
    result = pd.Series([x[1:12] for x in result])  # get the core project id from the grant id
    return result

def award_amount_lookup_by_project(df, queried_project_ids):
    result = df.apply(lambda x: df_project_lookup[df_project_lookup[QUERIED_PROJECT_ID].isin(queried_project_ids.tolist())][AWARD_NOTICE_DATE].tolist(), axis=1)
    result = result.explode()
    result = result.dropna().reset_index(drop=True)
    return min(result)

def trim_outputs(df, target_date_field, award_amount):
    result = df[df[target_date_field] >= award_amount]
    return result

def filter_outputs(df, target_date_field):
    result = None

    queried_project_ids = project_lookup_by_publication(df)
    queried_project_ids = pd.concat([queried_project_ids, get_queried_project_ids(df), get_project_id(df)], ignore_index=True, axis=0)
        
    award_amount = award_amount_lookup_by_project(df, queried_project_ids)
    result = trim_outputs(df, target_date_field, award_amount)
    return result

# filter clinical trials by 'queried_project_id' and then 'publication_id'
for file, df_ct in zip(clinical_trial_files,df_clinical_trials):
    print(df_ct.describe())
    # convert String date to datetime object
    df_ct[LAST_UPDATE_POSTED] = df_ct[LAST_UPDATE_POSTED].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    df_ct = filter_outputs(df_ct, LAST_UPDATE_POSTED)
    # convert datetime back to string
    df_ct[LAST_UPDATE_POSTED] = df_ct[LAST_UPDATE_POSTED].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_ct.describe())
    print(file)
    df_ct.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)

# filter sras by 'publication_id'
for file, df_sra in zip(sra_files,df_sras):
    print(df_sra.describe())
    # convert String date to datetime object
    df_sra[REGISTRATION_DATE] = df_sra[REGISTRATION_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    # convert datetime back to string
    df_sra = filter_outputs(df_sra, REGISTRATION_DATE)
    df_sra[REGISTRATION_DATE] = df_sra[REGISTRATION_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_sra.describe())
    print(file)
    df_sra.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)

# filter geos by 'publication_id'
for file, df_geo in zip(geo_files,df_geos):
    print(df_geo.describe())
    # convert String date to datetime object
    df_geo[LAST_UPDATE_DATE] = df_geo[LAST_UPDATE_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    df_geo = filter_outputs(df_geo, LAST_UPDATE_DATE)
    # convert datetime back to string
    df_geo[LAST_UPDATE_DATE] = df_geo[LAST_UPDATE_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_geo.describe())
    print(file)
    df_geo.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)

# filter dbgaps by 'publication_id' OR 'queried_project_id'
for file, df_dbgap in zip(dbgap_files,df_dbgaps):
    print(df_dbgap.describe())
    # convert String date to datetime object
    df_dbgap[RELEASE_DATE] = df_dbgap[RELEASE_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    df_dbgap = filter_outputs(df_dbgap, RELEASE_DATE)
    # convert datetime back to string
    df_dbgap[RELEASE_DATE] = df_dbgap[RELEASE_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_dbgap.describe())
    print(file)
    df_dbgap.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)

# filter patents by 'queried_project_id'
for file, df_patent in zip(patent_files,df_patents):
    print(df_patent.describe())
    # convert String date to datetime object
    df_patent[FULFILLED_DATE] = df_patent[FULFILLED_DATE].apply(lambda x: datetime.strptime(x, '%d-%b-%Y'))  # format as datetime from string time
    df_patent = filter_outputs(df_patent, FULFILLED_DATE)
    # convert datetime back to string
    df_patent[FULFILLED_DATE] = df_patent[FULFILLED_DATE].apply(lambda x: datetime.strftime(x, '%d-%b-%Y'))
    print(df_patent.describe())
    print(file)
    df_patent.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)
