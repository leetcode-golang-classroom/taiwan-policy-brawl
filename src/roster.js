export const roster=[
  {id:'mech',defense:'旋轉徽章護盾',moveSpeed:5.25,code:'代號 01',name:'AI 推廣者',icon:'🧥',primary:0x3264b4,secondary:0x24385f,accent:0xffb84d,kind:'rush',style:'🧠　🖥️　🏟️　🥛',symbols:'🧠 🖥️ 🏟️ 🥛',basic:'GPU 顯示卡齊射',skill:'巨大 NVIDIA LOGO 衝擊',ult:'鮮奶瓶與巨蛋彈射',bio:'以機械戰士與科技未來感為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'leopard',defense:'芒果乾屏障',moveSpeed:4.8,code:'代號 02',name:'大樹守護者',icon:'🌳',primary:0x477caa,secondary:0x273c58,accent:0x75d6c5,kind:'tactician',style:'🌳　🍃　🌊　🌀',symbols:'🌳 🍃 🌊 🌀',basic:'豹之撲擊',skill:'無限都更・工人施工',ult:'大海奔流',bio:'以豹型森林守護者與叢林力量為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'admiral',defense:'旋轉麻將牆',moveSpeed:4.25,code:'代號 03',name:'麻將大叔',icon:'⚓',primary:0x3b5579,secondary:0x1d2b43,accent:0x69c9e7,kind:'heavy',style:'🀄　🎴　🀙　🏆',symbols:'🀄 🎴 🀙 🏆',basic:'麻將長城推進',skill:'對對胡・三張攻勢',ult:'清一色・十三張飛牌',bio:'以海軍上將與麻將遊戲的混搭為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'mage',defense:'魔法結界',moveSpeed:5.0,code:'代號 04',name:'教育推廣者',icon:'🎓',primary:0x9a5b83,secondary:0x59324f,accent:0xffc4a5,kind:'sonic',style:'🎓　📚　🔤　🪄',symbols:'🎓 📚 🔤 🪄',basic:'誨人不倦・導師聲波',skill:'SoR 書本連續推導',ult:'學海無涯・巨書鎮壓',bio:'以魔法師與書卷魔法為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'cleric',defense:'聖光光環',moveSpeed:4.65,code:'代號 05',name:'神職人員',icon:'✨',primary:0x6466b9,secondary:0x30335f,accent:0x79e6f2,kind:'tech',style:'✨　🪽　👼　🌟',symbols:'✨ 🪽 👼 🌟',basic:'祝禱光束',skill:'神的啟示',ult:'火箭工程',bio:'以神職人員與聖光為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'brawler',defense:'金色肌肉護盾',moveSpeed:5.65,code:'代號 06',name:'健身獎牌肌肉大叔',icon:'🥊',primary:0x9b6244,secondary:0x4d3028,accent:0xffbd69,kind:'athlete',style:'💪　🏅　🥇　🔥',symbols:'💪 🏅 🥇 🔥',basic:'重拳出擊',skill:'風花雪月',ult:'健身獎牌投擲',bio:'以運動競技與肌肉大叔風格為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'nun',defense:'鋼板防禦',moveSpeed:5.05,code:'代號 07',name:'光明使者',icon:'🗺️',primary:0xf6f3ec,secondary:0xcfd8e6,accent:0xffd18b,kind:'planner',style:'🏗️　🚧　⚫　💥',symbols:'🏗️ 🚧 ⚫ 💥',basic:'乾坤大挪移',skill:'電光火球',ult:'神之震怒',bio:'以白衣修女與光明意象為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'yu',defense:'工程防護牆',moveSpeed:4.35,code:'代號 08',name:'工程總指揮',icon:'🏗️',primary:0x55718f,secondary:0x293d54,accent:0xffc56b,kind:'engineer',style:'👷　📐　🔧　🏢',symbols:'👷 📐 🔧 🏢',basic:'乾坤之動',skill:'紫氣東來',ult:'百川匯海',bio:'以大禹治水的文官形象為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'},
  {id:'bubble',defense:'多層泡泡',moveSpeed:4.85,code:'代號 09',name:'家庭計畫推廣員',icon:'📣',primary:0x8a6a9e,secondary:0x443450,accent:0xe8b6dc,kind:'disruptor',style:'👨‍👩‍👧‍👦　🛡️　🌱　📦',symbols:'👨‍👩‍👧‍👦 🛡️ 🌱 📦',basic:'計畫宣導單',skill:'家庭計畫說明會',ult:'節育計畫啟動',bio:'以泡泡與家庭溫馨風格為創作靈感。',source:'虛構設定：角色與招式均為遊戲創作。'}
];

export const rosterById=id=>roster.find(r=>r.id===id);
// Logic-side parameters derived from a roster profile (no rendering data).
export const fighterParams=p=>({charId:p.id,moveSpeed:p.moveSpeed||5,jumpPower:(p.kind==='heavy'||p.kind==='engineer')?7.5:8.2});
