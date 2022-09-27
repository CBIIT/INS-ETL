from cmath import isnan
from fileinput import filename
import pandas as pd
from datetime import datetime
import numpy as np

PROJECT_FILEPATHS = ["data/project_CCDI", "data/project_Sandbox"]
EXTENSION = ".tsv"
COLUMN = "abstract_text"

for filepath in PROJECT_FILEPATHS:
    df = pd.read_csv(filepath+EXTENSION, sep="\t")
    df[COLUMN] = df[COLUMN].apply(lambda x: x.replace("\\n", " ") if not pd.isna(x) else x)
    df.to_csv(f"{filepath}{datetime.now()}{EXTENSION}", sep="\t", index=False)
