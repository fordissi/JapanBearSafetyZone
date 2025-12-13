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
  getUnsplash('1550989460-0adf9ea622e2'), // Replaced broken image (Bear walking)
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
      getUnsplash('1550989460-0adf9ea622e2'), // Brown bear walking (Fixed)
      getUnsplash('1589656966895-2f33e7653819'), // Black bear distance
    ],
    successImages: PEACEFUL_FOREST_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '轉身拔腿狂奔', isCorrect: false, feedback: "千萬別跑！跑步會觸發熊的追逐本能（時速可達 60km/h）。" },
      { id: 'B', text: '安靜且緩慢地後退', isCorrect: true, feedback: "正確。在不引起注意的情況下，眼睛餘光觀察並撤離。" },
      { id: 'C', text: '開閃光燈拍照留念', isCorrect: false, feedback: "快門聲或閃光可能會激怒熊，導致牠發動攻擊。" }
    ],
    explanation: "如果熊還沒發現你，首要目標是「隱形」。任何快速移動（如跑步）都可能讓熊把你當作獵物。熊的動態視覺極佳，但靜態視覺較弱。"
  },
  {
    id: 2,
    scenario: "山徑轉彎處，你突然看見一隻毛茸茸、非常可愛的小熊獨自玩耍。",
    scenarioImages: [
      getUnsplash('1589656966895-2f33e7653819'), // Bear (simulating cub context)
    ],
    successImages: PEACEFUL_FOREST_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '拿出手機拍照上傳 IG', isCorrect: false, feedback: "極度危險！母熊通常就在幾公尺內，且保護慾極強。" },
      { id: 'B', text: '嘗試用食物引誘牠過來', isCorrect: false, feedback: "這是自殺行為。這會讓你成為母熊的直接攻擊目標。" },
      { id: 'C', text: '保持安靜，立刻往原路撤退', isCorrect: true, feedback: "正確。這是山林中最危險的情況之一，必須最快速度遠離。" }
    ],
    explanation: "「有小熊就有母熊」。母熊為了保護幼崽，攻擊性比平常高出數倍。一旦發現幼熊，代表你已經處於紅色警戒區。"
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
      { id: 'A', text: '安靜行走，仔細聆聽熊聲', isCorrect: false, feedback: "安靜行走容易造成「驚嚇相遇」(Surprise Encounter)，這是最危險的。" },
      { id: 'B', text: '製造噪音（掛熊鈴、說話）', isCorrect: true, feedback: "正確。讓熊知道有人類接近，牠們通常會選擇避開。" },
      { id: 'C', text: '播放大聲的重金屬音樂', isCorrect: false, feedback: "不自然的電子噪音可能會讓野生動物感到困惑或被激怒。" }
    ],
    explanation: "大部分的熊攻擊事件源於「驚嚇」。在視線不佳處，務必發出聲音（Hello~ 或使用熊鈴）預警，給熊時間離開。"
  },
  {
    id: 4,
    scenario: "你在森林中聞到腐爛氣味，發現前方土堆下似乎埋著一隻死鹿。",
    scenarioImages: SCARY_FOREST_IMAGES,
    successImages: SAFE_HIKER_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '好奇走近查看是什麼', isCorrect: false, feedback: "危險！這極可能是熊的「食物儲藏堆」。" },
      { id: 'B', text: '立刻離開該區域', isCorrect: true, feedback: "正確。熊會為了保護食物而拼命攻擊任何入侵者。" },
      { id: 'C', text: '站在遠處大聲驅趕', isCorrect: false, feedback: "這會被視為搶奪食物的挑釁行為。" }
    ],
    explanation: "棕熊有將吃剩的獵物用土或樹枝掩埋的習性。如果你靠近這個土堆，熊會認為你是來搶食物的掠食者，攻擊機率極高。"
  },
  {
    id: 5,
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
    explanation: "大多數的衝刺是「虛張聲勢」(Bluff Charge)。堅守陣地並大聲說話（表明身份）是關鍵，千萬不要轉身逃跑觸發獵殺本能。"
  },
  {
    id: 6,
    scenario: "你需要使用防熊噴霧 (Bear Spray)，當時正吹著強風。",
    scenarioImages: [
      getUnsplash('1501555088652-021faa106b9b'), // Hiker gear
    ],
    successImages: SAFE_HIKER_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '不管風向，直接朝熊噴射', isCorrect: false, feedback: "逆風噴射會導致辣椒水吹回自己臉上，讓自己失明。" },
      { id: 'B', text: '稍微移動，確保自己在上風處', isCorrect: true, feedback: "正確。雖然時間緊迫，但必須避免噴霧傷及自己。" },
      { id: 'C', text: '將噴霧向天空噴射', isCorrect: false, feedback: "防熊噴霧比重較重，需直接瞄準熊的臉部與呼吸道。" }
    ],
    explanation: "防熊噴霧是高壓辣椒素雲。使用時務必考慮風向，若不幸處於下風處，應閉氣並在噴射後立刻橫向移動。"
  },
  {
    id: 7,
    scenario: "不幸的情況發生了，熊已經將你撲倒在地進行肢體接觸。",
    scenarioImages: ANGRY_BEAR_IMAGES,
    successImages: SAFE_HIKER_IMAGES,
    failureImages: [
      getUnsplash('1519074069444-1ba4fff66d16'), // Spooky
    ],
    options: [
      { id: 'A', text: '用拳頭猛擊熊的鼻子', isCorrect: false, feedback: "在這種劣勢下反擊，通常只會招致更猛烈的撕咬（除非是黑熊捕食性攻擊）。" },
      { id: 'B', text: '脫掉背包，方便逃脫', isCorrect: false, feedback: "背包能保護你的脊椎免受熊的咬傷與抓傷，千萬別脫。" },
      { id: 'C', text: '抱頭蜷縮（防禦姿態）', isCorrect: true, feedback: "正確。趴下，雙手抱住後頸，雙腳微張保持平衡，用背包保護背部。" }
    ],
    explanation: "這是最後手段。保護最脆弱的頸部與腹部。如果熊停止攻擊，請保持該姿勢不動，直到確定熊已遠離。過早起身會引發二次攻擊。"
  },
  {
    id: 8,
    scenario: "你在北海道自駕遊，看到路邊有一隻熊，後方有車流。",
    scenarioImages: [
      getUnsplash('1550989460-0adf9ea622e2'), // Bear on road context (Fixed)
    ],
    successImages: PEACEFUL_FOREST_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '停車開窗拍照', isCorrect: false, feedback: "這會造成「熊塞車」，且熊可能試圖探入車窗。" },
      { id: 'B', text: '減速慢行，觀察並通過', isCorrect: true, feedback: "正確。不要停車，不要餵食，保持車窗緊閉緩慢通過。" },
      { id: 'C', text: '按喇叭驅趕牠', isCorrect: false, feedback: "可能會驚嚇熊導致牠衝撞車輛或跑向對向車道。" }
    ],
    explanation: "「路邊熊」日益常見。停車拍照會讓熊習慣人類與車輛（人=食物來源），最終導致這隻熊因為不再怕人而被射殺。"
  },
  {
    id: 9,
    scenario: "在有熊出沒的區域露營過夜。食物該怎麼處理？",
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
    explanation: "露營黃金法則「熊三角」：烹飪區、睡眠區、食物儲存區應呈三角形，且彼此相距至少 100 公尺。切勿穿著烹飪時的衣物睡覺。"
  },
  {
    id: 10,
    scenario: "你在登山途中吃剩了一半的便當，最安全的處理方式是？",
    scenarioImages: [
      getUnsplash('1523987355523-c7b5b0dd90a7'), // Food
    ],
    successImages: SAFE_HIKER_IMAGES,
    failureImages: ANGRY_BEAR_IMAGES,
    options: [
      { id: 'A', text: '挖個洞埋起來', isCorrect: false, feedback: "熊的嗅覺比狗靈敏 7 倍，牠們會輕易挖出並習慣人類食物。" },
      { id: 'B', text: '用密封袋裝好，帶下山', isCorrect: true, feedback: "正確。LNT (Leave No Trace) 原則，不留任何氣味。" },
      { id: 'C', text: '丟在遠離步道的草叢', isCorrect: false, feedback: "這會引誘熊靠近步道，害到下一位經過的登山客。" }
    ],
    explanation: "一旦熊嘗過人類食物的味道（高熱量、易取得），牠就會將「人類氣味」與「食物」連結，成為危險的「問題熊」，最終難逃被撲殺的命運。"
  }
];

export const MAP_CENTER_JAPAN: [number, number] = [38.5, 137.0];
export const MAP_ZOOM_LEVEL = 5;
export const ALERT_THRESHOLD_KM = 50; 
export const CRITICAL_DISTANCE_KM = 5;