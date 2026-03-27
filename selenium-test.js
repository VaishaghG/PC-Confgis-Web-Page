const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

(async function testApp() {
  const options = new chrome.Options().addArguments(
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage"
  );

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.get("http://localhost:5000");
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    console.log("Page loaded successfully");
  } catch (err) {
    console.error("Selenium failed:", err);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
})();
