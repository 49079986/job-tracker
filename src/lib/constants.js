export const STATUSES = ['已投递', '待完善投递', '测评', '面试中', '等待结果', 'Offer', '拒绝', '撤回'];

/** 职位行业预设选项（编辑时也可以自行输入其他行业） */
export const INDUSTRIES = [
  '生物医药', '科研/教育', '互联网/游戏/传媒', 'IT/软件/AI', '半导体/电子', '汽车/机械/制造', '新能源/化工/材料',
  '金融/保险', '快消/食品', '零售/时尚/奢侈品', '检测认证', '咨询/人力/服务', '房地产/建筑', '电商/贸易/物流',
];
export const UNCATEGORIZED = '未分类';
export const PAGE_SIZES = [20, 50, 100, 0]; // 0 = 全部

export const STATUS_TONE = {
  '已投递': 'neutral',
  '待完善投递': 'warn',
  '测评': 'info',
  '面试中': 'accent',
  '等待结果': 'info',
  Offer: 'success',
  '拒绝': 'muted',
  '撤回': 'muted',
};

export const SOURCE_LABEL = { excel: 'Excel', feishu: '飞书', manual: '手动', import: '导入', demo: '示例' };

/** 网站字段 ↔ 数据库列。导出 JSON 使用左侧（camelCase）字段名。 */
export const FIELD_MAP = {
  id: 'id',
  legacyId: 'legacy_id',
  company: 'company',
  position: 'position',
  status: 'status',
  appliedDate: 'applied_date',
  nextAction: 'next_action',
  lastProgressDate: 'last_progress_date',
  lastProgressSummary: 'last_progress_summary',
  confirmedEventAt: 'confirmed_event_at',
  eventTypeAndTimezone: 'event_type_and_timezone',
  jobCode: 'job_code',
  location: 'location',
  jobType: 'job_type',
  industry: 'industry',
  starred: 'starred',
  salary: 'salary',
  channel: 'channel',
  jobUrl: 'job_url',
  jobUrlLabel: 'job_url_label',
  sourceDocLabel: 'source_doc_label',
  notes: 'notes',
  sources: 'sources',
  sourceRefs: 'source_refs',
  timeline: 'timeline',
  flags: 'flags',
  raw: 'raw',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const READONLY_FIELDS = ['createdAt', 'updatedAt'];

/** 编辑表单里的字段。group: main = 主要信息；more = 折叠在「更多信息」里 */
export const FORM_FIELDS = [
  { key: 'company', label: '公司', required: true, group: 'main' },
  { key: 'position', label: '岗位', required: true, group: 'main' },
  { key: 'industry', label: '职位行业', type: 'industry', group: 'main' },
  { key: 'status', label: '投递状态', type: 'status', group: 'main' },
  { key: 'appliedDate', label: '投递日期', type: 'date', group: 'main' },
  { key: 'lastProgressDate', label: '最近进展日期', type: 'date', group: 'main' },
  { key: 'location', label: '工作地点', group: 'main' },
  { key: 'salary', label: '薪资水平', placeholder: '如 1.2-1.6万·13薪', group: 'main' },
  { key: 'jobUrl', label: '招聘链接', type: 'url', wide: true, group: 'main' },
  { key: 'jobUrlLabel', label: '链接文字', group: 'more' },
  { key: 'nextAction', label: '下一步行动', group: 'more' },
  { key: 'lastProgressSummary', label: '最近进展摘要', type: 'textarea', group: 'more' },
  { key: 'jobCode', label: '岗位编号', group: 'more' },
  { key: 'jobType', label: '工作类型', group: 'more' },
  { key: 'channel', label: '投递渠道', group: 'more' },
  { key: 'confirmedEventAt', label: '已确认面试或截止时间', group: 'more' },
  { key: 'eventTypeAndTimezone', label: '时间类型及原始时区', group: 'more' },
  { key: 'notes', label: '备注', type: 'textarea', wide: true, group: 'more' },
];

export const CSV_COLUMNS = [
  ['id', 'ID'], ['legacyId', '原编号'], ['starred', '精投'], ['company', '公司'], ['position', '岗位'], ['status', '状态'],
  ['appliedDate', '投递日期'], ['nextAction', '下一步行动'], ['lastProgressDate', '最近进展日期'],
  ['lastProgressSummary', '最近进展摘要'], ['jobCode', '岗位编号'], ['location', '工作地点'], ['salary', '薪资水平'],
  ['jobType', '工作类型'], ['industry', '职位行业'], ['channel', '投递渠道'], ['jobUrl', '招聘链接'], ['jobUrlLabel', '链接文字'],
  ['confirmedEventAt', '已确认面试或截止时间'], ['eventTypeAndTimezone', '时间类型及原始时区'],
  ['notes', '备注'], ['sources', '来源'], ['createdAt', '创建时间'], ['updatedAt', '更新时间'],
];
