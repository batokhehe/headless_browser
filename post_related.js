const db = require('./config');
const puppeteer = require('puppeteer');
// const CRED = require('./secret.rem');

const sleep = async (ms) => {
    return new Promise((res, rej) => {
        setTimeout(() => {
            res();
        }, ms)
    });
}

const ID = {
    login: 'input[name="session[username_or_email]"]',
    pass: 'input[name="session[password]"]'
};

db.connect(function (err) {
    if (err) throw err;

    let sql = "select * from influencers where status = '1'";
    db.query(sql, function (err, result) {
        if (err) throw err;

        result.forEach(influencer => {
            crowling(influencer);
        });
    });
});

function parser(str){
    var parser = { k: '000', m: '000000' };
    var parser2 = { k: '00', m: '00000' };
    var addon = '';
    if(str.includes('k')){
        addon = parser.k;
    }
    if(str.includes('m')){
        addon = parser.m;
    }
  	if(str.includes('.') && str.includes('k')){
        addon = parser2.k;
    }
    if(str.includes('.') && str.includes('m')){
        addon = parser2.m;
    }
    
    str = str.replace(/\./g, '');
    str = str.replace(/\,/g, '');
    str = str.replace(/\k/g, '');
    str = str.replace(/\m/g, '');
    str = str + '' + addon; 
    
  	return str;
}

async function crowling(influencer) {

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications']
    });

    const page = await browser.newPage();

    let login = async () => {
        // login
        // await page.goto('https://mobile.twitter.com/login', {
        //     waitUntil: 'networkidle2'
        // });

        // await page.waitForSelector(ID.login);
        // await page.type(ID.login, CRED.user);
        // await page.type(ID.pass, CRED.pass);
        // await page.click('div[role="button"]')

        await page.goto('https://instagram.com/' + influencer.instagram_username, {
            waitUntil: 'networkidle2'
        });

        await sleep(5000);

        const elements = await page.$$( '.v1Nh3' );
        let k = 1;
        let l = 1;
        for ( let i = 0; i < elements.length; i++ ){
            console.log("K : " + k + " L : " + l);
            const post_ids = await page.$x('//*[@id="react-root"]/section/main/div/div[3]/article/div/div/div[' + k + ']/div[' + l + ']/a')
            let post_id = await page.evaluate(post_id => post_id.getAttribute("href"), post_ids[0]);
            const images = await page.$x('//*[@id="react-root"]/section/main/div/div[3]/article/div/div/div[' + k + ']/div[' + l + ']/a/div/div/img')
            let image = await page.evaluate(image => image.getAttribute("src"), images[0]);
            l++;
            if(l > 3) k++;
            if(l > 3) l = 1;

            await elements[i].hover('.v1Nh3');
            let ExInnerText = await page.evaluate(ExInnerText => ExInnerText.innerText, elements[i]);
            var res = ExInnerText.split(/\n/);
            
            console.log("Post Id : " + post_id);
            console.log("Like : " + res[0] + " Comment : " + res[1]);
            let like = res[0];
            let comment = res[1];
            let update  = false;

            let sql = "SELECT * FROM `post_related` WHERE influencer_id = '" + influencer.id + "' AND post_id  = '" + post_id + "'";
            await db.query(sql, function (err, result) {
                if (err) throw err;
                if(result.length > 0){
                    update = true;
                }
            });

            if(!update){
                let sql = "INSERT INTO `post_related` (influencer_id, post_id, `like`, `comment`, `image`, created_at) " +
                            "VALUES ('" + influencer.id + "', 'https://www.instagram.com" + post_id + "', '" + parser(like) + "', '" + parser(comment) + "', '" + image + "', now())";
                await db.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log('Insert Data Berhasil')
                });
            } else {
                let sql = "UPDATE `post_related` SET like = '" + parser(like) + "', comment = '" + parser(comment) + "' " + 
                        "WHERE influencer_id = '" + influencer.id + "' AND post_id = 'https://www.instagram.com" + post_id + "'";
                await db.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log('Update Data Berhasil')
                });
            }
        }

        await page.close();

    }
    await login();
    await browser.close();
}