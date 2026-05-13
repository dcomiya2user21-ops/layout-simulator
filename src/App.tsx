import {
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from 'react';

type LayoutItem = {
  id: number;
  type: 'furniture' | 'label';
  name: string;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  color: string;
  rotation: number;
};

type FurnitureTemplate = {
  id: number;
  name: string;
  widthMm: number;
  heightMm: number;
  color: string;
};

type MemoItem = {
  id: number;
  author: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type SaveData = {
  items: LayoutItem[];
  templates: FurnitureTemplate[];
  memos: MemoItem[];
  finalUpdateMemo: string;
  updatedBy: string;
  selectedId: number | null;
  selectedTemplateId: number | null;
  mmPerGrid: number;
  showGrid: boolean;
  showGuideLine: boolean;
  guideX: number;
  guideY: number;
  guideLengthPx: number;
  guideRealMm: number;
  backgroundImage: string | null;
};

type SavedLayout = {
  id: number;
  name: string;
  savedAt: string;
  data: SaveData;
};

type LeftSection =
  | 'guide'
  | 'background'
  | 'furniture'
  | 'scale'
  | 'save'
  | 'saved'
  | 'display';

type RightTab = 'settings' | 'comments';

type SectionProps = {
  id: LeftSection;
  title: string;
  isOpen: boolean;
  onToggle: (id: LeftSection) => void;
  children: ReactNode;
};

const STORAGE_KEY = 'office-layout-planner-menu-organized-fixed-input';

const getDateText = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const makeSaveName = (name: string) => {
  const trimmedName = name.trim() || '名前';
  return `${getDateText()}_レイアウト案_${trimmedName}`;
};

const getTodayName = () => {
  return makeSaveName('名前');
};

const getNowText = () => {
  return new Date().toLocaleString();
};

function Section({ id, title, isOpen, onToggle, children }: SectionProps) {
  return (
    <div style={sectionWrapStyle}>
      <button onClick={() => onToggle(id)} style={sectionHeaderStyle}>
        <span>
          {isOpen ? '▼' : '▶'} {title}
        </span>
      </button>
      {isOpen && <div style={sectionBodyStyle}>{children}</div>}
    </div>
  );
}

export default function App() {
  const stageWidth = 1100;
  const stageHeight = 778;
  const gridPx = 32;
  const furnitureScale = 2;

  const [items, setItems] = useState<LayoutItem[]>([]);
  const [templates, setTemplates] = useState<FurnitureTemplate[]>([
    { id: 1, name: '事務机', widthMm: 1200, heightMm: 700, color: '#bfdbfe' },
    { id: 2, name: '椅子', widthMm: 500, heightMm: 500, color: '#bbf7d0' },
    { id: 3, name: '長机', widthMm: 1800, heightMm: 450, color: '#fde68a' },
    { id: 4, name: '会議机', widthMm: 1800, heightMm: 900, color: '#ddd6fe' },
    {
      id: 5,
      name: '棚・ロッカー',
      widthMm: 900,
      heightMm: 450,
      color: '#e5e7eb',
    },
  ]);

  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [newMemoAuthor, setNewMemoAuthor] = useState('');
  const [newMemoText, setNewMemoText] = useState('');
  const [includeMemosInExport, setIncludeMemosInExport] = useState(true);

  const [updatedBy, setUpdatedBy] = useState('');
  const [finalUpdateMemo, setFinalUpdateMemo] = useState('');

  const [openSections, setOpenSections] = useState<
    Record<LeftSection, boolean>
  >({
    guide: false,
    background: false,
    furniture: false,
    scale: false,
    save: false,
    saved: false,
    display: false,
  });

  const [rightTab, setRightTab] = useState<RightTab>('settings');

  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  const [saveName, setSaveName] = useState(getTodayName());
  const [saveMessage, setSaveMessage] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    1
  );
  const [moveAmount, setMoveAmount] = useState(10);

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [wideMode, setWideMode] = useState(false);

  const [mmPerGrid, setMmPerGrid] = useState(1000);
  const [showGuideLine, setShowGuideLine] = useState(true);
  const [guideX, setGuideX] = useState(130);
  const [guideY, setGuideY] = useState(240);
  const [guideLengthPx, setGuideLengthPx] = useState(190);
  const [guideRealMm, setGuideRealMm] = useState(5055);

  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  );

  const toggleSection = (section: LeftSection) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const handleUpdatedByChange = (value: string) => {
    setUpdatedBy(value);
    setSaveName(makeSaveName(value));
  };

  const mmToPx = (mm: number) => {
    return (mm / mmPerGrid) * gridPx * furnitureScale;
  };

  const getCurrentSaveData = (): SaveData => {
    return {
      items,
      templates,
      memos,
      finalUpdateMemo,
      updatedBy,
      selectedId,
      selectedTemplateId,
      mmPerGrid,
      showGrid,
      showGuideLine,
      guideX,
      guideY,
      guideLengthPx,
      guideRealMm,
      backgroundImage,
    };
  };

  const applySaveData = (data: SaveData) => {
    setItems(data.items || []);
    setTemplates(data.templates || []);
    setMemos(data.memos || []);
    setFinalUpdateMemo(data.finalUpdateMemo || '');
    setUpdatedBy(data.updatedBy || '');
    setSelectedId(data.selectedId);
    setSelectedTemplateId(data.selectedTemplateId);
    setMmPerGrid(data.mmPerGrid || 1000);
    setShowGrid(data.showGrid ?? true);
    setShowGuideLine(data.showGuideLine ?? true);
    setGuideX(data.guideX || 130);
    setGuideY(data.guideY || 240);
    setGuideLengthPx(data.guideLengthPx || 190);
    setGuideRealMm(data.guideRealMm || 5055);
    setBackgroundImage(data.backgroundImage || null);
  };

  const saveLayoutsToStorage = (nextLayouts: SavedLayout[]) => {
    setSavedLayouts(nextLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLayouts));
  };

  const saveCurrentLayout = () => {
    const trimmedName = saveName.trim();

    if (!trimmedName) {
      setSaveMessage('保存名を入力してください。');
      return;
    }

    const newSave: SavedLayout = {
      id: Date.now(),
      name: trimmedName,
      savedAt: getNowText(),
      data: getCurrentSaveData(),
    };

    saveLayoutsToStorage([newSave, ...savedLayouts]);
    setSaveMessage(`「${trimmedName}」を保存しました。`);
  };

  const loadSavedLayout = (layout: SavedLayout) => {
    const ok = window.confirm(
      '現在の作業内容を上書きして、この保存データを読み込みますか？'
    );
    if (!ok) return;

    applySaveData(layout.data);
    setSaveName(layout.name);
    setSaveMessage(`「${layout.name}」を読み込みました。`);
  };

  const deleteSavedLayout = (id: number) => {
    const ok = window.confirm('この保存データを削除しますか？');
    if (!ok) return;

    saveLayoutsToStorage(savedLayouts.filter((layout) => layout.id !== id));
    setSaveMessage('保存データを削除しました。');
  };

  const exportCurrentLayoutToFile = () => {
    const trimmedName = saveName.trim() || getTodayName();
    const currentData = getCurrentSaveData();

    const exportData: SavedLayout = {
      id: Date.now(),
      name: trimmedName,
      savedAt: getNowText(),
      data: {
        ...currentData,
        memos: includeMemosInExport ? currentData.memos : [],
      },
    };

    const jsonText = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const safeFileName = trimmedName.replace(/[\\/:*?"<>|]/g, '_');
    const suffix = includeMemosInExport ? '' : '_コメントなし';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}${suffix}.txt`;
    link.click();

    URL.revokeObjectURL(url);

    setSaveMessage(
      includeMemosInExport
        ? `「${trimmedName}.txt」をコメント込みで書き出しました。`
        : `「${trimmedName}_コメントなし.txt」を書き出しました。`
    );
  };

  const importLayoutFromFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ok = window.confirm(
      '現在の作業内容を上書きして、txtファイルを読み込みますか？'
    );
    if (!ok) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result);
        const imported: SavedLayout = JSON.parse(text);

        if (!imported.data || !imported.name) {
          setSaveMessage('読み込めないファイル形式です。');
          return;
        }

        const importedLayout: SavedLayout = {
          ...imported,
          id: Date.now(),
          savedAt: getNowText(),
        };

        applySaveData(importedLayout.data);
        saveLayoutsToStorage([importedLayout, ...savedLayouts]);
        setSaveName(importedLayout.name);
        setSaveMessage(`「${importedLayout.name}」を読み込みました。`);
      } catch {
        setSaveMessage('ファイルの読み込みに失敗しました。');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setBackgroundImage(String(reader.result));
      setSaveMessage('見取り図画像を読み込みました。');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addFurnitureFromTemplate = (template: FurnitureTemplate) => {
    const newItem: LayoutItem = {
      id: Date.now(),
      type: 'furniture',
      name: template.name,
      x: 165,
      y: 385,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      color: template.color,
      rotation: 0,
    };

    setItems([...items, newItem]);
    setSelectedId(newItem.id);
    setSaveMessage(`${template.name}を追加しました。`);
  };

  const addNewTemplate = () => {
    const newTemplate: FurnitureTemplate = {
      id: Date.now(),
      name: '新しい家具',
      widthMm: 1000,
      heightMm: 500,
      color: '#e5e7eb',
    };

    setTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
  };

  const updateSelectedTemplate = (updates: Partial<FurnitureTemplate>) => {
    if (selectedTemplateId === null) return;

    setTemplates(
      templates.map((template) =>
        template.id === selectedTemplateId
          ? { ...template, ...updates }
          : template
      )
    );
  };

  const deleteSelectedTemplate = () => {
    if (selectedTemplateId === null) return;

    const ok = window.confirm('このテンプレを削除しますか？');
    if (!ok) return;

    const nextTemplates = templates.filter(
      (template) => template.id !== selectedTemplateId
    );

    setTemplates(nextTemplates);
    setSelectedTemplateId(
      nextTemplates.length > 0 ? nextTemplates[0].id : null
    );
  };

  const saveSelectedItemAsTemplate = () => {
    if (!selectedItem || selectedItem.type !== 'furniture') return;

    const newTemplate: FurnitureTemplate = {
      id: Date.now(),
      name: selectedItem.name,
      widthMm: selectedItem.widthMm,
      heightMm: selectedItem.heightMm,
      color: selectedItem.color,
    };

    setTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setSaveMessage('選択中の家具をテンプレに保存しました。');
  };

  const addLabel = () => {
    const newItem: LayoutItem = {
      id: Date.now(),
      type: 'label',
      name: 'メモ',
      x: 190,
      y: 430,
      widthMm: 1200,
      heightMm: 400,
      color: '#fde68a',
      rotation: 0,
    };

    setItems([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const updateSelectedItem = (updates: Partial<LayoutItem>) => {
    if (selectedId === null) return;

    setItems(
      items.map((item) =>
        item.id === selectedId ? { ...item, ...updates } : item
      )
    );
  };

  const moveSelectedItem = (dx: number, dy: number) => {
    if (!selectedItem) return;

    updateSelectedItem({
      x: selectedItem.x + dx,
      y: selectedItem.y + dy,
    });
  };

  const rotateSelectedItem = (degrees: number) => {
    if (!selectedItem) return;

    updateSelectedItem({
      rotation: (selectedItem.rotation + degrees) % 360,
    });
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;

    const newItem: LayoutItem = {
      ...selectedItem,
      id: Date.now(),
      x: selectedItem.x + 30,
      y: selectedItem.y + 30,
      name: selectedItem.name + ' コピー',
    };

    setItems([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const deleteSelectedItem = () => {
    if (selectedId === null) return;

    const ok = window.confirm('選択中のものを削除しますか？');
    if (!ok) return;

    const nextItems = items.filter((item) => item.id !== selectedId);
    setItems(nextItems);
    setSelectedId(nextItems.length > 0 ? nextItems[0].id : null);
  };

  const clearAllItems = () => {
    const ok = window.confirm('配置した家具・ラベルをすべて削除しますか？');
    if (!ok) return;

    setItems([]);
    setSelectedId(null);
    setSaveMessage('家具・ラベルをすべて削除しました。');
  };

  const applyEasySizeMatch = () => {
    if (guideLengthPx <= 0 || guideRealMm <= 0) return;

    const newMmPerGrid =
      (guideRealMm / guideLengthPx) * gridPx * furnitureScale;
    setMmPerGrid(Math.round(newMmPerGrid));
    setSaveMessage('サイズ合わせを反映しました。');
  };

  const addMemo = () => {
    const author = newMemoAuthor.trim();
    const text = newMemoText.trim();

    if (!author) {
      setSaveMessage('記入者を入力してください。');
      return;
    }

    if (!text) {
      setSaveMessage('コメントを入力してください。');
      return;
    }

    const now = getNowText();

    const memo: MemoItem = {
      id: Date.now(),
      author,
      text,
      createdAt: now,
      updatedAt: now,
    };

    setMemos([memo, ...memos]);
    setNewMemoText('');
    setSaveMessage('コメントを追加しました。');
  };

  const editMemo = (memo: MemoItem) => {
    const nextAuthor = window.prompt('記入者を修正してください。', memo.author);
    if (nextAuthor === null) return;

    const trimmedAuthor = nextAuthor.trim();

    if (!trimmedAuthor) {
      setSaveMessage('記入者は空欄にできません。');
      return;
    }

    const nextText = window.prompt('コメントを修正してください。', memo.text);
    if (nextText === null) return;

    const trimmedText = nextText.trim();

    if (!trimmedText) {
      setSaveMessage('空のコメントにはできません。');
      return;
    }

    setMemos(
      memos.map((item) =>
        item.id === memo.id
          ? {
              ...item,
              author: trimmedAuthor,
              text: trimmedText,
              updatedAt: getNowText(),
            }
          : item
      )
    );

    setSaveMessage('コメントを修正しました。');
  };

  const deleteMemo = (id: number) => {
    const ok = window.confirm('このコメントを削除しますか？');
    if (!ok) return;

    setMemos(memos.filter((memo) => memo.id !== id));
    setSaveMessage('コメントを削除しました。');
  };

  const printLayout = () => {
    setSaveMessage(
      '印刷画面を開きます。PDF保存時は「背景のグラフィック」にチェックしてください。'
    );

    setTimeout(() => {
      window.print();
    }, 600);
  };

  const loadImageForCanvas = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const exportLayoutImage = async () => {
    const canvasScale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = stageWidth * canvasScale;
    canvas.height = stageHeight * canvasScale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(canvasScale, canvasScale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, stageWidth, stageHeight);

    if (backgroundImage) {
      try {
        const bg = await loadImageForCanvas(backgroundImage);
        ctx.drawImage(bg, 0, 0, stageWidth, stageHeight);
      } catch {
        setSaveMessage('背景画像の書き出しに失敗しました。');
        return;
      }
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= stageWidth; x += gridPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, stageHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= stageHeight; y += gridPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(stageWidth, y);
        ctx.stroke();
      }
    }

    items.forEach((item) => {
      const width = mmToPx(item.widthMm);
      const height = mmToPx(item.heightMm);
      const centerX = item.x + width / 2;
      const centerY = item.y + height / 2;
      const isLabel = item.type === 'label';
      const isChair = item.name.includes('椅子');

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      ctx.fillStyle = item.color;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;

      if (isChair) {
        ctx.beginPath();
        ctx.ellipse(
          width / 2,
          height / 2,
          width / 2,
          height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      } else {
        drawRoundedRect(ctx, 0, 0, width, height, isLabel ? 4 : 2);
        ctx.fill();
        ctx.stroke();
      }

      const fontSize = Math.max(
        8,
        Math.min(14, Math.min(width, height) * 0.22)
      );
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = isLabel ? `📍 ${item.name}` : item.name;
      ctx.save();
      ctx.beginPath();
      ctx.rect(2, 2, Math.max(1, width - 4), Math.max(1, height - 4));
      ctx.clip();
      ctx.fillText(text, width / 2, height / 2, Math.max(1, width - 6));
      ctx.restore();

      ctx.restore();
    });

    const safeFileName = (saveName.trim() || getTodayName()).replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${safeFileName}.png`;
    link.click();

    setSaveMessage('画像として保存しました。');
  };

  const colors = [
    { label: '青', value: '#bfdbfe' },
    { label: '緑', value: '#bbf7d0' },
    { label: '黄', value: '#fde68a' },
    { label: '灰', value: '#e5e7eb' },
    { label: '桃', value: '#fecdd3' },
    { label: '紫', value: '#ddd6fe' },
  ];

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            .print-hide {
              display: none !important;
            }

            #app-root {
              display: block !important;
              height: auto !important;
              background: white !important;
            }

            #print-wrapper {
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              background: white !important;
            }

            #layout-print-area {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 1100px !important;
              height: 778px !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              overflow: hidden !important;
              background: white !important;
              transform: scale(0.96);
              transform-origin: top left;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .layout-background-image {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .layout-item {
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .selected-layout-item {
              border: 1px solid #333 !important;
            }
          }
        `}
      </style>

      <div id="app-root" style={appStyle}>
        {!wideMode && (
          <div className="print-hide" style={leftPanelStyle}>
            <h2 style={panelTitleStyle}>レイアウトシミュレーター</h2>

            <button onClick={() => setWideMode(true)} style={blackButtonStyle}>
              配置モード
            </button>

            <Section
              id="guide"
              title="使い方ガイド"
              isOpen={openSections.guide}
              onToggle={toggleSection}
            >
              <ol style={guideListStyle}>
                <li>見取り図画像を読み込む</li>
                <li>赤い線でサイズ合わせをする</li>
                <li>家具テンプレから家具を追加する</li>
                <li>右側で位置・大きさを調整する</li>
                <li>保存・PDF出力・画像保存を行う</li>
              </ol>
            </Section>

            <Section
              id="background"
              title="見取り図画像"
              isOpen={openSections.background}
              onToggle={toggleSection}
            >
              <p style={helpTextStyle}>背景用の見取り図画像を読み込みます。</p>

              <label style={fileButtonStyle}>
                見取り図画像を選ぶ
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleBackgroundUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <div style={fileStatusStyle}>
                {backgroundImage ? '読み込み済み' : '未選択'}
              </div>

              {backgroundImage && (
                <button
                  onClick={() => setBackgroundImage(null)}
                  style={plainButtonStyle}
                >
                  背景を外す
                </button>
              )}
            </Section>

            <Section
              id="furniture"
              title="家具追加"
              isOpen={openSections.furniture}
              onToggle={toggleSection}
            >
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    addFurnitureFromTemplate(template);
                    setSelectedTemplateId(template.id);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    border:
                      selectedTemplateId === template.id
                        ? '3px solid #2563eb'
                        : '1px solid #cbd5e1',
                    background: template.color,
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  ➕ {template.name}
                  <br />
                  <span style={{ fontSize: '11px', color: '#475569' }}>
                    {template.widthMm} × {template.heightMm}mm
                  </span>
                </button>
              ))}

              <button onClick={addNewTemplate} style={plainButtonStyle}>
                ＋ テンプレ追加
              </button>

              <button onClick={addLabel} style={yellowButtonStyle}>
                📍 ラベル追加
              </button>
            </Section>

            <Section
              id="scale"
              title="サイズ合わせ"
              isOpen={openSections.scale}
              onToggle={toggleSection}
            >
              <label style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={showGuideLine}
                  onChange={(e) => setShowGuideLine(e.target.checked)}
                />
                赤い線
              </label>

              <label style={smallLabelStyle}>赤い線の実寸mm</label>
              <input
                type="number"
                value={guideRealMm}
                onChange={(e) => setGuideRealMm(Number(e.target.value) || 1)}
                style={inputStyle}
              />

              <button
                onClick={applyEasySizeMatch}
                style={blueActionButtonStyle}
              >
                サイズを合わせる
              </button>

              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  onClick={() =>
                    setGuideLengthPx(Math.max(20, guideLengthPx - 10))
                  }
                  style={smallButtonStyle}
                >
                  ←短く
                </button>

                <button
                  onClick={() => setGuideLengthPx(guideLengthPx + 10)}
                  style={smallButtonStyle}
                >
                  長く→
                </button>
              </div>

              <div style={moveGridStyle}>
                <div />
                <button
                  onClick={() => setGuideY(guideY - 10)}
                  style={moveButtonStyle}
                >
                  ↑
                </button>
                <div />
                <button
                  onClick={() => setGuideX(guideX - 10)}
                  style={moveButtonStyle}
                >
                  ←
                </button>
                <button
                  onClick={() => setGuideY(guideY + 10)}
                  style={moveButtonStyle}
                >
                  ↓
                </button>
                <button
                  onClick={() => setGuideX(guideX + 10)}
                  style={moveButtonStyle}
                >
                  →
                </button>
              </div>
            </Section>

            <Section
              id="save"
              title="保存・出力"
              isOpen={openSections.save}
              onToggle={toggleSection}
            >
              <label style={smallLabelStyle}>更新者名</label>
              <input
                value={updatedBy}
                onChange={(e) => handleUpdatedByChange(e.target.value)}
                placeholder="例：名前"
                style={inputStyle}
              />
              <div style={tinyHelpTextStyle}>
                更新者名を入力すると、保存名に自動で反映されます。
              </div>

              <label style={smallLabelStyle}>保存名</label>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                style={inputStyle}
              />

              <label style={smallLabelStyle}>最終更新メモ</label>
              <textarea
                value={finalUpdateMemo}
                onChange={(e) => setFinalUpdateMemo(e.target.value)}
                placeholder="例：机を2台追加、棚を右側へ移動"
                style={smallTextareaStyle}
              />

              <button onClick={saveCurrentLayout} style={blueActionButtonStyle}>
                保存
              </button>

              <label style={checkboxLineStyle}>
                <input
                  type="checkbox"
                  checked={includeMemosInExport}
                  onChange={(e) => setIncludeMemosInExport(e.target.checked)}
                />
                txt書き出しにコメント・記入者を含める
              </label>

              <button
                onClick={exportCurrentLayoutToFile}
                style={plainButtonStyle}
              >
                txt書き出し
              </button>

              <label style={plainButtonStyle}>
                txt読み込み
                <input
                  type="file"
                  accept=".txt,.json"
                  onChange={importLayoutFromFile}
                  style={{ display: 'none' }}
                />
              </label>

              <button onClick={printLayout} style={blackButtonStyle}>
                PDF/印刷
              </button>

              <button onClick={exportLayoutImage} style={greenButtonStyle}>
                画像として保存
              </button>

              <p style={helpTextStyle}>
                PDF保存時は、印刷画面で「背景のグラフィック」にチェックしてください。
                うまく出ない場合は画像として保存してからPDF化してください。
              </p>

              {saveMessage && <div style={messageBoxStyle}>{saveMessage}</div>}
            </Section>

            <Section
              id="saved"
              title="保存済み"
              isOpen={openSections.saved}
              onToggle={toggleSection}
            >
              {savedLayouts.length === 0 ? (
                <p style={helpTextStyle}>まだ保存がありません。</p>
              ) : (
                savedLayouts.map((layout) => (
                  <div key={layout.id} style={savedCardStyle}>
                    <strong style={{ fontSize: '13px' }}>{layout.name}</strong>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        marginTop: '4px',
                      }}
                    >
                      {layout.savedAt}
                    </div>

                    {layout.data?.finalUpdateMemo && (
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          color: '#475569',
                        }}
                      >
                        {layout.data.finalUpdateMemo}
                      </div>
                    )}

                    <button
                      onClick={() => loadSavedLayout(layout)}
                      style={smallPlainButtonStyle}
                    >
                      読込
                    </button>

                    <button
                      onClick={() => deleteSavedLayout(layout.id)}
                      style={smallDangerButtonStyle}
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </Section>

            <Section
              id="display"
              title="表示"
              isOpen={openSections.display}
              onToggle={toggleSection}
            >
              <label style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                グリッド
              </label>

              <div
                style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}
              >
                1マス = {mmPerGrid}mm
              </div>

              <button onClick={clearAllItems} style={dangerOutlineButtonStyle}>
                家具・ラベルを全削除
              </button>
            </Section>
          </div>
        )}

        <div id="print-wrapper" style={centerWrapperStyle}>
          <div id="layout-print-area" style={stageStyle}>
            {backgroundImage ? (
              <img
                className="layout-background-image"
                src={backgroundImage}
                alt="見取り図"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: 1,
                }}
              />
            ) : (
              <div style={emptyStageStyle}>
                左メニューから
                <br />
                見取り図画像を読み込んでください
              </div>
            )}

            {showGrid && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 2,
                  backgroundSize: `${gridPx}px ${gridPx}px`,
                  backgroundImage:
                    'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
                }}
              />
            )}

            {wideMode && (
              <button
                className="print-hide"
                onClick={() => setWideMode(false)}
                style={wideBackButtonStyle}
              >
                編集モードに戻る
              </button>
            )}

            {showGuideLine && (
              <div
                className="print-hide"
                style={{
                  position: 'absolute',
                  left: guideX,
                  top: guideY,
                  width: guideLengthPx,
                  height: '4px',
                  background: '#dc2626',
                  zIndex: 30,
                  boxShadow: '0 0 0 2px rgba(220,38,38,0.25)',
                }}
              >
                <div style={guideEndLeftStyle} />
                <div style={guideEndRightStyle} />
                <div style={guideLabelStyle}>サイズ合わせ線</div>
              </div>
            )}

            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const isLabel = item.type === 'label';
              const isChair = item.name.includes('椅子');

              const displayWidth = mmToPx(item.widthMm);
              const displayHeight = mmToPx(item.heightMm);

              const autoFontSize = Math.max(
                8,
                Math.min(14, Math.min(displayWidth, displayHeight) * 0.22)
              );

              return (
                <div
                  key={item.id}
                  className={`layout-item ${
                    isSelected ? 'selected-layout-item' : ''
                  }`}
                  onClick={() => setSelectedId(item.id)}
                  title={item.name}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: displayWidth,
                    height: displayHeight,
                    background: item.color,
                    borderRadius: isLabel ? '4px' : isChair ? '999px' : '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    border: isSelected
                      ? '3px solid #2563eb'
                      : '1px solid #475569',
                    cursor: 'pointer',
                    userSelect: 'none',
                    boxShadow: isSelected
                      ? '0 0 0 4px rgba(37, 99, 235, 0.18)'
                      : '0 1px 3px rgba(15,23,42,0.18)',
                    transform: `rotate(${item.rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease',
                    fontSize: autoFontSize,
                    color: '#0f172a',
                    zIndex: 20,
                    textAlign: 'center',
                    overflow: 'hidden',
                    padding: '2px',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    lineHeight: 1,
                  }}
                >
                  {isLabel ? `📍 ${item.name}` : item.name}
                </div>
              );
            })}
          </div>
        </div>

        {!wideMode && (
          <div className="print-hide" style={rightPanelStyle}>
            <h2 style={panelTitleStyle}>設定</h2>

            <div style={tabRowStyle}>
              <button
                onClick={() => setRightTab('settings')}
                style={
                  rightTab === 'settings'
                    ? activeTabButtonStyle
                    : tabButtonStyle
                }
              >
                家具設定
              </button>
              <button
                onClick={() => setRightTab('comments')}
                style={
                  rightTab === 'comments'
                    ? activeTabButtonStyle
                    : tabButtonStyle
                }
              >
                コメント
              </button>
            </div>

            {rightTab === 'settings' && (
              <>
                <div style={panelBoxStyle}>
                  <strong>🪑 テンプレ編集</strong>

                  {!selectedTemplate ? (
                    <p style={helpTextStyle}>テンプレを選択してください。</p>
                  ) : (
                    <>
                      <label style={smallLabelStyle}>テンプレ名</label>
                      <input
                        value={selectedTemplate.name}
                        onChange={(e) =>
                          updateSelectedTemplate({ name: e.target.value })
                        }
                        style={inputStyle}
                      />

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={smallLabelStyle}>横幅</label>
                          <input
                            type="number"
                            value={selectedTemplate.widthMm}
                            onChange={(e) =>
                              updateSelectedTemplate({
                                widthMm: Number(e.target.value),
                              })
                            }
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={smallLabelStyle}>奥行</label>
                          <input
                            type="number"
                            value={selectedTemplate.heightMm}
                            onChange={(e) =>
                              updateSelectedTemplate({
                                heightMm: Number(e.target.value),
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          addFurnitureFromTemplate(selectedTemplate)
                        }
                        style={blueActionButtonStyle}
                      >
                        このテンプレで追加
                      </button>

                      <button
                        onClick={deleteSelectedTemplate}
                        style={plainButtonStyle}
                      >
                        テンプレ削除
                      </button>
                    </>
                  )}
                </div>

                <div style={panelBoxStyle}>
                  <strong>選択中</strong>

                  {!selectedItem ? (
                    <p style={helpTextStyle}>
                      家具またはラベルを選択してください。
                    </p>
                  ) : (
                    <>
                      <label style={smallLabelStyle}>
                        {selectedItem.type === 'label' ? 'ラベル名' : '家具名'}
                      </label>
                      <input
                        value={selectedItem.name}
                        onChange={(e) =>
                          updateSelectedItem({ name: e.target.value })
                        }
                        style={inputStyle}
                      />

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={smallLabelStyle}>横幅</label>
                          <input
                            type="number"
                            value={selectedItem.widthMm}
                            onChange={(e) =>
                              updateSelectedItem({
                                widthMm: Number(e.target.value),
                              })
                            }
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={smallLabelStyle}>奥行</label>
                          <input
                            type="number"
                            value={selectedItem.heightMm}
                            onChange={(e) =>
                              updateSelectedItem({
                                heightMm: Number(e.target.value),
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {selectedItem.type === 'furniture' && (
                        <button
                          onClick={saveSelectedItemAsTemplate}
                          style={blueActionButtonStyle}
                        >
                          テンプレに保存
                        </button>
                      )}

                      <div style={infoBoxStyle}>
                        表示：横 約{Math.round(mmToPx(selectedItem.widthMm))}px
                        / 縦 約{Math.round(mmToPx(selectedItem.heightMm))}px
                      </div>

                      <label style={smallLabelStyle}>位置</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="number"
                          value={selectedItem.x}
                          onChange={(e) =>
                            updateSelectedItem({ x: Number(e.target.value) })
                          }
                          placeholder="X"
                          style={inputStyle}
                        />

                        <input
                          type="number"
                          value={selectedItem.y}
                          onChange={(e) =>
                            updateSelectedItem({ y: Number(e.target.value) })
                          }
                          placeholder="Y"
                          style={inputStyle}
                        />
                      </div>

                      <label style={smallLabelStyle}>移動幅</label>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginTop: '8px',
                        }}
                      >
                        {[5, 10, 50].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setMoveAmount(amount)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '6px',
                              border:
                                moveAmount === amount
                                  ? '3px solid #2563eb'
                                  : '1px solid #cbd5e1',
                              background:
                                moveAmount === amount ? '#dbeafe' : 'white',
                              cursor: 'pointer',
                            }}
                          >
                            {amount}
                          </button>
                        ))}
                      </div>

                      <div style={moveGridStyle}>
                        <div />
                        <button
                          onClick={() => moveSelectedItem(0, -moveAmount)}
                          style={moveButtonStyle}
                        >
                          ↑
                        </button>
                        <div />
                        <button
                          onClick={() => moveSelectedItem(-moveAmount, 0)}
                          style={moveButtonStyle}
                        >
                          ←
                        </button>
                        <button
                          onClick={() => moveSelectedItem(0, moveAmount)}
                          style={moveButtonStyle}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => moveSelectedItem(moveAmount, 0)}
                          style={moveButtonStyle}
                        >
                          →
                        </button>
                      </div>

                      <label style={smallLabelStyle}>回転</label>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginTop: '8px',
                        }}
                      >
                        <button
                          onClick={() => rotateSelectedItem(45)}
                          style={smallButtonStyle}
                        >
                          45°
                        </button>

                        <button
                          onClick={() => rotateSelectedItem(90)}
                          style={smallButtonStyle}
                        >
                          90°
                        </button>
                      </div>

                      <button
                        onClick={() => updateSelectedItem({ rotation: 0 })}
                        style={plainButtonStyle}
                      >
                        回転リセット
                      </button>

                      <label style={smallLabelStyle}>色</label>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginTop: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {colors.map((color) => (
                          <button
                            key={color.value}
                            onClick={() =>
                              updateSelectedItem({ color: color.value })
                            }
                            title={color.label}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '999px',
                              border:
                                selectedItem.color === color.value
                                  ? '3px solid #0f172a'
                                  : '1px solid #cbd5e1',
                              background: color.value,
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={duplicateSelectedItem}
                        style={copyButtonStyle}
                      >
                        複製
                      </button>

                      <button
                        onClick={deleteSelectedItem}
                        style={deleteButtonStyle}
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {rightTab === 'comments' && (
              <div style={panelBoxStyle}>
                <strong>コメント・メモ</strong>

                <label style={smallLabelStyle}>記入者</label>
                <input
                  value={newMemoAuthor}
                  onChange={(e) => setNewMemoAuthor(e.target.value)}
                  placeholder="例：名前"
                  style={inputStyle}
                />

                <label style={smallLabelStyle}>コメント</label>
                <textarea
                  value={newMemoText}
                  onChange={(e) => setNewMemoText(e.target.value)}
                  placeholder="例：机の間隔をもう少し広げる"
                  style={memoTextareaStyle}
                />

                <button onClick={addMemo} style={blueActionButtonStyle}>
                  コメント追加
                </button>

                {memos.length === 0 ? (
                  <p style={helpTextStyle}>まだコメントはありません。</p>
                ) : (
                  memos.map((memo) => (
                    <div key={memo.id} style={memoCardStyle}>
                      <div
                        style={{
                          fontWeight: 'bold',
                          fontSize: '13px',
                          marginBottom: '4px',
                        }}
                      >
                        {memo.author}
                      </div>
                      <div
                        style={{
                          whiteSpace: 'pre-wrap',
                          fontSize: '13px',
                          lineHeight: 1.5,
                        }}
                      >
                        {memo.text}
                      </div>
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          color: '#64748b',
                        }}
                      >
                        作成：{memo.createdAt}
                        <br />
                        更新：{memo.updatedAt}
                      </div>
                      <button
                        onClick={() => editMemo(memo)}
                        style={smallPlainButtonStyle}
                      >
                        修正
                      </button>
                      <button
                        onClick={() => deleteMemo(memo.id)}
                        style={smallDangerButtonStyle}
                      >
                        削除
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const appStyle: CSSProperties = {
  display: 'flex',
  height: '100vh',
  fontFamily:
    '"Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, system-ui, sans-serif',
  background: '#eef2f7',
  color: '#0f172a',
};

const leftPanelStyle: CSSProperties = {
  width: '220px',
  background: '#ffffff',
  padding: '10px',
  borderRight: '1px solid #dbe3ef',
  overflow: 'auto',
  flexShrink: 0,
};

const rightPanelStyle: CSSProperties = {
  width: '240px',
  background: '#ffffff',
  padding: '10px',
  borderLeft: '1px solid #dbe3ef',
  overflow: 'auto',
  flexShrink: 0,
};

const centerWrapperStyle: CSSProperties = {
  flex: 1,
  padding: '8px',
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
};

const stageStyle: CSSProperties = {
  width: 1100,
  height: 778,
  background: '#ffffff',
  borderRadius: '4px',
  position: 'relative',
  border: '2px solid #cbd5e1',
  overflow: 'hidden',
  flex: '0 0 auto',
};

const panelTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: '10px',
  fontSize: '18px',
  color: '#0f172a',
};

const sectionWrapStyle: CSSProperties = {
  marginTop: '8px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  overflow: 'hidden',
};

const sectionHeaderStyle: CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: 'none',
  background: '#f8fafc',
  color: '#0f172a',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 'bold',
};

const sectionBodyStyle: CSSProperties = {
  padding: '0 10px 10px',
  fontSize: '13px',
  lineHeight: 1.5,
};

const inputStyle: CSSProperties = {
  width: '100%',
  marginTop: '6px',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  fontSize: '13px',
  background: '#ffffff',
};

const memoTextareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '76px',
  marginTop: '6px',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  fontSize: '13px',
  background: '#ffffff',
  resize: 'vertical',
  lineHeight: 1.5,
};

const smallTextareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '62px',
  marginTop: '6px',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  fontSize: '13px',
  background: '#ffffff',
  resize: 'vertical',
  lineHeight: 1.5,
};

const checkboxLineStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
  marginTop: '8px',
  fontSize: '12px',
  color: '#334155',
  lineHeight: 1.4,
};

const panelBoxStyle: CSSProperties = {
  marginTop: '10px',
  padding: '10px',
  borderRadius: '8px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontSize: '13px',
  lineHeight: 1.5,
};

const guideListStyle: CSSProperties = {
  margin: '8px 0 0 18px',
  padding: 0,
  fontSize: '12px',
  color: '#475569',
  lineHeight: 1.6,
};

const helpTextStyle: CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: 1.5,
};

const tinyHelpTextStyle: CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  lineHeight: 1.4,
  marginTop: '2px',
};

const smallLabelStyle: CSSProperties = {
  display: 'block',
  marginTop: '8px',
  fontSize: '12px',
  color: '#334155',
};

const messageBoxStyle: CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  borderRadius: '6px',
  background: '#ffffff',
  border: '1px solid #dbe3ef',
  fontSize: '12px',
  color: '#334155',
};

const savedCardStyle: CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  border: '1px solid #dbe3ef',
  borderRadius: '6px',
  background: '#ffffff',
};

