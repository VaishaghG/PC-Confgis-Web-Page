const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async function testApp() {

    let options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        await driver.get('http://localhost:5000');
        console.log("✅ Page loaded successfully");
    } catch (err) {
        console.error("❌ Selenium failed:", err);
        process.exit(1);
    } finally {
        await driver.quit();
    }

})();
