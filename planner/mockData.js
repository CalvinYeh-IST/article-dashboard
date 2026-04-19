// ============================================================
//  Mock content.json — matches main.js field shape
//  Fields: id, title, description, year, status, dateZh, dateEn,
//          theme[], region[], season[], has[], subDir[],
//          city, area, lat, lng (lat/lng may be null → AI estimated)
// ============================================================
window.MOCK_ARTICLES = [
  { id: 'a001', title: '大稻埕老街的茶文化巡禮', description: '走過百年茶行的木門，在迪化街聽老闆娘講述東方美人茶的起源與泡法。',
    year: '2026', status: '已上架', dateZh: '2026-01-15', dateEn: '2026-02-10',
    theme: ['文化美食'], region: ['北部'], season: ['春','秋'], has: ['店家','小吃'],
    subDir: ['街區'], city: '台北', area: '大同區', lat: 25.0559, lng: 121.5096,
    author: '林家瑜', readTime: '6 min read',
    image_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&h=600&fit=crop',
    content: ['迪化街北段的這家茶行，從 1920 年代日治時期開業至今，木造門框仍維持著最初的樣子。','「東方美人茶是唯一一種，被蟲咬過反而更值錢的茶。」沈太太邊說邊燒水。小綠葉蟬咬過的葉片，會釋出獨特的蜜香。','茶行後方有一個只容兩人坐下的試茶室，牆上掛著三代人的合影。'],
  },
  { id: 'a002', title: '台中第二市場的台式早午餐', description: '從顏記肉包到老王菜頭粿，日治時期的紅磚市場藏著台中最日常的味道。',
    year: '2026', status: '已上架', dateZh: '2026-02-20', dateEn: '-',
    theme: ['文化美食','常民生活'], region: ['中部'], season: ['春','夏','秋','冬'], has: ['小吃','店家'],
    subDir: ['市場'], city: '台中', area: '中區', lat: 24.1465, lng: 120.6805,
    author: '陳昱廷', readTime: '5 min read',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&h=600&fit=crop',
    content: ['1917 年落成的第二市場，是台中人從阿嬤那一代就開始吃早餐的地方。','顏記肉包的第三代老闆每天凌晨三點開始揉麵糰，堅持用老麵發酵。','隔壁老王菜頭粿，油鍋前永遠排隊。'],
  },
  { id: 'a003', title: '阿里山日出與鄒族咖啡', description: '海拔 1200 公尺的樂野部落，鄒族青年接手咖啡園，與森林共生的第二代。',
    year: '2026', status: '已上架', dateZh: '2026-03-05', dateEn: '2026-04-02',
    theme: ['自然生態','文化美食'], region: ['南部'], season: ['秋','冬'], has: ['店家','景點'],
    subDir: ['山林','部落'], city: '嘉義', area: '阿里山鄉', lat: 23.5101, lng: 120.8039,
    author: '高明達', readTime: '8 min read',
    image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=900&h=600&fit=crop',
    content: ['海拔 1200 公尺的樂野部落，霧氣幾乎整年都在。','「我們不砍原生樹，咖啡樹就長在林蔭底下。」Voyu 指著頭頂的茄苳樹說。','傍晚的烘豆屋，空氣中全是焦糖和柑橘的香氣。'],
  },
  { id: 'a004', title: '台南府城小吃地圖', description: '從國華街的永樂牛肉湯到保安路的阿堂鹹粥，一天不夠吃完的府城清晨。',
    year: '2026', status: '已上架', dateZh: '2026-03-18', dateEn: '2026-04-08',
    theme: ['文化美食','常民生活'], region: ['南部'], season: ['春','夏','秋','冬'], has: ['小吃','店家'],
    subDir: ['街區'], city: '台南', area: '中西區', lat: 22.9945, lng: 120.2025,
    author: '王佩芬', readTime: '7 min read',
    image_url: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=900&h=600&fit=crop',
    content: ['國華街是台南人公認的美食總站。凌晨四點，永樂牛肉湯的老闆已經開始切肉。','走幾步到保安路，阿堂鹹粥用虱目魚頭熬湯底。','下午三點是台南最安靜的時刻，所有小吃攤都休息，只有冰店在營業。'],
  },
  { id: 'a005', title: '花蓮縱谷的咖啡產區走讀', description: '193 縣道旁的豐田咖啡，第三代農人用自然農法重新定義台灣咖啡風土。',
    year: '2026', status: '已上架', dateZh: '2026-04-02', dateEn: '-',
    theme: ['自然生態','文化美食'], region: ['東部'], season: ['春','秋'], has: ['店家','景點'],
    subDir: ['山林','產地'], city: '花蓮', area: '壽豐鄉', lat: 23.7418, lng: 121.4418,
    author: '張文瀚', readTime: '6 min read',
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&h=600&fit=crop',
    content: ['193 縣道是花東縱谷最美的鄉道之一，路兩旁不是稻田就是咖啡園。','「我不用化肥，雜草都用手拔。」阿偉蹲下來拔起一把草。','縱谷的晨霧和中央山脈的雪水，讓這裡的咖啡有著明亮的酸質和花香。'],
  },
  { id: 'a006', title: '九份山城的午後時光', description: '老街盡頭的茶館眺望基隆山，像踩進宮崎駿動畫的場景。',
    year: '2026', status: '已上架', dateZh: '2026-01-22', dateEn: '2026-02-18',
    theme: ['文化美食','藝術文化'], region: ['北部'], season: ['秋','冬'], has: ['店家','景點'],
    subDir: ['山城'], city: '新北', area: '瑞芳區', lat: 25.1089, lng: 121.8442,
    author: '吳思穎', readTime: '5 min read',
    image_url: 'https://images.unsplash.com/photo-1609825488888-3a766db05542?w=900&h=600&fit=crop',
    content: ['九份豎崎路的石階是這座山城最早的時間軸。','阿妹茶樓從 1991 年開到現在，窗邊座位總是需要耐心等候。','下午四點半，霧氣從山谷升起，整條老街會被一層薄紗包住。'],
  },
  { id: 'a007', title: '墾丁海岸的風與潮間帶', description: '從白沙到龍磐草原，南台灣最廣闊的海岸線。',
    year: '2026', status: '已上架', dateZh: '2026-02-05', dateEn: '-',
    theme: ['自然生態'], region: ['南部'], season: ['春','夏'], has: ['景點','活動'],
    subDir: ['海岸'], city: '屏東', area: '恆春鎮', lat: 21.9474, lng: 120.7737,
    author: '黃偉誠', readTime: '7 min read',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=600&fit=crop',
    content: ['龍磐草原的落山風在冬天最強，能把人吹得站不住。','白沙灣的貝殼砂是千萬年珊瑚碎屑沖積而成。','夜晚的星空保留區，抬頭就是銀河。'],
  },
  { id: 'a008', title: '宜蘭三星蔥田的職人日記', description: '全台蔥香最濃的地方，跟著農夫看蔥是怎麼長出來的。',
    year: '2026', status: '待上架', dateZh: '-', dateEn: '-',
    theme: ['常民生活','自然生態'], region: ['東部'], season: ['冬','春'], has: ['伴手禮','活動'],
    subDir: ['農田'], city: '宜蘭', area: '三星鄉',
    // NO lat/lng — will be AI-estimated
    author: '簡明華', readTime: '5 min read',
    image_url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=600&fit=crop',
    content: ['三星鄉的蔥田集中在安農溪灌溉的沖積平原。','老農阿水伯種蔥已經 40 年，他說要蔥白夠長，要選對季節。','蔥油餅是三星人最驕傲的發明。'],
  },
  { id: 'a009', title: '澎湖西嶼的老房與夕陽', description: '咾咕石砌成的古厝，映著西嶼燈塔的暮色。',
    year: '2026', status: '待上架', dateZh: '-', dateEn: '-',
    theme: ['文化美食','藝術文化'], region: ['離島'], season: ['春','夏','秋'], has: ['景點'],
    subDir: ['離島'], city: '澎湖', area: '西嶼鄉',
    // NO lat/lng — AI-estimated
    author: '蔡佳穎', readTime: '6 min read',
    image_url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=900&h=600&fit=crop',
    content: ['二崁聚落的咾咕石古厝是澎湖最完整的傳統建築群。','西嶼燈塔建於 1875 年，是台灣第一座西式燈塔。','夕陽把海水染成金色時，整座島都安靜了下來。'],
  },
  { id: 'a010', title: '新竹湖口老街的紅磚記憶', description: '日治時期火車站前的老街，如今仍保留著巴洛克立面。',
    year: '2026', status: '待初審', dateZh: '-', dateEn: '-',
    theme: ['文化美食','藝術文化'], region: ['北部'], season: ['春','秋','冬'], has: ['景點','店家','小吃'],
    subDir: ['老街'], city: '新竹', area: '湖口鄉', lat: 24.9036, lng: 121.0434,
    author: '羅雅倩', readTime: '5 min read',
    image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=900&h=600&fit=crop',
    content: ['湖口老街是北台灣保存最完整的巴洛克建築群。','三元宮前的廟口小吃攤是在地人的記憶。','紅磚牆上雕花裝飾，每一家都不一樣。'],
  },
  { id: 'a011', title: '台東都蘭山下的原民部落廚房', description: '阿美族媽媽的餐桌，野菜與海鮮的共舞。',
    year: '2026', status: '審稿中', dateZh: '-', dateEn: '-',
    theme: ['文化美食','藝術文化'], region: ['東部'], season: ['春','夏','秋'], has: ['店家','活動'],
    subDir: ['部落'], city: '台東', area: '東河鄉',
    // NO lat/lng — AI-estimated
    author: '陳怡如', readTime: '7 min read',
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&h=600&fit=crop',
    content: ['都蘭部落的阿姨們每週有三天會聚在工作坊分享自己種的野菜。','海祭前一個月，男人會去海邊學射魚。','野菜做的豐年祭便當是部落最想念的味道。'],
  },
  { id: 'a012', title: '高雄旗津渡輪與海線小吃', description: '從鼓山搭船 5 分鐘，就到了另一個高雄。',
    year: '2026', status: '已上架', dateZh: '2026-03-28', dateEn: '2026-04-15',
    theme: ['文化美食','常民生活'], region: ['南部'], season: ['春','夏'], has: ['小吃','景點','活動'],
    subDir: ['海港'], city: '高雄', area: '旗津區', lat: 22.6105, lng: 120.2719,
    author: '林子軒', readTime: '6 min read',
    image_url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=900&h=600&fit=crop',
    content: ['鼓山渡輪是高雄人上班通勤的日常。','旗津海鮮一條街的烤小卷是招牌。','環島自行車道一路到彩虹教堂，夕陽最美。'],
  },
];

