const { Builder } = require('selenium-webdriver');

(async function testApp() {

    let driver = await new Builder()
        .usingServer('http://localhost:4444/wd/hub') // Selenium service
        .forBrowser('chrome')
        .build();

    try {
        // ✅ FIXED URL (THIS IS THE KEY)
        await driver.get('http://localhost:5000');

        console.log("✅ Page loaded successfully");

    } catch (err) {
        console.error("❌ Selenium failed:", err);
        process.exit(1);
    } finally {
        await driver.quit();
    }

})();
