const nihReporterApi = "https://api.reporter.nih.gov/v2/projects/Search";
const pmcApiPrefix = "https://www.ncbi.nlm.nih.gov/pmc/articles/";
const pmWebsite = "https://pubmed.ncbi.nlm.nih.gov/?term=";
const pmArticleSite = "https://pubmed.ncbi.nlm.nih.gov/";
const pmGeoSite = "https://www.ncbi.nlm.nih.gov/gds/?linkname=pubmed_gds&from_uid=";
const pmGeoDetailSite = "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=";
const pmSraSite = "https://www.ncbi.nlm.nih.gov/sra/?linkname=pubmed_sra&from_uid=";
const pmSraDetailSite = "https://www.ncbi.nlm.nih.gov/sra/";
const pmSrpDetailSite = "https://trace.ncbi.nlm.nih.gov/Traces/sra/?study=";
const pmBioprojectDetailSite = "https://www.ncbi.nlm.nih.gov/bioproject/";
const pmDbgapSite = "https://www.ncbi.nlm.nih.gov/gap/?linkname=pubmed_gap&from_uid=";
const pmDbgapDetailSite = "https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=";
const clinicalTrialsSite = "https://clinicaltrials.gov/ct2/results?cond=&term=";
const clinicalTrialsApi = "https://clinicaltrials.gov/ct2/results/rpc/";
const clinicalTrialsDetailSiteStudy = "https://clinicaltrials.gov/ct2/show/study/";
const clinicalTrialsDetailSiteRecord = "https://clinicaltrials.gov/ct2/show/record/";
const iciteApi = "https://itools.od.nih.gov/icite/api/pubs?pmids=";
const usptoPubwebappEndpoint = "https://ppubs.uspto.gov/dirsearch-public/searches/searchWithBeFamily";

module.exports = {
  nihReporterApi,
  pmcApiPrefix,
  pmWebsite,
  pmArticleSite,
  pmGeoSite,
  pmGeoDetailSite,
  pmSraSite,
  pmSraDetailSite,
  pmSrpDetailSite,
  pmBioprojectDetailSite,
  pmDbgapSite,
  pmDbgapDetailSite,
  clinicalTrialsSite,
  clinicalTrialsApi,
  clinicalTrialsDetailSiteStudy,
  clinicalTrialsDetailSiteRecord,
  iciteApi,
  usptoPubwebappEndpoint
};