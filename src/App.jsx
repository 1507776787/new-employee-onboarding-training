import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowUp,
  AlertTriangle,
  BookOpenText,
  Camera,
  ChevronDown,
  CircleDotDashed,
  Clapperboard,
  ClipboardCheck,
  Clock3,
  FileText,
  Image,
  Layers3,
  Maximize2,
  MessageSquareText,
  Moon,
  PencilRuler,
  PlaySquare,
  Route,
  Search,
  Sun,
  UserRoundCog,
  UsersRound,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import Aurora from './components/Aurora';
import BorderGlow from './components/BorderGlow';
import imageAssets from './data/imageAssets.json';
import scriptStoryboardWorkflow from './data/scriptStoryboardWorkflow.json';
import sd2Workflow from './data/sd2Workflow.json';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const inlineLinks = new Map([
  ['www.ciyuanshenbi.com', 'https://www.ciyuanshenbi.com/'],
  ['apimart.ai', 'https://apimart.ai/'],
]);
const inlineLinkPattern = /(https?:\/\/[^\s)）]+|www\.ciyuanshenbi\.com|apimart\.ai)/g;

const phases = [
  {
    number: '01',
    title: '剧本精读',
    desc: '先理清本集人设、场景、道具和上下集衔接。',
    icon: BookOpenText,
    status: '当前准备',
  },
  {
    number: '02',
    title: '人设、场景和道具',
    desc: '按编导拆分描述制作三版，审核通过后留稿。',
    icon: UserRoundCog,
    status: '制作方法',
  },
  {
    number: '03',
    title: '剧本转分镜',
    desc: '拆出镜号、动作、景别、转场和提示词。',
    icon: Clapperboard,
    status: '核心流程',
  },
  {
    number: '04',
    title: '操作指南&注意事项',
    desc: '集中查看关键词优化、分镜提示词、素材衔接、常见问题和配音处理注意事项。',
    icon: WandSparkles,
    status: '指南&避坑',
  },
];

const assetMethodSections = sd2Workflow.sections.filter((section) =>
  ['1.人物换装', '2.写实场景', '3.道具（系统）'].includes(section.title),
);
const keywordOptimizationSection = sd2Workflow.sections.find((section) =>
  section.title.includes('剧集制作关键词优化'),
);
const voiceIssueSection = sd2Workflow.sections.find((section) => section.title.startsWith('6.配音错乱'));

