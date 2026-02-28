require('dotenv').config();

(async () => {
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const ig = process.env.INSTAGRAM_BUSINESS_ID;

    if (!token || !ig) {
        console.log("No token or IG ID in .env");
        return;
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${ig}?access_token=${token}`);
    const json = await res.json();
    console.log(json);
})();
