const { Builder, By } = require('selenium-webdriver');

(async function test() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        await driver.get('http://localhost:5000');

        const title = await driver.getTitle();
        console.log("Page title:", title);

    } finally {
        await driver.quit();
    }
})();