const memoCardStyle: CSSProperties = {
  marginTop: '10px',
  padding: '9px',
  border: '1px solid #dbe3ef',
  borderRadius: '8px',
  background: '#ffffff',
};

const infoBoxStyle: CSSProperties = {
  marginTop: '8px',
  marginBottom: '8px',
  padding: '8px',
  borderRadius: '6px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontSize: '12px',
  color: '#475569',
  lineHeight: 1.5,
};

const moveGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '6px',
  marginTop: '8px',
};

const blueActionButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '8px',
  padding: '9px',
  borderRadius: '6px',
  border: 'none',
  background: '#2563eb',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};

const greenButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '8px',
  padding: '9px',
  borderRadius: '6px',
  border: 'none',
  background: '#059669',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};

const blackButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '8px',
  padding: '9px',
  borderRadius: '6px',
  border: 'none',
  background: '#0f172a',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};

const yellowButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '10px',
  padding: '10px',
  borderRadius: '6px',
  border: 'none',
  background: '#d97706',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};

const moveButtonStyle: CSSProperties = {
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  fontSize: '14px',
};

const smallButtonStyle: CSSProperties = {
  flex: 1,
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  fontSize: '13px',
};

const plainButtonStyle: CSSProperties = {
  display: 'block',
  textAlign: 'center',
  width: '100%',
  marginTop: '8px',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  boxSizing: 'border-box',
  fontSize: '13px',
};

