# INS-ETL

## Introduction
If you want to mine data for INS project, please stay at the root folder.

## Mining
Simply run the following command to initiate the mining process:

```bash
node index.js
```

## Data Loading
Move to data_loading folder for the data loading process. The following steps will show you how to load the data into database.

### Pre-requisites
Python 3.6 or newer

An initialized and running Neo4j database

### Add Dependencies
Run the following command to install dependencies.

```bash
pip3 install -r requirements.txt
```

Or run ```pip install -r requirements.txt``` if you are using virtualenv. The dependencies included in requirements.txt are listed below:

pyyaml

neo4j - version 1.7.6

boto3

requests

### Configuration File
All the inputs of Data Loader can be set in a YAML format configuration file by using the fields defined below. Using a configuration file can make your Data Loader command significantly shorter.

An example configuration file can be found in config/config.yml

neo4j:uri: Address of the target Neo4j endpoint

neo4j:user: Username to be used for the Neo4j database

neo4j:password: Password to be used for the Neo4j database

schema: The file path(s) of the YAML formatted schema file(s)

prop_file: The file containing the properties for the specified schema

dataset: The directory containing the data to be loaded, a temporary directory if loading from an S3 bucket

### Run the Pre-processing Pipeline
The INS project has a data pre-processing pipeline which consists of several Python scripts. These scripts format and in some cases generate a report about the data.

It is essential to run these scripts in order for the raw gathered data to work in the INS web application.

These scripts should be run from the root directory for the INS-ETL project in the following order and they will act upon data in the '/data' directory:

1) <code>python date_restriction_for_outputs.py</code> This filters data based upon dates

2) <code>python project_abstract_formatter.py</code> This removes '\n' characters from project abstracts

3) <code>python extra_whitespace_formatter.py</code> This makes sure any whitespace is just a single space

4) <code>python calculate_award_amount_ranges.py</code> This formats a column for the project data to be used on the UI

5) <code>python tag_representative_project.py</code> This formats a column for the project data that is internal to the application but is required for the application to work properly

6) <code>python output_count_report.py</code> This generates a report for the data, intended for data validation purposes

There are assumptions:
1) All files have the file extensions either '.txt' or '.tsv'. Our convention is that manually curated data ends in '.txt' while automatically gathered data ends in '.tsv'.
2) All files start with the type of data in the file, case sensitive. For example: type 'patent' has files 'patent_application.tsv' and 'patent_grant.tsv', not 'granted_patent.tsv' or 'Patent_application.tsv'. Any filename-level annotation is to be done after the beginning of the filename is the type of data in the file.
3) These are tab delimited files.

NOTE0: For manually curated data, if copy/pasting was involved, there may be some characters that don't display properly, they may look like this '�'. These need to be addressed by hand. Take care when preparing manually curated data, in general.

NOTE1: Sometimes automatically gathered data isn't perfect, sometimes there are sparse or ill-formatted rows that can usually be safely removed. From experience, these are very rare.

### Load Data into Neo4j
Run following command to load data into neo4j database (under data_loading folder):

```bash
python loader.py config/config.yml -p <neo4j password> -s model-desc/ins_model_file.yaml -s model-desc/ins_model_properties.yaml --prop-file model-desc/props-ins.yml --no-backup --dataset data
``` 
