import { BearHotspot, QuizQuestion } from './types';

// Export an empty array as default to satisfy any legacy imports, 
// though the app now uses dynamic data.
export const BEAR_HOTSPOTS: BearHotspot[] = [];

// Helper to get Unsplash URLs with optimization params
// w=800 is good for quality/speed balance. q=80 for compression.
const getUnsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

// === Curated Image Library ===

const PEACEFUL_FOREST_IMAGES = [
  getUnsplash('1441974231531-c6227db76b6e'), // Sunlight forest
  getUnsplash('1448375240586-dfd8d395ea6c'), // Green trees
  getUnsplash('1511497584788-876760111969'), // Forest path
  getUnsplash('1502082553048-f009c37129b9'), // Trees
  getUnsplash('1473448912268-2022ce9509d8'), // Misty woods
];

const SCARY_FOREST_IMAGES = [
  getUnsplash('1519074069444-1ba4fff66d16'), // Spooky trees
  getUnsplash('1485809052957-e85d615339d9'), // Foggy forest
  getUnsplash('1518182177546-0766198a268a'), // Mist
  getUnsplash('1500534623283-312aade485b7'), // Dark mysterious
];

const ANGRY_BEAR_IMAGES = [
  getUnsplash('1575551311351-5455b5501b8e'), // Grizzly face close up
  getUnsplash('1530595467558-28c8fdd30648'), // Brown bear walking
  getUnsplash('1589656966895-2f33e7653819'), // Black bear
  getUnsplash('1596716048123-5e929da9f37c'), // Bear stance
];

const SAFE_HIKER_IMAGES = [
  getUnsplash('1551632811-561732d1e306'), // Hiker happy
  getUnsplash('1501555088652-021faa106b9b'), // Hiker gear
  getUnsplash('1535025916694-273f55079a40'), // Bear walking away
];

const CAMPING_IMAGES = [
  getUnsplash('1478131143081-80f7f84ca84d'), // Tent night
  getUnsplash('1523987355523-c7b5b0dd90a7'), // Camping food
  getUnsplash('1504280390367-361c6d9e6342'), // Peaceful camp
];

export const QUIZ_DATA: QuizQuestion[] = [
  {
    id: 1,
    scenario: "你在森林徒步時，發現前方約 20 公尺處有一隻熊，但牠還沒發現你。",
    scenarioImages: [
      getUnsplash('1559235860-26284687d953'), // Bear in grass distance
      getUnsplash('1589656966895-2f33e7653819'), // Black bear distance
    ],
    successImages: PEACEFUL_FOREST_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '轉身拔腿狂奔', isCorrect: false, feedback: "千萬別跑！跑步會觸發熊的追逐本能。" },
      { id: 'B', text: '安靜且緩慢地後退', isCorrect: true, feedback: "正確。在不引起注意的情況下離開現場。" },
      { id: 'C', text: '開閃光燈拍照留念', isCorrect: false, feedback: "快門聲或閃光可能會激怒熊發動攻擊。" }
    ],
    explanation: "如果熊還沒發現你，首要目標是在不驚動牠的情況下離開。任何快速移動（如跑步）都可能讓熊把你當作獵物。"
  },
  {
    id: 2,
    scenario: "熊發現你了，並且開始帶有攻擊性地接近（耳朵向後貼、頭低垂）。",
    scenarioImages: [
      getUnsplash('1596716048123-5e929da9f37c'), // Aggressive stance
    ],
    successImages: [
      getUnsplash('1535025916694-273f55079a40'), // Bear turning away
    ],
    failureImages: [
      getUnsplash('1575551311351-5455b5501b8e'), // Grizzly face
    ],
    options: [
      { id: 'A', text: '爬上最近的一棵樹', isCorrect: false, feedback: "熊是爬樹高手，你反而會被困在樹上無處可逃。" },
      { id: 'B', text: '堅守原地，揮動雙手大喊', isCorrect: true, feedback: "正確。讓自己看起來高大且具威脅性，表明你是人類。" },
      { id: 'C', text: '立刻躺下裝死', isCorrect: false, feedback: "裝死是遭受「接觸攻擊」時的最後手段，而非威嚇階段的對策。" }
    ],
    explanation: "大多數的衝刺是「虛張聲勢」。堅守陣地並大聲說話（表明身份）是關鍵，千萬不要轉身逃跑。"
  },
  {
    id: 3,
    scenario: "你在濃霧或視線不佳的茂密灌木叢中行走。",
    scenarioImages: [
      getUnsplash('1485809052957-e85d615339d9'), // Foggy forest
      getUnsplash('1518182177546-0766198a268a'), // Mist
    ],
    successImages: PEACEFUL_FOREST_IMAGES,
    failureImages: SCARY_FOREST_IMAGES,
    options: [
      { id: 'A', text: '安靜行走，仔細聆聽熊聲', isCorrect: false, feedback: "安靜行走容易造成「驚嚇相遇」，這是最危險的情況。" },
      { id: 'B', text: '製造噪音（掛熊鈴、說話）', isCorrect: true, feedback: "正確。讓熊知道有人類接近，牠們通常會選擇避開。" },
      { id: 'C', text: '播放大聲的重金屬音樂', isCorrect: false, feedback: "不自然的電子噪音可能會讓野生動物感到困惑或被激怒。" }
    ],
    explanation: "「驚嚇相遇」是熊攻擊人類的主因。在視線不佳處，務必發出聲音（Hello~ 或使用熊鈴）預警。"
  },
  {
    id: 4,
    scenario: "你在有熊出沒的區域露營過夜。食物該怎麼處理？",
    scenarioImages: CAMPING_IMAGES,
    successImages: [
      getUnsplash('1504280390367-361c6d9e6342'), // Peaceful camp
    ],
    failureImages: [
      getUnsplash('1520627734241-8bbd2243d520'), // Destroyed/Messy nature (simulated)
    ],
    options: [
      { id: 'A', text: '放在帳篷內隨身保管', isCorrect: false, feedback: "危險！食物味道會直接把熊引進你的睡袋。" },
      { id: 'B', text: '放在帳篷門口', isCorrect: false, feedback: "這等於邀請熊進入你的營地。" },
      { id: 'C', text: '密封並掛在 100 公尺外的高處', isCorrect: true, feedback: "正確。將有氣味物品（含牙膏）遠離睡眠區。" }
    ],
    explanation: "露營黃金法則「熊三角」：烹飪區、睡眠區、食物儲存區應呈三角形，且彼此相距至少 100 公尺。"
  },
  {
    id: 5,
    scenario: "熊已經撲上來攻擊你了。你最好的防禦工具是什麼？",
    scenarioImages: [
      getUnsplash('1501555088652-021faa106b9b'), // Hiker gear
    ],
    successImages: SAFE_HIKER_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '防熊噴霧 (Bear Spray)', isCorrect: true, feedback: "正確。統計上，噴霧比槍支更能有效阻止攻擊。" },
      { id: 'B', text: '一把大獵刀', isCorrect: false, feedback: "必須極近距離才能使用，成功率極低且極度危險。" },
      { id: 'C', text: '手電筒', isCorrect: false, feedback: "強光可能暫時致盲，但無法物理性阻止攻擊。" }
    ],
    explanation: "防熊噴霧（高濃度辣椒素）能製造呼吸屏障。當熊進入 5-10 公尺範圍內時，瞄準臉部噴射。"
  }
];

export const MAP_CENTER_JAPAN: [number, number] = [38.5, 137.0];
export const MAP_ZOOM_LEVEL = 5;
export const ALERT_THRESHOLD_KM = 50; 
export const CRITICAL_DISTANCE_KM = 5;