// City / area → approximate lat/lng for AI estimation
// This table simulates what a Gemini/Claude call would return
window.CITY_COORDS = {
  '台北': { lat: 25.0478, lng: 121.5319 },
  '新北': { lat: 25.0120, lng: 121.4657 },
  '基隆': { lat: 25.1287, lng: 121.7419 },
  '桃園': { lat: 24.9937, lng: 121.3010 },
  '新竹': { lat: 24.8138, lng: 120.9675 },
  '苗栗': { lat: 24.5627, lng: 120.8214 },
  '台中': { lat: 24.1477, lng: 120.6736 },
  '彰化': { lat: 24.0818, lng: 120.5388 },
  '南投': { lat: 23.9609, lng: 120.9719 },
  '雲林': { lat: 23.7092, lng: 120.4313 },
  '嘉義': { lat: 23.4801, lng: 120.4490 },
  '台南': { lat: 22.9999, lng: 120.2268 },
  '高雄': { lat: 22.6273, lng: 120.3014 },
  '屏東': { lat: 22.5519, lng: 120.5487 },
  '宜蘭': { lat: 24.7021, lng: 121.7378 },
  '花蓮': { lat: 23.9871, lng: 121.6015 },
  '台東': { lat: 22.7583, lng: 121.1444 },
  '澎湖': { lat: 23.5711, lng: 119.5793 },
  '金門': { lat: 24.4491, lng: 118.3768 },
  '連江': { lat: 26.1608, lng: 119.9514 },
};

// Simulated "AI predict coordinates" — in production this would be a Gemini call
window.estimateCoords = function(city, area) {
  const base = window.CITY_COORDS[city];
  if (!base) return null;
  // Add small deterministic jitter based on area name hash so different areas
  // in the same city don't stack on top of each other
  let hash = 0;
  for (const c of (area || '')) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  const jitterLat = ((hash % 100) / 100 - 0.5) * 0.08;
  const jitterLng = (((hash >> 7) % 100) / 100 - 0.5) * 0.08;
  return { lat: +(base.lat + jitterLat).toFixed(4), lng: +(base.lng + jitterLng).toFixed(4) };
};

// Enrich articles: if lat/lng missing, AI-estimate them and flag
window.ENRICHED_ARTICLES = window.MOCK_ARTICLES.map(a => {
  if (a.lat == null || a.lng == null) {
    const est = window.estimateCoords(a.city, a.area);
    return { ...a, ...est, coordsEstimated: true };
  }
  return { ...a, coordsEstimated: false };
});
