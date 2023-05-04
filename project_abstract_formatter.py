import os.path

from cmath import isnan
from fileinput import filename
import pandas as pd
from datetime import datetime
import numpy as np

# PROJECT_FILEPATHS = ["data/project_CCDI", "data/project_Sandbox"]
EXTENSIONS = ["tsv", "txt"]
COLUMN = "abstract_text"

DATA_DIR = os.path.abspath("data")

project_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS and f.startswith("project")]

for filepath in project_files:
    df = pd.read_csv(DATA_DIR+"/"+filepath, sep="\t")
    df[COLUMN] = df[COLUMN].apply(lambda x: x.replace("\\n", " ") if not pd.isna(x) else x)
    df.to_csv(f"{DATA_DIR}/{filepath}", sep="\t", index=False)
    print(filepath)
