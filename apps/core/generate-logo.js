import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for __dirname in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('🎨 Rendering your code-based logo to PNG...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Your exact DEUS logo code
  const logoHtml = `
    <div style="
      width: 1024px; 
      height: 1024px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: #0f172a; 
      font-family: sans-serif;
    ">
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 180px; font-weight: 900; color: #4285F4;">D</span>
        <span style="font-size: 180px; font-weight: 900; color: #EA4335;">E</span>
        <span style="font-size: 180px; font-weight: 900; color: #FBBC04;">U</span>
        <span style="font-size: 180px; font-weight: 900; color: #34A853;">S</span>
      </div>
    </div>
  `;

  await page.setContent(logoHtml);
  await page.setViewport({ width: 1024, height: 1024 });

  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

  await page.screenshot({ 
    path: 'assets/icon.png', 
    omitBackground: false 
  });

  console.log('✅ Success! Logo saved to: assets/icon.png');
  await browser.close();
})();