import os.path
from datetime import datetime

import re
import pandas as pd
import numpy as np

DATA_DIR = os.path.abspath("data")
EXTENSIONS = ["tsv", "txt"]

files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(DATA_DIR+"/"+f) and f.split(".")[1] in EXTENSIONS]

for file in files:
    df = pd.read_csv(DATA_DIR+"/"+file, sep="\t", dtype=object)
    df = df.applymap(lambda x: re.sub(r" +", " ", x) if not pd.isna(x) and isinstance(x,str) else x)
    df.to_csv(f"{DATA_DIR}/{file}", sep="\t", index=False)
