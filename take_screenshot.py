from playwright.sync_api import sync_playwright
import time

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('http://localhost:8085/slide_3.html', wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path='/Users/admin/.gemini/antigravity-ide/brain/a6016e96-3b3e-4478-a934-f24070502ee9/seminar_slide_3.png')
        browser.close()
        print("Screenshot saved to seminar_slide_3.png")
except Exception as e:
    print(f"Error taking screenshot: {e}")
