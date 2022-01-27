const puppeteer = require('puppeteer');
const apis = require('./common/apis');

// if you don't set pageNum, then you will get the landing page with 200 results per page
const interactSRA = async (pmId, pageNum=null) => {
    let result = "";
    await (async () => {
        const browser = await puppeteer.launch(
            {
                'defaultViewport' : { 'width' : 1024, 'height' : 1600 }
            });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout( 90000 );
        await page.setViewport( { 'width' : 1024, 'height' : 1600 } );
        await page.setUserAgent( 'UA-TEST' );

        console.log(apis.pmSraSite + pmId);
        await page.goto(apis.pmSraSite + pmId, { 'waitUntil' : 'domcontentloaded' });

        await page.waitForSelector("input[id$=\"ps200\"]");
        let handle1 = await page.$("input[id$=\"ps200\"]");
        await handle1.evaluate(b => b.click());
        await page.waitForNavigation();

        if (pageNum) {
        await page.waitForSelector('input[name=EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage]');
        await page.$eval('input[name=EntrezSystem2.PEntrez.Sra.Sra_ResultsPanel.Entrez_Pager.cPage]', el => el.value = String(pageNum));
        await page.focus('#pageno');
        await page.keyboard.press("Enter");
        }

        result = await page.evaluate(() => document.body.innerHTML);

        await browser.close();
    })()
    return result;
};

const run = async () => {
    let pmId = 29054992;
    let d = await interactSRA(pmId);

    let tmp = d;
    let idx = tmp.indexOf("Items: ");  // if there aren't multiple results, this accession shouldn't be here
    tmp = tmp.substring(idx + 7);
    idx = tmp.indexOf("</h3");
    tmp = tmp.substring(0,idx);
    let of_idx = tmp.indexOf("of ");
    if (of_idx > -1) {
        tmp = tmp.substring(of_idx + 3);    
    }
    total_results = parseInt(tmp.substring(0,idx));  // get the total number of results on the first page visit
    console.log(total_results); // should be 166 total items

    let accessions = [];
    tmp = d;
    let idx_start = tmp.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
    while (idx_start > -1) {
        tmp = tmp.substring(idx_start + 25);
        let idx_end = tmp.indexOf("</dd>");
        let accession = tmp.substring(0, idx_end);
        accessions.push(accession);
        tmp = tmp.substring(idx_end);
        idx_start = tmp.indexOf("<dt>Accession: </dt> <dd>");  // 25 characters
    }
    console.log(accessions.length);  // should be 166 accessions scraped for page size 200, 20 otherwise
}

run();