const cleanNavTitle = (title) =>
  title
    .replace(/^\d+\./, '')
    .replace(/^实际操作[—-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

const isMicrosoftEdge = () =>
  typeof navigator !== 'undefined' && /\bEdg\//.test(navigator.userAgent);

const ACCESS_CODE_HASH =
  import.meta.env.VITE_ACCESS_CODE_HASH || 'dfea2868a5a060839c502d91d71a0e802723c39abc460d71f82e6bd27701e852';
const ACCESS_SESSION_KEY = 'training-access-until';
const ACCESS_SESSION_DURATION = 4 * 60 * 60 * 1000;

const watermarkTiles = Array.from({ length: 360 }, (_, index) => index);

const formatWatermarkTime = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}`;
};

const hasValidAccessSession = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return Number(window.localStorage.getItem(ACCESS_SESSION_KEY)) > Date.now();
  } catch (error) {
    return false;
  }
};

const saveAccessSession = () => {
  try {
    window.localStorage.setItem(ACCESS_SESSION_KEY, String(Date.now() + ACCESS_SESSION_DURATION));
  } catch (error) {
    // The current page session can continue even if storage is blocked.
  }
};

const hashAccessCode = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const workflowNavItems = (sections, idPrefix, includeSubsections = true) =>
  sections.map((section, sectionIndex) => {
    const sectionId = `${idPrefix}-section-${sectionIndex + 1}`;
    const children = includeSubsections
      ? section.blocks
          .map((block, blockIndex) => {
            if (block.type !== 'subsection' || block.hideTitle) {
              return null;
            }

            return {
              id: `${sectionId}-block-${blockIndex + 1}`,
              title: cleanNavTitle([block.kicker, block.title].filter(Boolean).join(' ')),
            };
          })
          .filter(Boolean)
      : [];

    return {
      id: sectionId,
      title: cleanNavTitle(section.title),
      children,
    };
  });

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '');

const fuzzyIncludes = (text, query) => {
  let cursor = 0;

  for (const char of query) {
    cursor = text.indexOf(char, cursor);

    if (cursor === -1) {
      return false;
    }

    cursor += 1;
  }

  return true;
};

const getSearchScore = (item, query) => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return null;
  }

  const title = normalizeSearchText(item.title);
  const path = normalizeSearchText(item.path);
  const content = normalizeSearchText(item.content);

  if (title.includes(normalizedQuery)) {
    return title.indexOf(normalizedQuery);
  }

  if (path.includes(normalizedQuery)) {
    return 30 + path.indexOf(normalizedQuery);
  }

  if (content.includes(normalizedQuery)) {
    return 80 + content.indexOf(normalizedQuery);
  }

  if (fuzzyIncludes(title, normalizedQuery)) {
    return 140;
  }

  if (fuzzyIncludes(path, normalizedQuery) || fuzzyIncludes(content, normalizedQuery)) {
    return 220;
  }

  return null;
};

const collectNavSearchItems = (items, parentTitle = '') =>
  items.flatMap((item) => {
    const path = [parentTitle, item.title].filter(Boolean).join(' / ');
    const current = {
      content: item.desc || item.status || '',
      id: item.id || `phase-${item.number}`,
      path,
      title: item.title,
    };

    return [current, ...collectNavSearchItems(item.children || [], path)];
  });

const scrollToAnchor = (anchorId) => {
  if (typeof document === 'undefined') {
    return;
  }

  const target = document.getElementById(anchorId) || document.querySelector('.app-shell');

  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const phaseNavItems = [
  {
    ...phases[0],
    children: [
      { id: 'phase-01-checklist', title: '动画制作前核对记录' },
      { id: 'phase-01-alert', title: '审核提醒' },
    ],
  },
  {
    ...phases[1],
    children: [
      ...workflowNavItems(assetMethodSections, 'phase-02-methods', false),
    ],
  },
  {
    ...phases[2],
    children: workflowNavItems(scriptStoryboardWorkflow.sections, 'phase-03-workflow'),
  },
  {
    ...phases[3],
    children: [
      ...workflowNavItems(keywordOptimizationSection ? [keywordOptimizationSection] : [], 'phase-04-keywords'),
      { id: 'phase-04-storyboard-format', title: '分镜表样式' },
      { id: 'phase-04-reference', title: '图片教学参考' },
      { id: 'phase-04-cinematography-guide', title: '摄影参数与画面风格' },
      { id: 'phase-04-lighting-guide', title: 'AI 视频打光提示词' },
      { id: 'phase-04-reconstruction-guide', title: '低清图片高清重构' },
      { id: 'phase-04-arrow-camera', title: '箭头引导线运镜' },
      { id: 'phase-04-continuity-guide', title: '片段衔接修复' },
      { id: 'phase-04-background-unity', title: '背景统一方法' },
      { id: 'phase-04-notices', title: '常见问题' },
      ...workflowNavItems(voiceIssueSection ? [voiceIssueSection] : [], 'phase-04-voice'),
    ],
  },
];

const storyboardExample = {
  intro:
    '生成一段流畅的真人写实风格动画，新中式古典权谋剧风格，ARRI Alexa Mini LF摄影，搭配Cooke S7/i Full Frame镜头，8K分辨率。打光写实，高对比度，自然光与斑驳光影交织，皮肤质感真实，电影色调，真人实拍摄、纪录片风格、轻微胶片颗粒，film grain(胶片颗粒).Noise(噪点).Raw photo(原片),Skin texture (皮肤纹理)，Pores(毛孔) Fine wrinkles(细纹)。画面中不出现字幕，不出现文字，不出现背景音乐和音效。全片以低饱和青绿与暖金交织的古典清冷色调进行。',
  meta: [
    {
      label: '地点',
      value: '池畔凉亭图1（仅做站位关系和环境参考，并不出现在画面中）',
    },
    {
      label: '时间',
      value: '日/外',
    },
    {
      label: '人物',
      value:
        '康安安图2、康安安声音参考这个♪♪音频1、王稽昭图3、谢子璎图4、谢子璎声音参考这个♪♪音频2、程九图5',
    },
    {
      label: '视觉基调',
      value:
        '精致唯美，利用凉亭飞檐与木雕做前景框架构图，碧水假山为衬，阳光透过繁茂枝叶洒落，光影斑驳。',
    },
  ],
  shots: [
    {
      number: '1',
      framing: '全景/建立镜头',
      camera: '手持缓慢平移',
      action:
        '透过凉亭飞檐与镂空木雕做前景框架，交代环境——碧水池塘波光粼粼，池边假山石栏错落，远处白墙黑瓦掩映，四周绿树繁茂，阳光透过枝叶洒落斑驳光影。王稽昭端坐亭内木椅，程九站在王稽昭身后，谢子璎坐王稽昭对面，康安安面无表情站立案前，自然风吹动裙摆。',
      dialogue: '无',
      sound: '微风吹过树叶声、远处鸟鸣、隐约流水声',
      duration: '3s',
    },
    {
      number: '2',
      framing: '近景/谢子璎',
      camera: '手持微晃',
      action:
        '枝叶间漏下的碎光落在谢子璎略显局促的脸上，他抱拳致歉，眼神不敢直视安安，看向地面。',
      dialogue:
        '谢子璎：声音变轻带歉意，语速变慢，在“家人”后停顿，在“冒犯”加重，尾音放柔下压地说：【方才我远远一瞥，以为姑娘是一位已故多时的家人，这才多有冒犯......望姑娘海涵。】',
      sound: '无',
      duration: '4s',
    },
    {
      number: '3',
      framing: '过肩镜头/康安安看王稽昭',
      camera: '焦点从康安安侧脸转换到王稽昭',
      action: '康安安斜眼扫过王稽昭，见他从容品茶，毫无反应。亭外池水映射的微光与茶汤热气氤氲交织。',
      dialogue: '无',
      sound: '轻微茶盏碰撞声',
      duration: '2s',
    },
    {
      number: '4',
      framing: '近景/康安安',
      camera: '手持',
      action: '康安安敷衍地点头回应画外的谢子璎，眼神疏离。',
      dialogue: '康安安：声音平淡放轻，语速慢，在第一个“无妨”后停顿，尾音下压毫无波澜地说：【无妨。无妨。】',
      sound: '无',
      duration: '2s',
    },
  ],
};

const arrowCameraMethod = {
  source: '参考来源：抖音作者“小绿”，用于内部学习参考。',
  intro:
    '通过在参考图上绘制红色箭头引导线，可以更精准地控制 AI 视频的镜头运动路径。它不只适合风景航拍，也可以用于多人物展示、建筑穿梭、微观视角推进等需要明确镜头路线的画面。',
  steps: [
    '准备一张构图清晰的参考图，先确定镜头从哪里进入、经过哪里、最后停在哪里。',
    '在图上画出醒目的红色路线或箭头，尽量保持连续，明确起点、转弯点和终点。',
    '把标注后的图片作为参考图上传给模型，并在提示词中说明镜头必须严格跟随红色轨迹运动。',
    '提示词里一定补充：红线只作为运镜参考，最终成片必须删除所有红色引导线和手绘标记。',
    '如果路线很复杂，不要一次塞进一个视频，可以拆成 2-3 段分别生成，再用剪辑衔接。',
  ],
  useCases: [
    {
      title: '城市/风景航拍',
      effect: '控制低空掠过、抬升、俯冲、穿越、环绕等镜头路径，让航拍不再随机漂移。',
    },
    {
      title: '建筑穿梭/FPV',
      effect: '让镜头按指定路线穿过门洞、桥梁、楼宇缝隙或街道，适合一镜到底式视觉冲击。',
    },
    {
      title: '多人物展示',
      effect: '用路线规定镜头先看角色 A，再转向角色 B、角色 C，避免模型随意切换主体。',
    },
    {
      title: '微观视角展示',
      effect: '适合从物体表面、植物、机械结构或特效粒子间推进，增强探索感和空间纵深。',
    },
  ],
  promptBlocks: [
    {
      title: '基础运镜提示词',
      text:
        '第一人称 FPV 穿越航拍镜头，电影级极速一镜到底，镜头严格跟随画面中的红色轨迹飞行，完整走完路线，不缩短、不改动轨迹方向。\n\n硬性强制要求：最终成片必须彻底删除画面内所有红色引导线条、手绘标记，画面完全还原原图风景。红线全程不可出现在成品视频里，红线仅作为 AI 运镜参考，渲染时自动抹除。',
    },
    {
      title: '飞行顺序示例',
      text:
        '飞行顺序：从江面船舶低空掠水起飞，沿江岸楼宇缝隙穿行，抬升高度钻过城市地标与高楼群，飞越 CBD 天际线，镜头惯性冲向画面右侧远处城区收尾。',
    },
    {
      title: '质感补充提示词',
      text:
        '画面氛围：保留原图黄昏落日暖黄色光效，江面有金色反光，远处有薄雾，建筑、船只、树木造型写实无扭曲变形，自然动态运动模糊，超写实城市航拍质感，4K，60fps，无水印，无多余线条。',
    },
  ],
  tips: [
    '红色路线不要画得太乱，线条越明确，模型越容易理解镜头方向。',
    '连续曲线比多个断开的箭头更稳定，复杂路线可以分段生成。',
    '这套方法主要解决镜头路线问题，不负责解决人物脸部一致性，人物一致性仍要靠人设图和垫图。',
    '用于多人画面时，可以把路线设计成“先经过谁、再推向谁、最后停在谁”的顺序。',
  ],
  images: [
    '/operation-assets/arrow-camera-01.webp',
    '/operation-assets/arrow-camera-02.webp',
    '/operation-assets/arrow-camera-03.webp',
    '/operation-assets/arrow-camera-04.webp',
    '/operation-assets/arrow-camera-05.webp',
  ],
};

const cinematographyGuide = {
  intro:
    '这组参考图把摄影参数、镜头语言和画面风格拆成可直接写进 AI 视频提示词的关键词。写提示词时不要只说“电影感”，要明确光圈、焦段、距离、构图、机位、快门、光线和色调，这些信息会直接影响景深、空间压缩、人物气势、动作速度和整体质感。',
  rules: [
    '想突出人物情绪，用大光圈、长焦、近距离、浅景深；想交代世界观，用小光圈、广角、远距离、大景深。',
    '镜头语言要和剧情功能匹配：低机位表现压迫与权威，高机位表现俯视和渺小，中机位保持客观叙事。',
    '风格词不要堆太多，一次选 1 个主风格，再补 1-2 个辅助质感，例如真人写实 + 冷暖对比色 + 伦勃朗光。',
    '动作镜头需要写快门/运动模糊，静态情绪镜头需要写光线方向、焦段和景深。',
  ],
  items: [
    {
      title: '01 光圈控制景深',
      image: '/operation-assets/cinematography-guide-01.jpg',
      summary:
        'f/16 背景和人物都清楚，适合交代场景；f/5.6 开始分离主体；f/1.2 背景大幅虚化，适合情绪特写和人物高光。',
      prompt: '85mm 中长焦，f/1.8 大光圈，浅景深，人物面部清晰，背景城墙和旗帜柔和虚化，电影级人物特写',
    },
    {
      title: '02 焦段决定空间关系',
      image: '/operation-assets/cinematography-guide-02.jpg',
      summary:
        '14mm/24mm 适合宏大场景和空间冲击；50mm 更自然；85mm/200mm 会压缩背景、突出人物，适合权谋、凝视和压迫感。',
      prompt: '24mm 广角史诗全景，城墙、军阵和远山同时进入画面；切换 85mm 中长焦人物半身，背景压缩虚化，主体气场强',
    },
    {
      title: '03 拍摄距离决定景别',
      image: '/operation-assets/cinematography-guide-03.jpg',
      summary:
        '0.5m 是极近特写，适合眼神和伤痕；1-2m 适合头肩和半身；5-15m 适合全身、环境和战争氛围。',
      prompt: '镜头距离人物 1 米，正面头肩近景，眼神锐利；随后拉到 5 米全身镜头，荒凉战场和山脉完整出现',
    },
    {
      title: '04 黄金点构图',
      image: '/operation-assets/cinematography-guide-04.jpg',
      summary:
        '把人物或关键道具放在左上、右上、左下、右下黄金点，可以让画面更稳定，也能给远景、天空、建筑或动作方向留空间。',
      prompt: '三分法构图，人物站在左上黄金点，右侧留出云海和远山空间，画面空灵辽阔，人物剪影突出',
    },
    {
      title: '05 电影摄影风格比较',
      image: '/operation-assets/cinematography-guide-05.jpg',
      summary:
        '冷色科幻适合异象、压迫和未知；现实主义悬疑适合战争废墟和阴谋；经典叙事光影适合史诗感、希望感和情绪收束。',
      prompt: '维伦纽瓦式沉浸冷色调科幻风格，低饱和青蓝色，远处巨龙压迫感，超宽画幅，人物背影凝视城市',
    },
    {
      title: '06 对称、暴力复古与手绘幻想',
      image: '/operation-assets/cinematography-guide-06.jpg',
      summary:
        '韦斯安德森式对称适合秩序感和荒诞感；昆汀式复古适合暴力、血迹和强戏剧；宫崎骏/吉卜力式适合温暖幻想和手绘质感。',
      prompt: '昆汀式暴力美学与复古风格，低角度近景，墙面血迹、暖黄硬光、人物表情狠厉，画面粗粝有张力',
    },
    {
      title: '07 高、中、低机位',
      image: '/operation-assets/cinematography-guide-07.jpg',
      summary:
        '高机位让人物显得被局势包围；中机位稳定客观；低机位会放大人物气势，适合君主、反派、觉醒和胜利瞬间。',
      prompt: '低机位仰拍，人物站在城墙前，肩甲和面部形成强压迫感，天空占据大面积背景，史诗英雄登场',
    },
    {
      title: '08 朋克风格方向',
      image: '/operation-assets/cinematography-guide-08.jpg',
      summary:
        '赛博朋克强调霓虹、雨夜和未来都市；原子朋克偏复古未来和明亮科技；蒸汽朋克适合齿轮、飞艇、铜管、工业烟雾。',
      prompt: '赛博朋克夜景，蓝紫霓虹灯牌、雨后湿润街道、全息广告牌，古代将军穿科技盔甲，冷色高反差电影质感',
    },
    {
      title: '09 写实、CG、3D 与 2D 动漫',
      image: '/operation-assets/cinematography-guide-09.jpg',
      summary:
        '真人写实更适合短剧成片；CG 风格更干净、广告感强；3D 动漫偏游戏宣传片；2D 动漫更扁平，适合漫画化表达。',
      prompt: '真人写实风格，真实皮肤纹理、盔甲金属磨损、自然风吹头发，电影镜头光影，不要 3D 动漫感，不要二次元线条',
    },
    {
      title: '10 快门与运动模糊',
      image: '/operation-assets/cinematography-guide-10.jpg',
      summary:
        '1/1000s 能冻结动作；1/125s 有自然速度感；1/60s 以下会形成明显拖影，适合冲刺、战斗、马匹奔袭和混乱感。',
      prompt: '骑马冲锋动作镜头，1/125s 快门速度，自然运动模糊，泥土飞溅，披风高速飘动，镜头横向跟拍',
    },
    {
      title: '11 光线方向与人物气质',
      image: '/operation-assets/cinematography-guide-11.jpg',
      summary:
        '点光会集中强调面部；顺光清楚但较平；逆光制造轮廓和神秘感；伦勃朗光适合权谋、暗场、复杂内心和高级人物肖像。',
      prompt: '伦勃朗光，人物一侧脸被暖光照亮，另一侧保留深阴影，背景战火虚化，人物眼神冷静压迫，暗调电影质感',
    },
    {
      title: '12 色调控制情绪',
      image: '/operation-assets/cinematography-guide-12.jpg',
      summary:
        '冷色调偏孤独、危险、理性；暖色调偏希望、史诗和回忆；冷暖对比可以同时保留宏大光感和人物冷峻情绪。',
      prompt: '冷暖对比色，远处天空暖金色夕阳，人物盔甲和城墙保持冷青色阴影，画面有史诗感和压迫感',
    },
  ],
  examplePrompt:
    '真人写实古装战争短剧，24mm 广角建立城墙和军阵，随后切 85mm 中长焦人物半身特写，f/2.0 浅景深，低机位仰拍，人物位于左上黄金点，伦勃朗光，冷暖对比色，盔甲金属磨损真实，背景旗帜轻微虚化，1/125s 自然运动模糊，电影级质感。',
};

const imageReconstructionGuide = {
  intro:
    '这套方法不是直接把低清图放大，而是先把原图拆成线稿、色稿和反推提示词，再用三者共同约束高清重构。线稿负责结构，色稿负责颜色，反推提示词负责材质、风格、光影和氛围。适用于不清晰、低分辨率、压缩失真、细节涂抹、边缘不清或需要二次修复的图片，不局限于道具、盔甲、建筑纹样。',
  steps: [
    {
      title: '01 提取线稿图',
      image: '/operation-assets/reconstruction-guide-01.jpg',
      summary:
        '先让 AI 把原图转成专业黑白线稿，提取主体轮廓、内部结构和主要花纹。这个步骤解决的是“边缘糊、结构乱、花纹缺失”的问题。',
      prompt:
        '把原图转化为专业级黑白线稿图。要求用清晰、流畅、闭合的黑色线条准确提取主体轮廓、内部结构和主要花纹，修复模糊、缺失和不合理的细节，确保整体结构完整、层次清楚。背景纯白，去除颜色、灰度、阴影、纹理和杂色，只保留干净明确的线稿关系。高清图像，最佳品质。',
    },
    {
      title: '02 提取色稿图',
      image: '/operation-assets/reconstruction-guide-02.jpg',
      summary:
        '再从原图里提取标准色稿，只保留主色、副色、点缀色和色彩分区。这个步骤用于锁定颜色逻辑，避免后续高清重构时颜色跑偏。',
      prompt:
        '把原图转化为标准色稿图。要求保留主体结构和主要区域关系，用清晰、均匀的扁平色块准确提取主色、副色和点缀色，明确画面的色彩分区。去除复杂光影、渐变、纹理和杂色，只保留干净、易读的色彩关系。高清图像，最佳品质。',
    },
    {
      title: '03 反推图片提示词',
      image: '/operation-assets/reconstruction-guide-03.jpg',
      summary:
        '让 AI 对原图进行逆向视觉解构，输出一段可以直接用于图像生成的中文提示词。这里重点是主体、构图、材质、细节、光影、背景、色彩和氛围都要写完整。',
      prompt:
        '请对原图进行逆向视觉解构，分析其主体、构图、风格、材质、细节、光影、背景、色彩和氛围，并输出一段可直接用于图像生成的专业中文提示词。要求提示词完整、准确、可复用，能够尽可能还原原图的视觉效果与风格特征。直接输出最终提示词，不要解释。',
      example:
        '示例方向：高清中国古代盔甲局部特写，特写视角聚焦于肩部护具。盔甲主体由富丽的橙黄色或金色织物制成，表面有复杂银色刺绣、盘扣和镂空银质饰片。肩部顶端镶嵌立体银质兽首，兽首嘴部和两侧垂挂白色珍珠流苏。下方是多层暗青铜色做旧金属鳞甲片，边缘锋利整齐。背景为干净纯白色，光影柔和均匀，突出银、织物、青铜、珍珠等材质对比。',
    },
    {
      title: '04 线稿 + 色稿 + 提示词高清重构',
      image: '/operation-assets/reconstruction-guide-04.jpg',
      summary:
        '最终把第 1 步线稿、第 2 步色稿和第 3 步反推提示词一起输入。线稿管结构，色稿管颜色，反推提示词管质感和氛围。',
      prompt:
        '请以图1的线稿结构为准，以图2的色稿颜色为准，对原图进行高清重构。要求保留原有主体构图、色彩逻辑和整体风格，在此基础上强化轮廓、内部结构、主要花纹、材质质感和细节层次，修复模糊、涂抹、边缘不清和细节缺失等问题，提升整体清晰度、完成度和真实感。背景保持简洁干净，不添加无关元素。输出高清、锐利、细节完整的高质量图像，最佳品质。\n\n图片提示词：\n【这里粘贴第 03 步反推出来的完整提示词】',
    },
    {
      title: '05 备忘录：线稿与色稿提示词',
      image: '/operation-assets/reconstruction-guide-05.jpg',
      summary:
        '把线稿提示词和色稿提示词固定存到备忘录里，后续遇到低清、不清晰、细节缺失或需要保留结构和颜色的图片，可以直接复用。先线稿、后色稿，不要跳过前两步直接高清化。',
      prompt:
        '固定顺序：\n1. 先提取线稿提示词，得到结构清晰的黑白线稿。\n2. 再提取色稿提示词，得到干净、易读、分区明确的扁平色稿。\n\n注意：线稿不要保留颜色和阴影；色稿不要保留复杂光影、渐变、纹理和杂色。',
    },
    {
      title: '06 备忘录：反推与重构提示词',
      image: '/operation-assets/reconstruction-guide-06.jpg',
      summary:
        '把图片反推提示词和高清重构提示词也固定存好。真正生成时，先让 AI 反推出原图提示词，再把这段反推结果粘贴到高清重构提示词结尾。',
      prompt:
        '固定顺序：\n1. 用图片反推提示词得到原图的主体、构图、材质、光影、色彩和氛围描述。\n2. 用高清重构提示词合并图1线稿、图2色稿和反推提示词。\n3. 在“图片提示词：”后面粘贴第 1 步反推出来的完整结果。\n\n注意：最终重构时要强调保留主体构图、色彩逻辑和整体风格，不添加无关元素。',
    },
  ],
};

const lightingPromptGuide = {
  title: 'AI 视频打光提示词',
  icon: Sun,
  intro:
    '在写 AI 视频提示词时，不要只描述人物、服装、场景和动作，还要明确写出光线。光线不是单纯把画面照亮，而是用来决定观众先看哪里、人物和背景是否分离、画面有没有电影感，以及当前镜头要传递什么情绪。',
  points: [
    '提示词不要只写“高清、电影感、氛围感”，要明确光线方向、强弱、明暗关系和情绪效果。',
    '光线描述可以放在“整体视觉基调”或“镜头画面”后面，和景别、运镜、人物情绪一起写。',
  ],
  guides: [
    {
      title: '01 侧逆光',
      suit: '古风短剧、漫剧、氛围感强的情绪镜头。',
      effect: '让人物和背景分开，在头发、肩膀、身体边缘形成轮廓光，增强画面电影感和层次感。',
      prompt:
        '侧逆光，人物头发和肩膀边缘有柔和轮廓光，人物与背景明显分离，画面具有电影感和氛围感',
    },
    {
      title: '02 轮廓光',
      suit: '暗色背景、人物登场、神秘感、压迫感镜头。',
      effect: '强调人物边缘线条，让人物从暗背景中跳出来，增强高级感和视觉识别度。',
      prompt:
        '人物边缘有明显轮廓光，暗色背景，身体外沿被光线勾勒，人物主体突出，画面层次清晰',
    },
    {
      title: '03 侧光',
      suit: '情绪对峙、人物内心变化、悬疑感镜头。',
      effect: '塑造脸部明暗对比，增加戏剧张力，让人物表情更有层次。',
      prompt:
        '侧光照明，人物脸部一侧被照亮，另一侧保持阴影，明暗对比明显，情绪张力强',
    },
    {
      title: '04 硬光',
      suit: '商业广告、品牌感镜头、强视觉冲击画面。',
      effect: '光影边缘清晰，画面更利落、更有质感，适合表现高级、冷峻、强风格化视觉。',
      prompt:
        '硬光照明，光影边缘清晰，人物面部和场景形成明确明暗块面，画面干净利落，商业广告质感',
    },
    {
      title: '05 低角度光',
      suit: '恐怖、奇幻、人物觉醒、反派压迫感镜头。',
      effect:
        '光线从人物下方向上照，制造不安、神秘、强压迫感；但光源不能太亮，否则容易变成“手电筒照脸”的廉价效果。',
      prompt:
        '低角度光从人物下方向上照射，制造神秘感和压迫感，光线克制不过曝，避免手电筒照脸效果',
    },
  ],
  usageTips: [
    '每个分镜提示词里，可以在“整体视觉基调”或“镜头画面”后面补充光线描述。',
    '不要只写“高清、电影感、氛围感”，而是要具体写出光线方向、强弱、明暗关系和情绪效果。',
    '同一场戏的光线要尽量统一，除非剧情进入闪回、反转、压迫或觉醒等特殊情绪段落。',
  ],
  examplePrompt:
    '夜晚室内，侧逆光从人物后方打来，头发和肩膀形成柔和轮廓光，脸部保留轻微阴影，人物与背景分离，画面有电影感和悬疑氛围。',
};

const clipContinuityGuide = {
  source: '整理自 Seedance 2.0 素材衔接口播方法，适合处理两段 15 秒视频之间的跳变、穿帮和动作断层。',
  intro:
    '前后片段衔接不顺时，不要只靠反复抽卡。先判断问题是首尾帧不连贯、细节对不上、动作节奏断掉，还是提示词没有承接上一段，再选择对应处理方式。',
  methods: [
    {
      title: '01 首尾帧锁定',
      scene: '两段素材主体、背景或动作方向基本正确，但中间缺少自然过渡。',
      action:
        '截取第一段视频最后一帧，再截取第二段视频第一帧，把两张图作为参考，单独生成一个约 5 秒的衔接短片。',
      effect:
        '让 AI 在两张固定画面之间计算运动轨迹，用较低成本补出过渡段，避免反复重抽 15 秒长视频。',
      prompt:
        '以图1作为开头画面，以图2作为结尾画面，生成一段 5 秒自然过渡视频。人物、服饰、场景和光影保持一致，镜头运动平滑，动作连贯，不出现跳变和穿帮。',
    },
    {
      title: '02 动态障眼法',
      scene: '两段素材细节对不上，静态硬接会明显露馅。',
      action:
        '不要使用平移或静态衔接，在提示词中强制加入大幅度镜头运动，例如急速推进、甩镜、角色大幅转身。',
      effect:
        '高速运动会降低观众对细节偏差的感知，让衔接处的小位移、小穿帮不那么明显。',
      prompt:
        '衔接处使用大幅度镜头运动，急速推进后接甩镜转场，人物顺势转身进入下一动作，运动模糊自然，节奏利落，遮盖画面细节跳变。',
    },
    {
      title: '03 重叠叠化法',
      scene: '需要把两段视频剪成更长片段，但动作节奏容易断。',
      action:
        '生成第二段时，把起始点往前挪 2 秒左右，从第一段末尾动作开始同步生成；剪辑时把这 2 秒重叠部分做叠化或交叉溶解。',
      effect:
        '用重叠素材抵消 AI 随机变化，让动作和画面在视觉上更顺滑。',
      prompt:
        '第二段开头延续上一段最后 2 秒的动作和站位，保持人物方向、服饰、光影和环境一致，再自然进入新动作。',
    },
    {
      title: '04 提示词承接法',
      scene: '第二段一上来就变成新动作，导致人物状态和动作逻辑断掉。',
      action:
        '第二段提示词开头不要直接写新动作，先写上一段末尾动作的延续，再逐渐转入下一动作。',
      effect:
        '给模型一个动作惯性，减少前后片段之间的逻辑断层。',
      prompt:
        '开头延续上一段末尾动作：人物保持跑步惯性并逐渐减速，身体重心自然前移，随后抬头看向前方并进入新的表情和动作。',
    },
  ],
  reminder: {
    title: '额外提醒：音乐后期统一加',
    points: [
      '写 Seedance 2.0 提示词时，可以明确要求生成配音和环境音效，但要强调不要生成音乐。',
      '每段 15 秒视频的音乐都是单独生成的，即使提示词写同一段音乐，后期也很难完全对齐。',
      '只要配音和环境音效是对的，即使局部画面失败，也可以在剪辑里删掉问题画面，保留可用声音。',
      '背景音乐建议放到剪辑软件里统一添加，整体节奏和情绪会更稳定。',
    ],
  },
};

const backgroundUnityGuide = {
  image: '/operation-assets/background-unification-method.jpg',
  intro:
    '当前后视频需要保持同一空间、同一背景、同一人物站位关系时，可以先抽取上一段视频中最有代表性的关键帧，把它处理成“白膜站位参考图”，再作为下一段生成的空间关系参考。',
  steps: [
    '从上一段视频中截取一张最有代表性的关键帧，优先选择能看清两人位置关系、空间方向和背景环境的画面。',
    '把关键帧交给 Banana 模型或同类图像模型处理，明确要求：将画面中的人物转成白膜，背景保持不变。',
    '把处理后的白膜图作为站位关系参考图放入视频生成模型，用来锁定人物之间的位置、镜头方向和背景空间。',
    '在提示词里明确写清楚：该图仅作为站位关系参考，不要出现在最终画面中，视频中不要出现白膜、白色模型或脏污质感。',
    '后续镜头提示词里不要再给与参考图完全相同的景别、视角描述，避免模型直接复刻白膜参考画面。',
  ],
  promptRules: [
    '地点要绑定背景参考图，例如：地点：豪宅-客房 图3。',
    '站位参考图要写清用途，例如：图4 仅做站位关系参考，视频中并不出现。',
    '画面限制建议固定写入：画面中不出现字幕、不出现文字、不出现背景音乐和音效。',
    '如果剧本文字时长和平台输出时长冲突，生成时以网页/平台视频输出设置为准，可在提示词里写：请忽略剧本里的时长设定。',
  ],
  prompt:
    '图3作为背景环境参考，保持豪宅客房的空间结构、光影和色调不变。图4仅作为人物站位关系参考，视频中不要出现图4的白膜、白色模型或参考图痕迹。请根据人物人设图生成真实人物，保持人物位置关系、镜头方向和背景统一，画面干净真实，不出现字幕、文字、背景音乐和音效。',
};

const seedanceNotices = [
  {
    title: '时长与台词密度',
    icon: Clock3,
    points: [
      '单个镜头建议控制在 3-5 秒，15 秒视频镜头数不超过 6 个。',
      '一段视频尽量只放 2-3 句台词或描述，超过 3 句容易切换过快、吞字或台词重叠。',
      '每段视频对应文本 30-50 字最理想，超过 70 字容易超时或节奏失控。',
    ],
  },
  {
    title: '分镜拆分节奏',
    icon: Clapperboard,
    points: [
      '不要为了填满时长强行加台词，高光动作或情绪爆发点可以单独生成 15 秒。',
      '完整动作不要拆到两个视频里，例如出招、击中、反应至少留足 3-5 秒。',
      '连续 3 句以上台词在同一场景内，可以插入聆听者反应镜头或环境暗示镜头。',
    ],
  },
  {
    title: '角色与站位控制',
    icon: UsersRound,
    points: [
      '单个镜头内角色数不超过 3 个，减少多人镜头比例。',
      '角色参考图不超过 3 个，无台词、无动作的次要角色尽量不提供参考图，避免 AI 混淆。',
      '前后视频要保持人物站位高度一致，可截取上一段结尾画面作为下一段参考图。',
    ],
  },
  {
    title: '提示词写法',
    icon: WandSparkles,
    points: [
      '提示词包含场景描述、氛围环境、人物表情动作、人物参考图、镜头描述和台词。',
      '明确加入保持站位一致、服饰统一、不要穿帮、不要出现文字字幕水印等限制。',
      '提示词不宜过于复杂，尽量少写具体秒数，开头视频可人工多次调试形成稳定格式。',
    ],
  },
  {
    title: '衔接补救方法',
    icon: Route,
    points: [
      '前后镜头衔接不上时，不要急着整段重做，可以插入手部、道具或环境特写片段。',
      '站位复杂或需要连续动作的镜头，尽量放在同一段 15 秒视频里统一生成。',
      '两段需要无缝接续时，可导出上一段最后一帧，用垫图方式继续生成下一段。',
    ],
  },
  {
    title: '镜头语言避坑',
    icon: Camera,
    points: [
      '避免全程单一镜头，远景、全景、中景、特写要穿插使用。',
      '不要连续使用人物正面面部特写，2 分钟左右视频里纯正面镜头最多保留 3 个。',
      '对话时优先使用侧拍、过肩、聆听角色切换和环境镜头，避免画面像舞台剧或监控录像。',
    ],
  },
  {
    title: '特效与质感',
    icon: Zap,
    points: [
      '不要被剧本文字限制，实体化特效可改成水墨、半透明、粒子、发光等更有质感的表现。',
      '复杂特效先单独生成特效参考图，再作为垫图喂给 Seedance 2.0。',
      '检查特效是否匹配角色动作、颜色是否与场景形成反差，并至少保留一个细节特写镜头。',
    ],
  },
];

function useTrainingMotion(rootRef, isEnabled = true) {
  useEffect(() => {
    const root = rootRef.current;

    if (!isEnabled || !root || typeof window === 'undefined') {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCompactViewport = window.matchMedia('(max-width: 900px)').matches;

    if (reducedMotion || isCompactViewport) {
      root.querySelector('.opening-sequence')?.setAttribute('data-motion-hidden', 'true');
      return undefined;
    }

    let openingFrame = 0;
    let refreshCall;
    const isEdge = isMicrosoftEdge();
    const allowImageParallax = !isEdge && window.matchMedia('(min-width: 900px)').matches;

    const context = gsap.context(() => {
        const select = gsap.utils.selector(root);
        const openingSequence = select('.opening-sequence');

        gsap.defaults({
          ease: 'power4.out',
          overwrite: 'auto',
        });

        gsap.set(select('.top-bar'), { autoAlpha: 0, yPercent: -100 });
        gsap.set(select('.side-panel'), {
          autoAlpha: 0,
          ...(isEdge ? {} : { filter: 'blur(14px)' }),
          x: -72,
        });
        gsap.set(select('.overview-band'), {
          autoAlpha: 0,
          clipPath: 'inset(18% 0% 18% 0% round 8px)',
          scale: 0.94,
          y: 110,
        });
        gsap.set(select('.overview-copy .eyebrow'), { autoAlpha: 0, y: 32 });
        gsap.set(select('.overview-copy h2'), {
          autoAlpha: 1,
          clipPath: 'inset(0% 100% 0% 0%)',
          scaleX: 0.82,
          scaleY: 1.2,
          transformOrigin: 'left center',
          y: 96,
        });
        gsap.set(select('.overview-points span'), { autoAlpha: 0, scale: 0.94, y: 56 });
        gsap.set(select('.phase-nav-item'), { autoAlpha: 0, x: -34 });

        const openingTimeline = gsap.timeline({
          defaults: { ease: 'expo.out' },
          onComplete: () => {
            gsap.set(openingSequence, { autoAlpha: 0 });
            ScrollTrigger.refresh();
          },
          paused: true,
        });

        openingTimeline
          .fromTo(
            select('.opening-line'),
            { scaleX: 0 },
            { duration: 0.68, scaleX: 1, stagger: 0.08 },
            0.04,
          )
          .fromTo(
            select('.opening-title-text'),
            {
              autoAlpha: 0,
              ...(isEdge ? {} : { filter: 'blur(12px)' }),
              scaleX: 0.78,
              scaleY: 1.24,
              yPercent: 86,
            },
            {
              autoAlpha: 1,
              duration: 0.88,
              ...(isEdge ? {} : { filter: 'blur(0px)' }),
              scaleX: 1,
              scaleY: 1,
              yPercent: 0,
            },
            0.14,
          )
          .fromTo(
            select('.opening-title-accent'),
            { xPercent: -118 },
            { duration: 0.68, ease: 'power3.inOut', xPercent: 118 },
            0.34,
          )
          .fromTo(
            select('.opening-scan'),
            { xPercent: -120 },
            { duration: 0.82, ease: 'power2.inOut', xPercent: 120 },
            0.26,
          )
          .to(select('.top-bar'), { autoAlpha: 1, duration: 0.72, yPercent: 0 }, 0.16)
          .to(
            select('.side-panel'),
            {
              autoAlpha: 1,
              duration: 0.88,
              ...(isEdge ? {} : { filter: 'blur(0px)' }),
              x: 0,
            },
            0.34,
          )
          .to(
            select('.overview-band'),
            {
              autoAlpha: 1,
              clipPath: 'inset(0% 0% 0% 0% round 8px)',
              duration: 0.9,
              scale: 1,
              y: 0,
            },
            0.42,
          )
          .to(select('.overview-copy .eyebrow'), { autoAlpha: 1, duration: 0.56, y: 0 }, 0.72)
          .to(
            select('.overview-copy h2'),
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: 0.84,
              scaleX: 1,
              scaleY: 1,
              y: 0,
            },
            0.76,
          )
          .to(
            select('.overview-points span'),
            {
              autoAlpha: 1,
              duration: 0.68,
              scale: 1,
              stagger: 0.07,
              y: 0,
            },
            1.02,
          )
          .to(
            select('.phase-nav-item'),
            {
              autoAlpha: 1,
              duration: 0.64,
              stagger: 0.07,
              x: 0,
            },
            0.56,
          )
          .to(
            openingSequence,
            {
              autoAlpha: 0,
              duration: 0.58,
              ease: 'power3.out',
              ...(isEdge ? {} : { filter: 'blur(12px)' }),
              scale: 0.96,
              y: -8,
            },
            1.48,
          );

        if (!isEdge) {
          gsap.utils.toArray(select('.section-block')).forEach((section) => {
            const icon = section.querySelector('.section-icon');
            const kicker = section.querySelector('.section-title .eyebrow');
            const title = section.querySelector('.section-title h2');
            const desc = section.querySelector('.section-title p:last-child');
            const cards = section.querySelectorAll(
              ':scope > .task-panel, :scope > .production-grid > *, :scope > .workflow-methods, :scope > .storyboard-shell, :scope > .storyboard-reference-panel, :scope > .arrow-camera-method, :scope > .quality-strip > *, :scope > .notice-panel, :scope > .border-glow-inner > .task-panel, :scope > .border-glow-inner > .production-grid > *, :scope > .border-glow-inner > .workflow-methods, :scope > .border-glow-inner > .storyboard-shell, :scope > .border-glow-inner > .storyboard-reference-panel, :scope > .border-glow-inner > .arrow-camera-method, :scope > .border-glow-inner > .quality-strip > *, :scope > .border-glow-inner > .notice-panel',
            );

            const timeline = gsap.timeline({
              scrollTrigger: {
                once: true,
                start: 'top 78%',
                trigger: section,
              },
            });

            timeline
              .fromTo(
                icon,
                { autoAlpha: 0, rotate: -18, scale: 0.34, y: 82 },
                { autoAlpha: 1, duration: 1.04, rotate: 0, scale: 1, y: 0 },
                0,
              )
              .fromTo(kicker, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, duration: 0.74, y: 0 }, 0.12)
              .fromTo(
                title,
                {
                  autoAlpha: 1,
                  clipPath: 'inset(0% 100% 0% 0%)',
                  scale: 1.26,
                  transformOrigin: 'left center',
                  y: 92,
                },
                {
                  clipPath: 'inset(0% 0% 0% 0%)',
                  duration: 1.12,
                  scale: 1,
                  y: 0,
                },
                0.16,
              )
              .fromTo(desc, { autoAlpha: 0, y: 38 }, { autoAlpha: 1, duration: 0.8, y: 0 }, 0.34)
              .fromTo(
                cards,
                { autoAlpha: 0, filter: 'blur(10px)', rotateX: -7, scale: 0.94, y: 96 },
                {
                  autoAlpha: 1,
                  duration: 1.02,
                  filter: 'blur(0px)',
                  rotateX: 0,
                  scale: 1,
                  stagger: 0.13,
                  y: 0,
                },
                0.46,
              );
          });

          gsap.utils.toArray(select('.doc-section-card')).forEach((card) => {
            const head = card.querySelector('.doc-section-head');
            const contentBlocks = card.querySelectorAll(
              '.doc-block, .doc-subsection, .storyboard-meta-item, .shot-card, .notice-card',
            );

            gsap
              .timeline({
                scrollTrigger: {
                  once: true,
                  start: 'top 82%',
                  trigger: card,
                },
              })
              .fromTo(
                card,
                { autoAlpha: 0, filter: 'blur(8px)', scale: 0.96, y: 74 },
                { autoAlpha: 1, duration: 0.9, filter: 'blur(0px)', scale: 1, y: 0 },
                0,
              )
              .fromTo(
                head,
                { clipPath: 'inset(0% 100% 0% 0%)', y: 28 },
                { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.86, y: 0 },
                0.1,
              )
              .fromTo(
                contentBlocks,
                { autoAlpha: 0, scale: 0.97, y: 54 },
                { autoAlpha: 1, duration: 0.78, scale: 1, stagger: 0.08, y: 0 },
                0.32,
              );
          });

          gsap.utils.toArray(select('.doc-image-frame, .storyboard-reference-figure, .arrow-camera-figure')).forEach((frame) => {
            const image = frame.querySelector('img');

            gsap
              .timeline({
                scrollTrigger: {
                  once: true,
                  start: 'top 84%',
                  trigger: frame,
                },
              })
              .fromTo(
                frame,
                { clipPath: 'inset(0% 0% 100% 0% round 8px)', y: 46 },
                { clipPath: 'inset(0% 0% 0% 0% round 8px)', duration: 1.08, ease: 'power3.out', y: 0 },
                0,
              )
              .fromTo(
                image,
                { scale: 1.14, yPercent: 8 },
                { duration: 1.2, ease: 'power3.out', scale: 1.03, yPercent: 0 },
                0.05,
              );

            if (image && allowImageParallax) {
              gsap.to(image, {
                ease: 'none',
                scrollTrigger: {
                  end: 'bottom top',
                  scrub: 0.85,
                  start: 'top bottom',
                  trigger: frame,
                },
                yPercent: -5,
              });
            }
          });
        }

        openingFrame = window.requestAnimationFrame(() => {
          openingTimeline.play(0);
        });

        refreshCall = gsap.delayedCall(0.5, () => ScrollTrigger.refresh());
      }, root);

    return () => {
      if (openingFrame) {
        window.cancelAnimationFrame(openingFrame);
      }

      refreshCall?.kill();
      context.revert();
    };
  }, [rootRef, isEnabled]);
}

function App() {
  const appShellRef = useRef(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isEdgeBrowser] = useState(() => isMicrosoftEdge());
  const [isAccessGranted, setIsAccessGranted] = useState(() => hasValidAccessSession());
  const [searchItems, setSearchItems] = useState(() => collectNavSearchItems(phaseNavItems));
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    try {
      const savedTheme = window.localStorage.getItem('training-theme');

      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
    } catch (error) {
      return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    }

    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem('training-theme', theme);
    } catch (error) {
      // Ignore private-mode storage failures; the visible theme still updates.
    }
  }, [theme]);

  useEffect(() => {
    if (isEdgeBrowser) {
      document.documentElement.dataset.browser = 'edge';
    }
  }, [isEdgeBrowser]);

  useEffect(() => {
    if (!isAccessGranted || typeof document === 'undefined') {
      return undefined;
    }

    const refreshSearchItems = () => {
      const itemsById = new Map(collectNavSearchItems(phaseNavItems).map((item) => [item.id, item]));

      document.querySelectorAll('.content-area [id]').forEach((element) => {
        const id = element.id;
        const heading = element.querySelector('h2, h3, h4, h5')?.textContent?.trim();
        const existing = itemsById.get(id);
        const title = existing?.title || heading;
        const content = element.textContent?.replace(/\s+/g, ' ').trim();

        if (!title || !content) {
          return;
        }

        itemsById.set(id, {
          content: [existing?.content, content.slice(0, 900)].filter(Boolean).join(' '),
          id,
          path: existing?.path || title,
          title,
        });
      });

      setSearchItems(Array.from(itemsById.values()).filter((item) => item.id && item.title));
    };

    const searchIndexTimer = window.setTimeout(refreshSearchItems, 500);

    return () => window.clearTimeout(searchIndexTimer);
  }, [isAccessGranted]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  useTrainingMotion(appShellRef, isAccessGranted);

  if (!isAccessGranted) {
    return <AccessGate theme={theme} onAccessGranted={() => setIsAccessGranted(true)} />;
  }

  return (
    <main className="app-shell" data-theme={theme} ref={appShellRef}>
      <div className="page-aurora-background" aria-hidden="true">
        {isEdgeBrowser ? null : (
          <Aurora
            colorStops={['#57c9dd', '#79b225', '#84355c']}
            blend={0.53}
            amplitude={1.0}
            speed={0.9}
          />
        )}
      </div>
      <TopBar
        onNavigate={scrollToAnchor}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        onToggleTheme={toggleTheme}
        searchItems={searchItems}
        theme={theme}
      />
      <div className="workspace">
        <aside className="side-panel">
          <BorderGlow
            animated
            backgroundColor={theme === 'dark' ? '#111a29' : '#ffffff'}
            borderRadius={8}
            className="side-panel-glow"
            colors={theme === 'dark' ? ['#10b981', '#38bdf8', '#84cc16'] : ['#177c72', '#57c9dd', '#79b225']}
            coneSpread={24}
            edgeSensitivity={24}
            fillOpacity={theme === 'dark' ? 0.2 : 0.12}
            glowColor={theme === 'dark' ? '164 85 58' : '174 70 46'}
            glowIntensity={1.18}
            glowRadius={24}
          >
            <WorkflowNavPanel />
          </BorderGlow>
        </aside>

        <section className="content-area">
          <ContentModule as="section" className="overview-band" aria-labelledby="overview-title" theme={theme}>
            <div className="overview-copy">
              <p className="eyebrow">面向动画师的前期制作流程</p>
              <h2 id="overview-title">从剧本理解到高质量分镜的制作路径</h2>
              <div className="overview-points" aria-label="核心要点">
                <span>核对剧本资产、人设、场景、道具和上下集衔接</span>
                <span>按编导描述制作三版人设、场景和道具，通过审核后留稿</span>
                <span>把剧本文字拆成镜号、景别、运镜、动作、台词和时长</span>
                <span>沉淀可复用提示词，重点检查画面衔接、站位一致和配音顺序</span>
              </div>
            </div>
          </ContentModule>

          <ContentModule as="section" id="phase-01" className="section-block" theme={theme}>
            <SectionTitle
              icon={FileText}
              kicker="第一步"
              title="拿到剧本后先做资产核对"
              desc="这一阶段面向动画师，目标是理清本集需要的人设、场景、道具和前后集衔接要求，确认素材表是否齐全，再进入动画制作。"
            />
            <div id="phase-01-checklist" className="task-panel">
              <h3>动画制作前核对记录</h3>
              <ul className="check-list">
                <li>理清本集需要的人设、场景、道具、宠物、系统等制作资产。</li>
                <li>在表格中核对资产是否齐全，如不齐全，需要及时和编导说明。</li>
                <li>确认本集是否涉及人物换装、宠物换装、同场景变化或道具、系统变化。</li>
                <li>和前后集制作同学协商人物站位、人物背景是否一致，能否顺利衔接上下集。</li>
              </ul>
              <div id="phase-01-alert" className="script-alert">
                <AlertTriangle size={20} />
                <p>
                  <strong>注意：</strong>
                  新的人设、场景、道具或换装方案需要提交编导老师审核，确认通过后再继续制作。
                </p>
              </div>
            </div>
          </ContentModule>

          <ContentModule as="section" id="phase-02" className="section-block" theme={theme}>
            <SectionTitle
              icon={UserRoundCog}
              kicker="第二步"
              title="制作人设、场景和道具"
              desc="编导会拆分好人设、场景和道具描述，制作同学按描述各做三版左右，审核通过后将最终通过的图保留下来。"
            />
            <div className="production-grid">
              <ProductionColumn
                id="phase-02-character"
                title="人设制作区"
                icon={PencilRuler}
                brief="按照编导拆分的人物年龄、岗位、气质、服装和动作描述制作。"
              />
              <ProductionColumn
                id="phase-02-scene"
                title="场景制作区"
                icon={Layers3}
                brief="明确场景外观、时间光源、室内外空间类型、科技等级或异能痕迹，并补充冷、危险、暧昧、压迫等氛围关键词。"
              />
              <ProductionColumn
                id="phase-02-props"
                title="道具制作区"
                icon={Image}
                brief="按照道具、系统界面、特殊物件的造型和质感要求制作。"
              />
            </div>
            <WorkflowSectionGroup
              title="人设、场景和道具制作方法"
              sections={assetMethodSections}
              idPrefix="phase-02-methods"
            />
          </ContentModule>

          <ContentModule as="section" id="phase-03" className="section-block" theme={theme}>
            <SectionTitle
              icon={Clapperboard}
              kicker="第三步"
              title="剧本转分镜流程"
              desc="将剧本规范、模型训练提示词、配音真实感、去 AI 味、镜头处理和整体视觉基调串成可执行的分镜工作流。"
            />
            <WorkflowSectionGroup
              title={scriptStoryboardWorkflow.title}
              desc="内容来自《剧本分镜处理.docx》，已按文档顺序整理为网页模块，并保留原文示例、表格和图片。"
              sections={scriptStoryboardWorkflow.sections}
              idPrefix="phase-03-workflow"
              hideHeader
            />
          </ContentModule>

          <ContentModule as="section" id="phase-04" className="section-block" theme={theme}>
            <SectionTitle
              icon={WandSparkles}
              kicker="第四步"
              title="操作指南&注意事项"
              desc="这里集中放置关键词优化、分镜提示词排版、摄影参数、素材衔接、常见问题和配音处理方法。"
            />
            <WorkflowSectionGroup
              title="剧集制作关键词优化"
              desc="将真人写实质感、分镜图、多人物站位和背景补救方法放在分镜与提示词阶段使用。"
              sections={keywordOptimizationSection ? [keywordOptimizationSection] : []}
              idPrefix="phase-04-keywords"
              hideSectionTitles
              showSectionIndex={false}
            />

            <div id="phase-04-storyboard-format" className="storyboard-shell">
              <div className="storyboard-head">
                <div>
                  <p className="eyebrow">分镜表样式</p>
                  <h3>整体视觉基调 + 地点/时间/人物 + 镜头拆分</h3>
                </div>
                <div className="storyboard-format-pill">镜号 / 景别 / 运镜 / 情绪动作 / 台词 / 音效 / 时长</div>
              </div>
              <div className="storyboard-document">
                <p className="storyboard-intro">{storyboardExample.intro}</p>
                <div className="storyboard-meta-grid">
                  {storyboardExample.meta.map((item) => (
                    <div className="storyboard-meta-item" key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="shot-list" aria-label="分镜示例">
                  {storyboardExample.shots.map((shot) => (
                    <article className="shot-card" key={shot.number}>
                      <div className="shot-card-head">
                        <span>镜号：{shot.number}</span>
                        <span>{shot.duration}</span>
                      </div>
                      <div className="shot-fields">
                        <StoryboardField label="景别" value={shot.framing} />
                        <StoryboardField label="运镜" value={shot.camera} />
                        <StoryboardField label="情绪/动作" value={shot.action} wide />
                        <StoryboardField label="台词" value={shot.dialogue} wide />
                        <StoryboardField label="音效" value={shot.sound} />
                        <StoryboardField label="时长" value={shot.duration} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <StoryboardReferencePanel id="phase-04-reference" />
            <CinematographyGuide id="phase-04-cinematography-guide" />
            <LightingPromptGuide id="phase-04-lighting-guide" />
            <ImageReconstructionGuide id="phase-04-reconstruction-guide" />
            <ArrowCameraMethod id="phase-04-arrow-camera" />
            <ClipContinuityGuide id="phase-04-continuity-guide" />
            <BackgroundUnityGuide id="phase-04-background-unity" />

            <div id="phase-04-notices" className="notice-panel">
              <div className="notice-title">
                <div>
                  <h3>常见问题</h3>
                </div>
                <div className="notice-badge">
                  <AlertTriangle size={18} />
                  生成前必查
                </div>
              </div>
              <div className="quality-strip">
                <QualityCard
                  icon={Camera}
                  title="镜头不平淡"
                  text="用景别、机位、动作和环境信息组织画面，避免每一镜都是人物正面对镜头。"
                />
                <QualityCard
                  icon={CircleDotDashed}
                  title="衔接要顺"
                  text="用视线、动作、道具、空间方向或音画信息连接下一镜，减少生硬跳切。"
                />
                <QualityCard
                  icon={MessageSquareText}
                  title="提示词可复用"
                  text="把角色、场景、镜头语言、动作、情绪和画面限制拆开，形成稳定模板。"
                />
              </div>
              <div className="notice-grid">
                {seedanceNotices.map((notice) => (
                  <NoticeCard key={notice.title} {...notice} />
                ))}
              </div>
            </div>

            <WorkflowSectionGroup
              title="配音错乱处理"
              desc="配音问题放在操作指南与注意事项阶段，便于动画师按角色、人设图、音频顺序复核。"
              sections={voiceIssueSection ? [voiceIssueSection] : []}
              idPrefix="phase-04-voice"
              showSectionIndex={false}
            />
          </ContentModule>
        </section>
      </div>
      <SecurityShield />
      <BackToTopButton />
      <ChecklistModal isOpen={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} />
    </main>
  );
}

function AccessGate({ theme, onAccessGranted }) {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!accessCode.trim()) {
      setError('请输入访问密码');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const hashedCode = await hashAccessCode(accessCode.trim());

      if (hashedCode === ACCESS_CODE_HASH) {
        saveAccessSession();
        onAccessGranted();
        return;
      }

      setError('访问密码不正确，请重新输入');
      setAccessCode('');
    } catch (checkError) {
      setError('当前浏览器不支持安全校验，请换用新版浏览器');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="access-gate" data-theme={theme}>
      <section className="access-card" aria-labelledby="access-title">
        <div className="access-card-mark">
          <Clapperboard size={26} />
        </div>
        <p className="eyebrow">内部培训资料</p>
        <h1 id="access-title">AI 短剧制作入职培训</h1>
        <p className="access-desc">请输入访问密码，通过后才能查看工作流内容。</p>
        <form className="access-form" onSubmit={handleSubmit}>
          <label htmlFor="access-code">访问密码</label>
          <input
            id="access-code"
            type="password"
            value={accessCode}
            onChange={(event) => {
              setAccessCode(event.target.value);
              setError('');
            }}
            autoComplete="current-password"
            autoFocus
          />
          {error ? <p className="access-error">{error}</p> : null}
          <button className="access-submit" type="submit" disabled={isChecking}>
            {isChecking ? '校验中...' : '进入培训页面'}
          </button>
        </form>
        <p className="access-footnote">中文在线版权所有，未经授权禁止外传。</p>
      </section>
    </main>
  );
}

function SecurityShield() {
  const [watermarkTime, setWatermarkTime] = useState(() => formatWatermarkTime());
  const [notice, setNotice] = useState('');
  const canUsePortal = typeof document !== 'undefined';

  useEffect(() => {
    const intervalId = window.setInterval(() => setWatermarkTime(formatWatermarkTime()), 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let noticeTimeout = 0;
    const showNotice = (message) => {
      setNotice(message);
      window.clearTimeout(noticeTimeout);
      noticeTimeout = window.setTimeout(() => setNotice(''), 1800);
    };

    const blockEvent = (event) => {
      event.preventDefault();
      showNotice('内部培训资料已启用防外传保护');
    };

    const blockShortcut = (event) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && ['c', 's', 'p', 'u'].includes(key)) {
        event.preventDefault();
        showNotice('内部培训资料禁止复制、保存、打印和查看源码');
      }
    };

    const blockPrint = (event) => {
      event.preventDefault();
      showNotice('内部培训资料禁止打印外传');
    };

    document.body.classList.add('security-protected');
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('dragstart', blockEvent);
    document.addEventListener('keydown', blockShortcut);
    window.addEventListener('beforeprint', blockPrint);

    return () => {
      window.clearTimeout(noticeTimeout);
      document.body.classList.remove('security-protected');
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('dragstart', blockEvent);
      document.removeEventListener('keydown', blockShortcut);
      window.removeEventListener('beforeprint', blockPrint);
    };
  }, []);

  if (!canUsePortal) {
    return null;
  }

  return createPortal(
    <>
      <div className="security-watermark" aria-hidden="true">
        {watermarkTiles.map((tile) => (
          <span key={tile}>内部资料 禁止外传 · 中文在线版权所有 · {watermarkTime}</span>
        ))}
      </div>
      {notice ? <div className="security-toast">{notice}</div> : null}
    </>,
    document.body,
  );
}

function ContentModule({ as = 'section', children, className = '', theme, ...props }) {
  const isDark = theme === 'dark';

  return (
    <BorderGlow
      {...props}
      animated
      as={as}
      backgroundColor={isDark ? '#111a29' : '#ffffff'}
      borderRadius={8}
      className={`content-module-glow ${className}`}
      colors={isDark ? ['#10b981', '#38bdf8', '#84cc16'] : ['#177c72', '#57c9dd', '#79b225']}
      coneSpread={24}
      edgeSensitivity={24}
      fillOpacity={isDark ? 0.16 : 0.08}
      glowColor={isDark ? '164 85 58' : '174 70 46'}
      glowIntensity={1.12}
      glowRadius={24}
      innerClassName="content-module-inner"
    >
      {children}
    </BorderGlow>
  );
}

function OpeningSequence() {
  return (
    <div className="opening-sequence" aria-hidden="true">
      <div className="opening-scan" />
      <div className="opening-stage">
        <span className="opening-line opening-line-top" />
        <div className="opening-title-mask">
          <span className="opening-title-accent" />
          <span className="opening-title-text">AI 短剧制作入职培训</span>
        </div>
        <span className="opening-line opening-line-bottom" />
      </div>
    </div>
  );
}

function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      className={`back-to-top ${isVisible ? 'is-visible' : ''}`}
      type="button"
      onClick={() => window.scrollTo({ behavior: 'smooth', top: 0 })}
      aria-label="返回顶部"
      title="返回顶部"
    >
      <ArrowUp size={20} />
    </button>
  );
}

function TopBar({ onNavigate, onOpenChecklist, onToggleTheme, searchItems, theme }) {
  const isDark = theme === 'dark';

  return (
    <header className="top-bar">
      <div className="top-inner">
        <div className="brand-mark">
          <Clapperboard size={22} />
          <span>AI 短剧制作流程</span>
        </div>
        <div className="top-center">
          <TopSearch items={searchItems} onNavigate={onNavigate} />
          <OpeningSequence />
        </div>
        <div className="top-actions">
          <button
            className="theme-toggle-button"
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? '切换为浅色模式' : '切换为深色模式'}
            title={isDark ? '切换为浅色模式' : '切换为深色模式'}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <a className="ghost-button" href="/script-assets/Trap_of_Love-1.pdf" target="_blank" rel="noreferrer">
            <FileText size={18} />
            <span className="top-action-label">剧本</span>
          </a>
          <button className="primary-button" type="button" onClick={onOpenChecklist}>
            <ClipboardCheck size={18} />
            <span className="top-action-label">审核清单</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function TopSearch({ items, onNavigate }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const trimmedQuery = query.trim();
  const results = trimmedQuery
    ? items
        .map((item) => ({ item, score: getSearchScore(item, trimmedQuery) }))
        .filter((result) => result.score !== null)
        .sort((first, second) => first.score - second.score || first.item.title.length - second.item.title.length)
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleResultClick = (anchorId) => {
    setQuery('');
    setIsOpen(false);
    onNavigate(anchorId);
  };

  return (
    <div className="top-search" ref={searchRef}>
      <Search size={17} />
      <input
        aria-label="搜索页面内容"
        placeholder="搜索制作方法、提示词、注意事项..."
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {trimmedQuery ? (
        <button className="top-search-clear" type="button" onClick={() => setQuery('')} aria-label="清空搜索">
          <X size={15} />
        </button>
      ) : null}
      {isOpen && trimmedQuery ? (
        <div className="top-search-results" role="listbox">
          {results.length ? (
            results.map(({ item }) => (
              <button className="top-search-result" type="button" key={item.id} onClick={() => handleResultClick(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.path}</span>
              </button>
            ))
          ) : (
            <div className="top-search-empty">没有找到相关内容</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowNavPanel() {
  const [expandedPhaseNumbers, setExpandedPhaseNumbers] = useState(['03']);
  const [activeAnchor, setActiveAnchor] = useState('phase-03');

  const navigateToAnchor = (anchorId) => {
    const target = document.getElementById(anchorId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${anchorId}`);
      setActiveAnchor(anchorId);
    }
  };

  const handlePhaseClick = (phaseNumber) => {
    const phaseId = `phase-${phaseNumber}`;

    setExpandedPhaseNumbers((current) =>
      current.includes(phaseNumber)
        ? current.filter((number) => number !== phaseNumber)
        : [...current, phaseNumber],
    );
    navigateToAnchor(phaseId);
  };

  return (
    <>
      <div className="project-card">
        <div className="project-icon">
          <PlaySquare size={24} />
        </div>
        <div>
          <p className="eyebrow">制作项目</p>
          <h1>AI 短剧制作入职培训</h1>
        </div>
      </div>
      <nav className="phase-nav" aria-label="制作流程">
        {phaseNavItems.map((phase) => {
          const Icon = phase.icon;
          const isExpanded = expandedPhaseNumbers.includes(phase.number);

          return (
            <div className="phase-nav-item" key={phase.number}>
              <button
                className="phase-link"
                type="button"
                onClick={() => handlePhaseClick(phase.number)}
                aria-expanded={isExpanded}
                aria-controls={`phase-subnav-${phase.number}`}
              >
                <span className="phase-index">{phase.number}</span>
                <span>
                  <strong>{phase.title}</strong>
                  <small>{phase.status}</small>
                </span>
                <Icon className="phase-symbol" size={18} />
                <ChevronDown className={`phase-chevron ${isExpanded ? 'is-open' : ''}`} size={16} />
              </button>
              {isExpanded ? (
                <div className="phase-subnav" id={`phase-subnav-${phase.number}`}>
                  {phase.children.map((child) => (
                    <NavChildLink
                      activeAnchor={activeAnchor}
                      item={child}
                      key={child.id}
                      onNavigate={navigateToAnchor}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </>
  );
}

function NavChildLink({ item, onNavigate, activeAnchor, level = 0 }) {
  const isActive = activeAnchor === item.id;

  return (
    <div className={`phase-child-wrap ${level > 0 ? 'is-nested' : ''}`}>
      <a
        className={`phase-child-link ${isActive ? 'is-active' : ''}`}
        href={`#${item.id}`}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(item.id);
        }}
      >
        <span className="phase-child-dot" />
        <span>{item.title}</span>
      </a>
      {item.children?.length ? (
        <div className="phase-child-sublist">
          {item.children.map((child) => (
            <NavChildLink
              activeAnchor={activeAnchor}
              item={child}
              key={child.id}
              level={level + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChecklistModal({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="checklist-backdrop" role="presentation" onClick={onClose}>
      <div className="checklist-dialog" role="dialog" aria-modal="true" aria-label="审核清单" onClick={(event) => event.stopPropagation()}>
        <div className="checklist-dialog-head">
          <div>
            <p className="eyebrow">审核清单</p>
            <h2>制作流程核对</h2>
          </div>
          <button className="checklist-close" type="button" onClick={onClose} aria-label="关闭审核清单">
            <X size={22} />
          </button>
        </div>
        <div className="checklist-panel">
          <WorkflowNavPanel />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, kicker, title, desc }) {
  return (
    <div className="section-title">
      <div className="section-icon">
        <Icon size={23} />
      </div>
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function StoryboardField({ label, value, wide = false }) {
  return (
    <div className={wide ? 'shot-field shot-field-wide' : 'shot-field'}>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function StoryboardReferencePanel({ id }) {
  const imageSrc = '/sd2-assets/storyboard-reference.png';

  return (
    <div className="storyboard-reference-panel" id={id}>
      <div className="reference-copy">
        <p className="eyebrow">图片教学参考</p>
        <h3>分镜提示词排版示例</h3>
        <p>参考图展示了完整分镜提示词的组织方式：先写全片视觉基调和资产引用，再按镜号拆分镜头信息。点击图片可放大查看细节。</p>
      </div>
      <figure className="storyboard-reference-figure">
        <PreviewableImage
          src={imageSrc}
          alt="分镜提示词排版参考图"
          previewAlt="分镜提示词排版参考图大图"
          triggerClassName="storyboard-reference-trigger"
        />
      </figure>
    </div>
  );
}

function ArrowCameraMethod({ id }) {
  return (
    <div className="arrow-camera-method" id={id}>
      <div className="arrow-camera-head">
        <div>
          <p className="eyebrow">运镜控制方法</p>
          <h3>箭头引导线控制镜头运动</h3>
          <p>{arrowCameraMethod.intro}</p>
        </div>
        <div className="arrow-camera-source">{arrowCameraMethod.source}</div>
      </div>

      <div className="arrow-camera-body">
        <section className="arrow-camera-panel">
          <h4>操作步骤</h4>
          <ol className="arrow-step-list">
            {arrowCameraMethod.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="arrow-camera-panel">
          <h4>适合的镜头和作用</h4>
          <div className="arrow-use-grid">
            {arrowCameraMethod.useCases.map((useCase) => (
              <article className="arrow-use-card" key={useCase.title}>
                <strong>{useCase.title}</strong>
                <p>{useCase.effect}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="arrow-camera-panel">
          <h4>可用提示词</h4>
          <div className="arrow-prompt-grid">
            {arrowCameraMethod.promptBlocks.map((block) => (
              <article className="arrow-prompt-card" key={block.title}>
                <span>{block.title}</span>
                <code>{block.text}</code>
              </article>
            ))}
          </div>
        </section>

        <section className="arrow-camera-panel">
          <h4>使用建议</h4>
          <ul className="arrow-tip-list">
            {arrowCameraMethod.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="arrow-camera-panel arrow-camera-gallery-panel">
          <h4>参考图</h4>
          <p>点击图片可放大查看红色路线、箭头方向和最终效果参考。</p>
          <div className="arrow-camera-gallery">
            {arrowCameraMethod.images.map((src, imageIndex) => (
              <figure className="arrow-camera-figure" key={src}>
                <PreviewableImage
                  src={src}
                  alt={`箭头引导线运镜参考图 ${imageIndex + 1}`}
                  previewAlt={`箭头引导线运镜参考图 ${imageIndex + 1}`}
                  triggerClassName="arrow-camera-image-trigger"
                />
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ClipContinuityGuide({ id }) {
  return (
    <div className="arrow-camera-method clip-continuity-guide" id={id}>
      <div className="arrow-camera-head">
        <div>
          <p className="eyebrow">素材衔接处理</p>
          <h3>片段衔接修复</h3>
          <p>{clipContinuityGuide.intro}</p>
        </div>
        <div className="arrow-camera-source">{clipContinuityGuide.source}</div>
      </div>

      <div className="arrow-camera-body">
        <section className="arrow-camera-panel">
          <h4>四个处理方法</h4>
          <div className="clip-method-grid">
            {clipContinuityGuide.methods.map((method) => (
              <article className="clip-method-card" key={method.title}>
                <div className="clip-method-head">
                  <span>{method.title.split(' ')[0]}</span>
                  <h5>{method.title.replace(/^\d+\s*/, '')}</h5>
                </div>
                <p>
                  <strong>适用：</strong>
                  {method.scene}
                </p>
                <p>
                  <strong>做法：</strong>
                  {method.action}
                </p>
                <p>
                  <strong>作用：</strong>
                  {method.effect}
                </p>
                <div className="cinema-guide-prompt">
                  <strong>可用提示词</strong>
                  <code>{method.prompt}</code>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="arrow-camera-panel clip-reminder-panel">
          <h4>{clipContinuityGuide.reminder.title}</h4>
          <ul className="arrow-tip-list">
            {clipContinuityGuide.reminder.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function BackgroundUnityGuide({ id }) {
  return (
    <div className="arrow-camera-method background-unity-guide" id={id}>
      <div className="arrow-camera-head">
        <div>
          <p className="eyebrow">背景一致性</p>
          <h3>背景统一方法</h3>
          <p>{backgroundUnityGuide.intro}</p>
        </div>
        <div className="arrow-camera-source">适合处理前后片段背景跳变、人物站位不稳、空间关系不连续的问题。</div>
      </div>

      <div className="arrow-camera-body">
        <section className="arrow-camera-panel">
          <h4>操作步骤</h4>
          <ol className="arrow-step-list">
            {backgroundUnityGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="arrow-camera-panel">
          <h4>提示词规则</h4>
          <ul className="arrow-tip-list">
            {backgroundUnityGuide.promptRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <div className="cinema-guide-prompt background-unity-prompt">
            <strong>可用提示词</strong>
            <code>{backgroundUnityGuide.prompt}</code>
          </div>
        </section>

        <section className="arrow-camera-panel arrow-camera-gallery-panel">
          <h4>参考截图</h4>
          <p>文字整理自截图中的红色标注，点击图片可放大查看原始说明和参考位置。</p>
          <figure className="arrow-camera-figure background-unity-figure">
            <PreviewableImage
              src={backgroundUnityGuide.image}
              alt="背景统一方法参考截图"
              previewAlt="背景统一方法参考截图"
              triggerClassName="arrow-camera-image-trigger background-unity-image-trigger"
            />
          </figure>
        </section>
      </div>
    </div>
  );
}

function CinematographyGuide({ id }) {
  return (
    <div className="arrow-camera-method cinematography-guide" id={id}>
      <div className="arrow-camera-head">
        <div>
          <p className="eyebrow">摄影语言拆解</p>
          <h3>摄影参数与画面风格指南</h3>
          <p>{cinematographyGuide.intro}</p>
        </div>
        <div className="arrow-camera-source">适合写入分镜提示词、整体视觉基调和单镜头画面要求。</div>
      </div>

      <div className="arrow-camera-body">
        <section className="arrow-camera-panel">
          <h4>核心使用原则</h4>
          <ul className="arrow-tip-list">
            {cinematographyGuide.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="arrow-camera-panel">
          <h4>图文总结</h4>
          <div className="cinema-guide-grid">
            {cinematographyGuide.items.map((item, itemIndex) => (
              <article className="cinema-guide-card" key={item.title}>
                <figure className="arrow-camera-figure cinema-guide-figure">
                  <PreviewableImage
                    src={item.image}
                    alt={`${item.title} 参考图`}
                    previewAlt={`${item.title} 参考图`}
                    triggerClassName="arrow-camera-image-trigger cinema-guide-image-trigger"
                  />
                </figure>
                <div className="cinema-guide-copy">
                  <span>{String(itemIndex + 1).padStart(2, '0')}</span>
                  <h5>{item.title}</h5>
                  <p>{item.summary}</p>
                  <div className="cinema-guide-prompt">
                    <strong>提示词写法</strong>
                    <code>{item.prompt}</code>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="arrow-camera-panel">
          <h4>组合示例</h4>
          <div className="arrow-prompt-card cinema-guide-example">
            <span>可直接套用</span>
            <code>{cinematographyGuide.examplePrompt}</code>
          </div>
        </section>
      </div>
    </div>
  );
}

function ImageReconstructionGuide({ id }) {
  return (
    <div className="arrow-camera-method image-reconstruction-guide" id={id}>
      <div className="arrow-camera-head">
        <div>
          <p className="eyebrow">低清素材处理</p>
          <h3>低清图片高清重构方法</h3>
          <p>{imageReconstructionGuide.intro}</p>
        </div>
        <div className="arrow-camera-source">适用于低清、模糊、压缩失真、细节涂抹、边缘不清的图片二次修复。</div>
      </div>

      <div className="arrow-camera-body">
        <section className="arrow-camera-panel">
          <h4>操作步骤</h4>
          <div className="cinema-guide-grid reconstruction-guide-grid">
            {imageReconstructionGuide.steps.map((step, stepIndex) => (
              <article className="cinema-guide-card reconstruction-guide-card" key={step.title}>
                <figure className="arrow-camera-figure cinema-guide-figure">
                  <PreviewableImage
                    src={step.image}
                    alt={`${step.title} 教学截图`}
                    previewAlt={`${step.title} 教学截图`}
                    triggerClassName="arrow-camera-image-trigger cinema-guide-image-trigger reconstruction-guide-image-trigger"
                  />
                </figure>
                <div className="cinema-guide-copy">
                  <span>{String(stepIndex + 1).padStart(2, '0')}</span>
                  <h5>{step.title}</h5>
                  <p>{step.summary}</p>
                  <div className="cinema-guide-prompt">
                    <strong>可用提示词</strong>
                    <code>{step.prompt}</code>
                  </div>
                  {step.example ? (
                    <div className="cinema-guide-prompt">
                      <strong>反推示例</strong>
                      <code>{step.example}</code>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function LightingPromptGuide({ id }) {
  return (
    <div className="arrow-camera-method lighting-prompt-guide" id={id}>
      <div className="arrow-camera-head">
        <div>
          <p className="eyebrow">光线提示词</p>
          <h3>AI 视频打光提示词</h3>
          <p>把光线方向、强弱、明暗关系和情绪效果写进分镜提示词，避免只用“高清、电影感、氛围感”这类泛词。</p>
        </div>
        <div className="arrow-camera-source">建议放在“整体视觉基调”或“镜头画面”后，和景别、运镜、人物情绪一起使用。</div>
      </div>

      <div className="arrow-camera-body">
        <NoticeCard {...lightingPromptGuide} />
      </div>
    </div>
  );
}

const preventImageSaveMenu = (event) => {
  event.preventDefault();
};

function PreviewableImage({ src, alt, previewAlt = alt, triggerClassName }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const imageAsset = imageAssets[src];
  const triggerClasses = ['protected-image-trigger', triggerClassName].filter(Boolean).join(' ');
  const previewDialog =
    isPreviewOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="image-preview-backdrop"
            role="presentation"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div
              className="image-preview-dialog protected-image-preview"
              role="dialog"
              aria-modal="true"
              aria-label={previewAlt}
              onContextMenu={preventImageSaveMenu}
              onClick={(event) => event.stopPropagation()}
            >
              <button className="image-preview-close" type="button" onClick={() => setIsPreviewOpen(false)} aria-label="关闭大图">
                <X size={22} />
              </button>
              <img src={src} alt={previewAlt} decoding="async" draggable="false" onContextMenu={preventImageSaveMenu} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        className={triggerClasses}
        type="button"
        onContextMenu={preventImageSaveMenu}
        onClick={() => setIsPreviewOpen(true)}
        aria-label={`放大查看${alt}`}
      >
        <picture>
          {imageAsset?.src ? <source srcSet={imageAsset.src} type="image/webp" /> : null}
          <img
            src={src}
            alt={alt}
            decoding="async"
            fetchPriority="low"
            height={imageAsset?.height}
            loading="lazy"
            draggable="false"
            onContextMenu={preventImageSaveMenu}
            width={imageAsset?.width}
          />
        </picture>
        <span className="image-zoom-label">
          <Maximize2 size={18} />
          点击放大
        </span>
      </button>
      {previewDialog}
    </>
  );
}

function PlaceholderPanel({ icon: Icon, title, desc, action }) {
  return (
    <div className="placeholder-panel">
      <div className="placeholder-visual">
        <Icon size={44} />
        <span>{action}</span>
      </div>
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function ProductionColumn({
  id,
  title,
  icon: Icon,
  brief,
}) {
  return (
    <div className="production-column" id={id}>
      <div className="column-title">
        <Icon size={22} />
        <div>
          <h3>{title}</h3>
          <p>{brief}</p>
        </div>
      </div>
    </div>
  );
}

function QualityCard({ icon: Icon, title, text }) {
  return (
    <div className="quality-card">
      <Icon size={23} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function WorkflowSectionGroup({
  title,
  desc,
  sections,
  showSectionIndex = true,
  hideHeader = false,
  hideSectionTitles = false,
  idPrefix,
}) {
  if (!sections.length) {
    return null;
  }

  return (
    <div className={`workflow-methods ${hideHeader ? 'is-headless' : ''}`}>
      {!hideHeader ? (
        <div className="workflow-methods-head">
          <div>
            <p className="eyebrow">操作指南</p>
            <h3>{title}</h3>
            {desc ? <p>{desc}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="doc-section-list">
        {sections.map((section, sectionIndex) => {
          const displayTitle = showSectionIndex ? section.title : section.title.replace(/^\d+\./, '');
          const sectionId = idPrefix ? `${idPrefix}-section-${sectionIndex + 1}` : undefined;

          return (
            <article className={`doc-section-card${hideSectionTitles ? ' is-titleless' : ''}`} id={sectionId} key={section.title}>
              {!hideSectionTitles ? (
                <div className={showSectionIndex ? 'doc-section-head' : 'doc-section-head doc-section-head-no-index'}>
                  {showSectionIndex ? <span>{String(sectionIndex + 1).padStart(2, '0')}</span> : null}
                  <h3>{displayTitle}</h3>
                </div>
              ) : null}
              <div className="doc-block-list">
                {section.blocks.map((block, blockIndex) => {
                  const blockAnchorId =
                    sectionId && block.type === 'subsection' && !block.hideTitle
                      ? `${sectionId}-block-${blockIndex + 1}`
                      : undefined;

                  return (
                    <DocumentBlock
                      anchorId={blockAnchorId}
                      block={block}
                      blockIndex={blockIndex}
                      key={`${section.title}-${blockIndex}`}
                      sectionTitle={displayTitle}
                    />
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DocumentBlock({ block, blockIndex, sectionTitle, anchorId }) {
  if (block.type === 'subsection') {
    return (
      <section className={`doc-subsection ${block.hideTitle ? 'is-titleless' : ''}`} id={anchorId}>
        {!block.hideTitle ? (
          <div className="doc-subsection-head">
            {block.kicker ? <span className="doc-subsection-kicker">{block.kicker}</span> : null}
            <h4>{block.title}</h4>
            {block.desc ? <p>{block.desc}</p> : null}
          </div>
        ) : null}
        <div className="doc-sub-block-list">
          {block.blocks.map((childBlock, childIndex) => (
            <DocumentBlock
              block={childBlock}
              blockIndex={`${blockIndex}-${childIndex}`}
              key={`${block.title}-${childIndex}`}
              sectionTitle={`${sectionTitle} ${block.title}`}
            />
          ))}
        </div>
      </section>
    );
  }

  if (block.type === 'table') {
    return (
      <div className="doc-block">
        <div className="doc-table-wrap">
          <table className="doc-table">
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${blockIndex}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${blockIndex}-${rowIndex}-${cellIndex}`}>
                      <LinkedText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocumentImages images={block.images} sectionTitle={sectionTitle} blockIndex={blockIndex} />
      </div>
    );
  }

  const roleClass = block.role ? ` is-${block.role}` : '';

  return (
    <div className={`doc-block${roleClass}`}>
      {block.text ? (
        <p>
          <LinkedText text={block.text} />
        </p>
      ) : null}
      <DocumentImages images={block.images} sectionTitle={sectionTitle} blockIndex={blockIndex} />
    </div>
  );
}

function LinkedText({ text }) {
  return text.split(inlineLinkPattern).map((part, index) => {
    const href = part.startsWith('http') ? part : inlineLinks.get(part);

    if (href) {
      return (
        <a className="inline-link" href={href} key={`${part}-${index}`} target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function DocumentImages({ images = [], sectionTitle, blockIndex }) {
  if (!images.length) {
    return null;
  }

  return (
    <div className={`doc-image-grid image-count-${Math.min(images.length, 4)}`}>
      {images.map((src, imageIndex) => (
        <figure className="doc-image-frame" key={src}>
          <PreviewableImage
            src={src}
            alt={`${sectionTitle} 示例图 ${blockIndex + 1}-${imageIndex + 1}`}
            triggerClassName="doc-image-trigger"
          />
        </figure>
      ))}
    </div>
  );
}

function NoticeCard({ icon: Icon, title, points = [], intro, guides = [], usageTips = [], examplePrompt }) {
  const isDetailed = guides.length > 0 || usageTips.length > 0 || Boolean(examplePrompt);

  return (
    <article className={`notice-card${isDetailed ? ' is-detailed' : ''}`}>
      <div className="notice-card-head">
        <Icon size={22} />
        <h4>{title}</h4>
      </div>
      {intro ? <p className="notice-card-intro">{intro}</p> : null}
      {points.length ? (
        <ul>
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}
      {guides.length ? (
        <div className="notice-guide-grid">
          {guides.map((guide) => (
            <section className="notice-guide" key={guide.title}>
              <h5>{guide.title}</h5>
              <p>
                <strong>适合：</strong>
                {guide.suit}
              </p>
              <p>
                <strong>作用：</strong>
                {guide.effect}
              </p>
              <div className="notice-prompt">
                <span>可用提示词</span>
                <code>{guide.prompt}</code>
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {usageTips.length ? (
        <div className="notice-usage">
          <h5>使用建议</h5>
          <ul>
            {usageTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {examplePrompt ? (
        <div className="notice-prompt notice-example">
          <span>完整示例</span>
          <code>{examplePrompt}</code>
        </div>
      ) : null}
    </article>
  );
}

export default App;
