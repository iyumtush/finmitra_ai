import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({width: 1280, height: 720});
    await page.goto('http://localhost:8085/slide_3.html', {waitUntil: 'networkidle0'});
    await page.screenshot({path: '/Users/admin/.gemini/antigravity-ide/brain/a6016e96-3b3e-4478-a934-f24070502ee9/seminar_slide_3.png'});
    await browser.close();
    console.log("Screenshot saved.");
  } catch(e) {
    console.error(e);
  }
})();
