
from playwright.sync_api import sync_playwright

def verify_economics(page):
    # Load the economics page (assuming local file access for simplicity since it's a static site)
    # Using absolute path for safety
    import os
    cwd = os.getcwd()
    page.goto(f'file://{cwd}/economics.html')

    # Mobile Viewport
    page.set_viewport_size({'width': 375, 'height': 812})

    # Wait for the page to load - using a selector that definitely exists
    page.wait_for_selector('.card-title', state='attached', timeout=5000)

    # Check that the Cash Flow Diagram is gone
    content = page.content()
    if 'cashFlowCanvas' in content:
        print('FAIL: cashFlowCanvas found in DOM')
    else:
        print('PASS: cashFlowCanvas not found in DOM')

    # Take a screenshot of the calculator form to show it fits on mobile
    page.screenshot(path='verification/economics_mobile.png', full_page=True)

    # Also verify other pages load and look okay on mobile

    # Index
    page.goto(f'file://{cwd}/index.html')
    page.wait_for_selector('.brand', state='attached', timeout=5000)
    page.screenshot(path='verification/index_mobile.png', full_page=True)

    # Powa
    page.goto(f'file://{cwd}/powa.html')
    # Powa might load some data, wait for table or h1
    # Check powa.html content first if needed, but usually header exists
    page.screenshot(path='verification/powa_mobile.png', full_page=True)

    # T-Distribution
    page.goto(f'file://{cwd}/t-distribution.html')
    page.screenshot(path='verification/t_dist_mobile.png', full_page=True)

    # Appendix
    page.goto(f'file://{cwd}/Appendix.html')
    page.screenshot(path='verification/appendix_mobile.png', full_page=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_economics(page)
        except Exception as e:
            print(f'Error: {e}')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
