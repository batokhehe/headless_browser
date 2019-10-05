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

    let sql = "SELECT *, " +
	"( SELECT SUM( `comment` ) FROM post_relateds WHERE influencer_id = influencers.id ORDER BY post_relateds.id LIMIT 12 ) AS comments, " +
	"( SELECT SUM( `like` ) FROM post_relateds WHERE influencer_id = influencers.id ORDER BY post_relateds.id LIMIT 12 ) AS likes " +
    "FROM influencers WHERE STATUS = '1' ORDER BY id ASC";
    db.query(sql, function (err, result) {
        if (err) throw err;

        result.forEach(influencer => {
            crowling(influencer);
        });
    });
});

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

        await page.goto('https://www.instagram.com/' + influencer.instagram_username, {
            waitUntil: 'networkidle2'
        });

        await sleep(10000);

        // const followings = await page.$x('//*[@id="react-root"]/div/div/div/main/div/div[2]/div/div/div/div/div/div/div[1]/div/div[5]/div[1]/a/span[1]/span')
        // let following = await page.evaluate(following => following.textContent, followings[0]);

        // const followers = await page.$x('//*[@id="react-root"]/div/div/div/main/div/div[2]/div/div/div/div/div/div/div[1]/div/div[5]/div[2]/a/span[1]/span')
        // let follower = await page.evaluate(follower => follower.textContent, followers[0]);

        const followers = await page.$x('//*[@id="react-root"]/section/main/div/header/section/ul/li[2]/a/span')
        let follower = await page.evaluate(follower => follower.getAttribute("title"), followers[0]);

        const followings = await page.$x('//*[@id="react-root"]/section/main/div/header/section/ul/li[3]/a/span')
        let following = await page.evaluate(following => following.textContent, followings[0]);

        const profile_images = await page.$x('//*[@id="react-root"]/section/main/div/header/div/div/span/img')
        let profile_image = null;

        // console.log(profile_images);

        if(typeof profile_images !== 'undefined' && profile_images.length > 0){
            profile_image = await page.evaluate(profile_image => profile_image.getAttribute("src"), profile_images[0]);
            console.log("ada story");
        } else {
            const profile_images2 = await page.$x('//*[@id="react-root"]/section/main/div/header/div/div/div/button/img')
            profile_image = await page.evaluate(profile_image => profile_image.getAttribute("src"), profile_images2[0]);
            console.log("gak ada story");
        }

        // console.log(profile_image)

        follower = follower.replace(/\,/g, '');
        following = following.replace(/\,/g, '');
        var comments = influencer.comments;
        var likes = influencer.likes;

        var fans_growth = influencer.followers > 0 ? follower - influencer.followers : "0";

        let sql2 = "INSERT INTO `audience_relateds` (influencer_id, followers, followings, fans_growth, created_at) " +
                    "VALUES ('" + influencer.id + "', '" + follower + "', '" + following + "', '" + fans_growth + "', now())";
        await db.query(sql2, function (err, result) {
            if (err) throw err;
            console.log('Insert Data Berhasil')
        });

        console.log("Profile Image : " + profile_image);
        console.log("Follower : " + follower);
        console.log("Following : " + following);
        console.log("Fans Growth : " + fans_growth);

        var engagement_rate = (comments + likes) / follower;

        let sql = "UPDATE `influencers` SET `image` = '" + profile_image + "', `followers` = '" + follower + "', engagement_rate ='" +engagement_rate/100+ "' WHERE instagram_username = '" + influencer.instagram_username + "'";
        await db.query(sql, function (err, result) {
            if (err) throw err;
            console.log('Update Data Influencers Berhasil')
        });

        console.log("Engagement Rate : " + engagement_rate);
        console.log("Comments : " + comments);
        console.log("Likes : " + likes);

        await page.close();

    }
    await login();
    await browser.close();
}