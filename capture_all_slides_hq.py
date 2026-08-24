from playwright.sync_api import sync_playwright
import time

def capture_slides():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Viewport 1280x720 matches the CSS, scale factor 3 gives 3840x2160 image
            context = browser.new_context(
                viewport={'width': 1280, 'height': 720},
                device_scale_factor=3
            )
            page = context.new_page()
            
            for i in range(1, 7):
                url = f'http://localhost:8085/slide_{i}.html'
                print(f"Navigating to {url}")
                page.goto(url, wait_until="networkidle")
                time.sleep(1) # Extra wait for fonts/images
                
                out_path = f'/Users/admin/.gemini/antigravity-ide/brain/a6016e96-3b3e-4478-a934-f24070502ee9/seminar_slide_{i}.png'
                page.screenshot(path=out_path)
                print(f"Screenshot saved to {out_path}")
            
            browser.close()
    except Exception as e:
        print(f"Error taking screenshots: {e}")

if __name__ == "__main__":
    capture_slides()
