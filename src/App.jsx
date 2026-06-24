import { useState } from 'react';
import {
  AlertTriangle,
  BookOpenText,
  Camera,
  CircleDotDashed,
  Clapperboard,
  ClipboardCheck,
  Clock3,
  FileText,
  Image,
  Layers3,
  Maximize2,
  MessageSquareText,
  PencilRuler,
  PlaySquare,
  Route,
  UserRoundCog,
  UsersRound,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import sd2Workflow from './data/sd2Workflow.json';

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
    status: '待补方法',
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
    title: '操作方法',
    desc: '集中查看关键词优化、分镜提示词排版和图片教学示例。',
    icon: WandSparkles,
    status: '操作示例',
  },
  {
    number: '05',
    title: '注意事项',
    desc: '集中查看生成、衔接、成片审核和配音处理注意事项。',
    icon: ClipboardCheck,
    status: '制作避坑',
  },
];

const assetMethodSections = sd2Workflow.sections.filter((section) =>
  ['1.人物换装', '2.写实场景', '3.道具（系统）'].includes(section.title),
);
const keywordOptimizationSection = sd2Workflow.sections.find((section) =>
  section.title.startsWith('5.实际操作'),
);
const voiceIssueSection = sd2Workflow.sections.find((section) => section.title.startsWith('6.配音错乱'));

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

function App() {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  return (
    <main className="app-shell">
      <TopBar onOpenChecklist={() => setIsChecklistOpen(true)} />
      <div className="workspace">
        <aside className="side-panel">
          <WorkflowNavPanel />
        </aside>

        <section className="content-area">
          <section className="overview-band" aria-labelledby="overview-title">
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
          </section>

          <section id="phase-01" className="section-block">
            <SectionTitle
              icon={FileText}
              kicker="第一步"
              title="拿到剧本后先做资产核对"
              desc="这一阶段面向动画师，目标是理清本集需要的人设、场景、道具和前后集衔接要求，确认素材表是否齐全，再进入动画制作。"
            />
            <div className="task-panel">
              <h3>动画制作前核对记录</h3>
              <ul className="check-list">
                <li>理清本集需要的人设、场景、道具、宠物、系统等制作资产。</li>
                <li>在表格中核对资产是否齐全，如不齐全，需要及时和编导说明。</li>
                <li>确认本集是否涉及人物换装、宠物换装、同场景变化或道具、系统变化。</li>
                <li>和前后集制作同学协商人物站位、人物背景是否一致，能否顺利衔接上下集。</li>
              </ul>
              <div className="script-alert">
                <AlertTriangle size={20} />
                <p>
                  <strong>注意：</strong>
                  新的人设、场景、道具或换装方案需要提交编导老师审核，确认通过后再继续制作。
                </p>
              </div>
            </div>
          </section>

          <section id="phase-02" className="section-block">
            <SectionTitle
              icon={UserRoundCog}
              kicker="第二步"
              title="制作人设、场景和道具"
              desc="编导会拆分好人设、场景和道具描述，制作同学按描述各做三版左右，审核通过后将最终通过图沉淀下来。"
            />
            <div className="production-grid">
              <ProductionColumn
                title="人设制作区"
                icon={PencilRuler}
                brief="按照编导拆分的人物年龄、岗位、气质、服装和动作描述制作。"
              />
              <ProductionColumn
                title="场景制作区"
                icon={Layers3}
                brief="明确场景外观、时间光源、室内外空间类型、科技等级或异能痕迹，并补充冷、危险、暧昧、压迫等氛围关键词。"
              />
              <ProductionColumn
                title="道具制作区"
                icon={Image}
                brief="按照道具、系统界面、特殊物件的造型和质感要求制作。"
              />
            </div>
            <WorkflowSectionGroup
              title="人设、场景和道具制作方法"
              sections={assetMethodSections}
            />
          </section>

          <section id="phase-03" className="section-block">
            <SectionTitle
              icon={Clapperboard}
              kicker="第三步"
              title="剧本转分镜流程"
              desc="这一环节的具体剧本优化方案后续补充，当前页面先保留流程位置。"
            />
            <div className="script-placeholder">
              <div>
                <p className="eyebrow">剧本优化</p>
                <h3>剧本转分镜方案待补充</h3>
                <p>这里后续放新的剧本优化和转分镜方案。</p>
              </div>
            </div>
          </section>

          <section id="phase-04" className="section-block">
            <SectionTitle
              icon={WandSparkles}
              kicker="第四步"
              title="操作方法"
              desc="这里集中放置剧集制作关键词优化、分镜提示词排版和图片教学示例，方便动画师按步骤参考。"
            />
            <WorkflowSectionGroup
              title="剧集制作关键词优化"
              desc="将真人写实质感、分镜图、多人物站位和背景补救方法放在分镜与提示词阶段使用。"
              sections={keywordOptimizationSection ? [keywordOptimizationSection] : []}
              showSectionIndex={false}
            />

            <div className="storyboard-shell">
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

            <StoryboardReferencePanel />
          </section>

          <section id="phase-05" className="section-block">
            <SectionTitle
              icon={ClipboardCheck}
              kicker="第五步"
              title="注意事项"
              desc="这里集中放置生成、衔接、成片检查和配音错乱处理相关注意事项。"
            />
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

            <div className="notice-panel">
              <div className="notice-title">
                <div>
                  <p className="eyebrow">Word 文档整理</p>
                  <h3>Seedance 制作注意事项</h3>
                </div>
                <div className="notice-badge">
                  <AlertTriangle size={18} />
                  生成前必查
                </div>
              </div>
              <div className="notice-grid">
                {seedanceNotices.map((notice) => (
                  <NoticeCard key={notice.title} {...notice} />
                ))}
              </div>
            </div>

            <WorkflowSectionGroup
              title="配音错乱处理"
              desc="配音问题放在注意事项阶段，便于动画师按角色、人设图、音频顺序复核。"
              sections={voiceIssueSection ? [voiceIssueSection] : []}
              showSectionIndex={false}
            />
          </section>
        </section>
      </div>
      <ChecklistModal isOpen={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} />
    </main>
  );
}

