import os.path

import pandas as pd
import numpy as np


DATA_DIR = os.path.abspath("data")
DIGEST_DIR = os.path.abspath("digest_data")
EXTENSIONS = ["tsv", "txt"]

# get project filenames
project_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("project")]
# get publication file filenames
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

# load and consolidate data in all publication files
df_project = None
for file in project_files:
    if df_project is None:
        df_project = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_project = pd.concat([df_project, df_temp]).drop_duplicates().reset_index(drop=True)

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

# load and consolidate data in all patent files
df_patent = None
for file in patent_files:
    if df_patent is None:
        df_patent = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    else:
        df_temp = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
        df_patent = pd.concat([df_patent, df_temp]).drop_duplicates().reset_index(drop=True)


df_project["publication_count"] = df_project.apply(lambda x: len(df_publication[df_publication["project.queried_project_id"] == x["queried_project_id"]]), axis=1)

df_project["geo_count"] = df_project.apply(lambda x: len(df_geo[df_geo["publication.publication_id"].isin(df_publication[df_publication["project.queried_project_id"] == x["queried_project_id"]]["publication_id"].tolist())]["accession"].unique()), axis=1)

df_project["sra_count"] = df_project.apply(lambda x: len(df_sra[df_sra["publication.publication_id"].isin(df_publication[df_publication["project.queried_project_id"] == x["queried_project_id"]]["publication_id"].tolist())]["accession"].unique()), axis=1)

df_project["dbgap_count"] = df_project.apply(lambda x: set(df_dbgap[df_dbgap["project.project_id"] == x["project_id"]]["accession"].unique().tolist()) if pd.notna(x["project_id"]) else set(), axis=1)
df_project["dbgap_count"] = df_project.apply(lambda x: len(x["dbgap_count"].union(set(df_dbgap[df_dbgap["publication.publication_id"].isin(df_publication[df_publication["project.queried_project_id"] == x["queried_project_id"]]["publication_id"].tolist())]["accession"].unique()))) if pd.notna(x["queried_project_id"]) else len(x["dbgap_count"]), axis=1)

df_project["clinical_trial_count"] = df_project.apply(lambda x: set(df_clinical_trials[df_clinical_trials["project.queried_project_id"] == x["queried_project_id"]]["clinical_trial_id"].unique().tolist()), axis=1)
df_project["clinical_trial_count"] = df_project.apply(lambda x: len(x["clinical_trial_count"].union(set(df_clinical_trials[df_clinical_trials["publication.publication_id"].isin(df_publication[df_publication["project.queried_project_id"] == x["queried_project_id"]]["publication_id"].tolist())]["clinical_trial_id"].unique()))), axis=1)

df_project["patent_count"] = df_project.apply(lambda x: len(df_patent[df_patent["project.queried_project_id"] == x["queried_project_id"]]), axis=1)

df_project["dataset_count"] = df_project[["geo_count","sra_count","dbgap_count"]].apply(sum, axis=1)

df_project["total_outputs_count"] = df_project[["publication_count","dataset_count","clinical_trial_count","patent_count"]].apply(sum, axis=1)

df_grant_count_lookup = df_project.groupby("queried_project_id", group_keys=False, as_index=False).apply(len)
df_project["grant_count"] = df_project.apply(lambda x: df_grant_count_lookup[df_grant_count_lookup["queried_project_id"] == x["queried_project_id"]].iloc[0,1], axis=1)

# stats bar
df_stats_bar = pd.DataFrame(
    data={
    "num_programs": [len(df_project["program.program_id"].unique())],
    "num_grants": [len(df_project)],
    "num_projects": [len(df_project["queried_project_id"].unique())],
    "num_publications": [len(df_publication["publication_id"].unique())],
    "num_datasets": [len(df_geo["accession"].unique()) + len(df_sra["accession"].unique()) + len(df_dbgap["accession"].unique())],
    "num_clinical_trials": [len(df_clinical_trials["clinical_trial_id"].unique())],
    "num_patents": [len(df_patent["patent_id"].unique())]
    }
)
df_stats_bar.to_csv(f"{DIGEST_DIR}/qa_validation_file_stats_bar.tsv", sep="\t", index=False)

# rename and collect relevant columns for projects
df_project = df_project[["project_id","queried_project_id","total_outputs_count","publication_count","dataset_count","clinical_trial_count","patent_count","grant_count","geo_count","sra_count","dbgap_count"]]
df_project = df_project.rename(columns={"project_id": "grant_id", "queried_project_id": "project_id"})
df_project.to_csv(f"{DIGEST_DIR}/qa_validation_file.tsv", sep="\t", index=False)
