const { Builder } = require('selenium-webdriver');

(async function testApp() {

    let driver = await new Builder()
        .usingServer('http://localhost:4444/wd/hub') // 👈 IMPORTANT
        .forBrowser('chrome')
        .build();

    try {
        await driver.get('http://host.docker.internal:5000'); // 👈 IMPORTANT
        console.log("✅ Page loaded successfully");
    } catch (err) {
        console.error("❌ Selenium failed:", err);
        process.exit(1);
    } finally {
        await driver.quit();
    }

})();