function TopBar({ onOpenChecklist }) {
  return (
    <header className="top-bar">
      <div className="top-inner">
        <div className="brand-mark">
          <Clapperboard size={22} />
          <span>入职培训制作流程</span>
        </div>
        <div className="top-actions">
          <a className="ghost-button" href="/script-assets/trap-of-love-script.pdf" target="_blank" rel="noreferrer">
            <FileText size={18} />
            剧本
          </a>
          <button className="primary-button" type="button" onClick={onOpenChecklist}>
            <ClipboardCheck size={18} />
            审核清单
          </button>
        </div>
      </div>
    </header>
  );
}

function WorkflowNavPanel() {
  return (
    <>
      <div className="project-card">
        <div className="project-icon">
          <PlaySquare size={24} />
        </div>
        <div>
          <p className="eyebrow">制作项目</p>
          <h1>新员工入职培训</h1>
        </div>
      </div>
      <nav className="phase-nav" aria-label="制作流程">
        {phases.map((phase) => {
          const Icon = phase.icon;
          return (
            <a key={phase.number} href={`#phase-${phase.number}`} className="phase-link">
              <span className="phase-index">{phase.number}</span>
              <span>
                <strong>{phase.title}</strong>
                <small>{phase.status}</small>
              </span>
              <Icon size={18} />
            </a>
          );
        })}
      </nav>
    </>
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

function StoryboardReferencePanel() {
  const imageSrc = '/sd2-assets/storyboard-reference.png';

  return (
    <div className="storyboard-reference-panel">
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

function PreviewableImage({ src, alt, previewAlt = alt, triggerClassName }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <button
        className={triggerClassName}
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        aria-label={`放大查看${alt}`}
      >
        <img src={src} alt={alt} />
        <span className="image-zoom-label">
          <Maximize2 size={18} />
          点击放大
        </span>
      </button>
      {isPreviewOpen ? (
        <div
          className="image-preview-backdrop"
          role="presentation"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="image-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={previewAlt}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="image-preview-close" type="button" onClick={() => setIsPreviewOpen(false)} aria-label="关闭大图">
              <X size={22} />
            </button>
            <img src={src} alt={previewAlt} />
          </div>
        </div>
      ) : null}
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
  title,
  icon: Icon,
  brief,
}) {
  return (
    <div className="production-column">
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

function WorkflowSectionGroup({ title, desc, sections, showSectionIndex = true }) {
  if (!sections.length) {
    return null;
  }

  return (
    <div className="workflow-methods">
      <div className="workflow-methods-head">
        <div>
          <p className="eyebrow">操作方法</p>
          <h3>{title}</h3>
          {desc ? <p>{desc}</p> : null}
        </div>
      </div>
      <div className="doc-section-list">
        {sections.map((section, sectionIndex) => {
          const displayTitle = showSectionIndex ? section.title : section.title.replace(/^\d+\./, '');

          return (
            <article className="doc-section-card" key={section.title}>
              <div className={showSectionIndex ? 'doc-section-head' : 'doc-section-head doc-section-head-no-index'}>
                {showSectionIndex ? <span>{String(sectionIndex + 1).padStart(2, '0')}</span> : null}
                <h3>{displayTitle}</h3>
              </div>
              <div className="doc-block-list">
                {section.blocks.map((block, blockIndex) => (
                  <DocumentBlock
                    block={block}
                    blockIndex={blockIndex}
                    key={`${section.title}-${blockIndex}`}
                    sectionTitle={displayTitle}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DocumentBlock({ block, blockIndex, sectionTitle }) {
  if (block.type === 'table') {
    return (
      <div className="doc-block">
        <div className="doc-table-wrap">
          <table className="doc-table">
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${blockIndex}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${blockIndex}-${rowIndex}-${cellIndex}`}>{cell}</td>
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

  return (
    <div className={`doc-block ${block.role === 'subhead' ? 'is-subhead' : ''}`}>
      {block.text ? <p>{block.text}</p> : null}
      <DocumentImages images={block.images} sectionTitle={sectionTitle} blockIndex={blockIndex} />
    </div>
  );
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

function NoticeCard({ icon: Icon, title, points }) {
  return (
    <article className="notice-card">
      <div className="notice-card-head">
        <Icon size={22} />
        <h4>{title}</h4>
      </div>
      <ul>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </article>
  );
}

export default App;
