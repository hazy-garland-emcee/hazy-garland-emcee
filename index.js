const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// UUID اختصاصی شما
const UUID = process.env.UUID || 'b213bd59-19bc-4c25-8640-7830aea13cd9';
const PORT = process.env.PORT || 25302;

console.log('[Init] Starting setup process...');

// لینک‌های دانلود هسته Sing-box و Cloudflared متناسب با لینوکس amd64
const SING_BOX_URL = 'https://github.com/SagerNet/sing-box/releases/download/v1.9.0/sing-box-1.9.0-linux-amd64.tar.gz';
const CLOUDFLARED_URL = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';

// کانفیگ هسته Sing-box
const singboxConfig = {
  "log": { "level": "info", "timestamp": true },
  "inbounds": [
    {
      "type": "vless",
      "tag": "vless-in",
      "listen": "0.0.0.0",
      "listen_port": parseInt(PORT),
      "users": [{ "uuid": UUID, "flow": "" }],
      "transport": {
        "type": "ws",
        "path": "/vless-ws"
      }
    }
  ],
  "outbounds": [{ "type": "direct", "tag": "direct" }]
};

// نوشتن فایل کانفیگ
fs.writeFileSync('config.json', JSON.stringify(singboxConfig, null, 2));

// دانلود و اجرای برنامه‌ها
exec(`curl -L -o sing-box.tar.gz ${SING_BOX_URL} && tar -xzf sing-box.tar.gz --strip-components=1 && chmod +x sing-box && curl -L -o cloudflared ${CLOUDFLARED_URL} && chmod +x cloudflared`, (err) => {
  if (err) {
    console.error('[Error] Download failed:', err);
    return;
  }

  console.log('[Core] Launching Sing-box on port ' + PORT + '...');
  const sb = spawn('./sing-box', ['run', '-c', 'config.json']);
  
  sb.stdout.on('data', (d) => console.log(`[Sing-box] ${d}`));
  sb.stderr.on('data', (d) => console.log(`[Sing-box] ${d}`));

  console.log('[Tunnel] Starting Cloudflare Tunnel...');
  const cf = spawn('./cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate']);

  cf.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const domain = match[0].replace('https://', '');
      console.log('\n==================================================');
      console.log('🎉 نود اختصاصی شما با موفقیت ساخته شد:');
      console.log(`vless://${UUID}@${domain}:443?encryption=none&security=tls&sni=${domain}&type=ws&host=${domain}&path=%2Fvless-ws#BotHosting-CF`);
      console.log('==================================================\n');
    }
  });
});
