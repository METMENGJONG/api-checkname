const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.smile.one';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8',
};

const REGIONS = [
  'br', 'id', 'jp', 'my', 'pk', 'ph', 'sg', 'th', 'tw', 'hk', 'kr',
  'eu', 'uk', 'ru', 'ar', 'cl', 'co', 'cr', 'ec', 'gt', 'mx', 'pa', 'pe', 'us',
  'ae', 'bh', 'sa', 'kw', 'qa', 'om', 'eg', 'tj', 'au', 'nz', 'global',
];

async function checkRole(region, game, userId, phpsessid, zoneId = '') {
  try {
    const merchantUrl = `${BASE_URL}/${region}/merchant/${game}`;

    const cookieHeader = phpsessid ? `PHPSESSID=${phpsessid}` : '';

    const res = await axios.get(merchantUrl, {
      headers: { ...HEADERS, Cookie: cookieHeader },
      timeout: 30000,
    });

    const html = res.data;

    const match = html.match(/js_checkrole_url\s*=\s*'([^']+)'/);
    let checkroleUrl = match ? match[1] : `${merchantUrl}/checkrole`;

    if (!checkroleUrl.startsWith('http')) {
      checkroleUrl = BASE_URL + checkroleUrl;
    }

    const payload = new URLSearchParams({
      user_id: userId,
      zone_id: zoneId || '',
      pid: '',
      pay_methond: '',
      channel_method: '',
      checkrole: '1',
    });

    const roleRes = await axios.post(checkroleUrl, payload.toString(), {
      headers: {
        ...HEADERS,
        Cookie: cookieHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });

    const data = roleRes.data;

    if (data.code !== 200) {
      return { success: false, error: data.info || data.message || 'Role check failed' };
    }

    return {
      success: true,
      username: data.username || 'Unknown',
      user_id: data.user_id || userId,
      zone_id: data.zone_id || zoneId,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getGamesList(region = 'br') {
  try {
    const url = region === 'global' ? BASE_URL : `${BASE_URL}/${region}`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 30000 });
    const html = res.data;

    const jsonMatch = html.match(/gameList\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatch) {
      try {
        const list = JSON.parse(jsonMatch[1]);
        return list.map(g => ({
          title: g.title || '',
          slug: (g.url || '').replace(/\/$/, '').split('/').pop(),
          url: g.url || '',
          discount: g.discount || '',
        }));
      } catch {}
    }

    const slugs = new Set();
    const games = [];
    const linkPattern = /href="(https?:\/\/[^"]*\/merchant\/([^"?]+))"/g;
    let m;
    while ((m = linkPattern.exec(html)) !== null) {
      const slug = m[2].replace(/\/$/, '').split('?')[0];
      if (!slugs.has(slug)) {
        slugs.add(slug);
        games.push({
          title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          slug,
          url: m[1],
        });
      }
    }
    return games;
  } catch {
    return [];
  }
}

module.exports = { checkRole, getGamesList, REGIONS, BASE_URL };
