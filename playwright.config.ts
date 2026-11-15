import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', timeout: 120_000, use: { baseURL: 'http://localhost:3100', channel: 'chrome', headless: true, viewport: { width: 1600, height: 900 }, launchOptions: { args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader'] } } });