const fileButtonStyle: CSSProperties = {
  display: 'block',
  textAlign: 'center',
  width: '100%',
  marginTop: '8px',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  cursor: 'pointer',
  boxSizing: 'border-box',
  fontSize: '13px',
  fontWeight: 'bold',
};

const fileStatusStyle: CSSProperties = {
  marginTop: '6px',
  fontSize: '12px',
  color: '#64748b',
  textAlign: 'center',
};

const dangerOutlineButtonStyle: CSSProperties = {
  display: 'block',
  textAlign: 'center',
  width: '100%',
  marginTop: '8px',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #fca5a5',
  background: '#fff1f2',
  color: '#be123c',
  cursor: 'pointer',
  boxSizing: 'border-box',
  fontSize: '13px',
};

const smallPlainButtonStyle: CSSProperties = {
  marginTop: '6px',
  marginRight: '6px',
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  fontSize: '11px',
};

const smallDangerButtonStyle: CSSProperties = {
  marginTop: '6px',
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid #fca5a5',
  background: '#fff1f2',
  color: '#be123c',
  cursor: 'pointer',
  fontSize: '11px',
};

const copyButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '10px',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  fontSize: '13px',
};

const deleteButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '8px',
  padding: '10px',
  borderRadius: '6px',
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};

const emptyStageStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  fontSize: '20px',
  textAlign: 'center',
  lineHeight: 1.8,
};

const wideBackButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 50,
  padding: '10px 14px',
  borderRadius: '6px',
  border: 'none',
  background: '#0f172a',
  color: 'white',
  cursor: 'pointer',
};

const tabRowStyle: CSSProperties = {
  display: 'flex',
  gap: '6px',
  marginBottom: '10px',
};

const tabButtonStyle: CSSProperties = {
  flex: 1,
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
  fontSize: '13px',
};

const activeTabButtonStyle: CSSProperties = {
  flex: 1,
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #2563eb',
  background: '#dbeafe',
  color: '#1d4ed8',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
};

const guideEndLeftStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '-9px',
  width: '4px',
  height: '22px',
  background: '#dc2626',
};

const guideEndRightStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: '-9px',
  width: '4px',
  height: '22px',
  background: '#dc2626',
};

const guideLabelStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '-28px',
  transform: 'translateX(-50%)',
  background: '#ffffff',
  color: '#dc2626',
  border: '1px solid #dc2626',
  borderRadius: '6px',
  padding: '3px 8px',
  fontSize: '12px',
  whiteSpace: 'nowrap',
};
