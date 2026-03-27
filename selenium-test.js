const { Builder, By, until } = require('selenium-webdriver');
require('chromedriver');

(async function testApp() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Change this if needed
        await driver.get('http://localhost:5000');

        // Wait for page to load
        await driver.wait(until.titleContains('PC'), 5000);

        console.log("✅ Page loaded successfully");

    } catch (err) {
        console.error("❌ Selenium test failed:", err);
        process.exit(1);
    } finally {
        await driver.quit();
    }
})();