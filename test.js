const analyticsService = require("./services/analyticsService");

async function main() {
    // const allEmails = await analyticsService.getAllEmailAnalyticsMeta();
    // console.log(allEmails);
    const email = await analyticsService.getFullEmailAnalytics("64f23f9f44d7d5799ae86da9c001f76f")
    console.log(JSON.stringify(email, null, 2));

}

main();