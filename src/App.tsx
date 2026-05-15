import {
  useEffect,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from "react";

type ItemShape = "rect" | "circle";

type LayoutItem = {
  id: number;
  type: "furniture" | "label";
  shape?: ItemShape;
  name: string;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  color: string;
  rotation: number;
  zIndex?: number;
};

type FurnitureTemplate = {
  id: number;
  name: string;
  shape?: ItemShape;
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
  snapEnabled?: boolean;
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
  | "background"
  | "furniture"
  | "scale"
  | "save"
  | "saved"
  | "display";

type RightTab = "templates" | "settings" | "comments";

type SectionProps = {
  id: LeftSection;
  title: string;
  isOpen: boolean;
  onToggle: (id: LeftSection) => void;
  children: ReactNode;
};

type HistorySnapshot = {
  items: LayoutItem[];
  templates: FurnitureTemplate[];
  memos: MemoItem[];
  finalUpdateMemo: string;
  updatedBy: string;
  selectedId: number | null;
  selectedTemplateId: number | null;
  mmPerGrid: number;
  showGrid: boolean;
  snapEnabled: boolean;
  showGuideLine: boolean;
  guideX: number;
  guideY: number;
  guideLengthPx: number;
  guideRealMm: number;
  backgroundImage: string | null;
};

const STORAGE_KEY = "office-layout-planner-template-ui-snap-real-fix";

const COLOR_PALETTE = [
  { label: "白", value: "#ffffff" },
  { label: "灰", value: "#e5e7eb" },
  { label: "濃灰", value: "#94a3b8" },
  { label: "薄茶", value: "#fde68a" },
  { label: "茶", value: "#d6a15d" },
  { label: "赤", value: "#fecaca" },
  { label: "橙", value: "#fed7aa" },
  { label: "黄", value: "#fef08a" },
  { label: "緑", value: "#bbf7d0" },
  { label: "水色", value: "#bae6fd" },
  { label: "青", value: "#bfdbfe" },
  { label: "紫", value: "#ddd6fe" },
];

const getDateText = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const makeSaveName = (name: string) => {
  const trimmedName = name.trim() || "名前";
  return `${getDateText()}_レイアウト案_${trimmedName}`;
};

const getTodayName = () => makeSaveName("名前");
const getNowText = () => new Date().toLocaleString();

const normalizeAngle = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return ((Math.round(value) % 360) + 360) % 360;
};

const readNumberOrFallback = (value: string, fallback: number, min = 1) => {
  if (value.trim() === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.round(numeric));
};

const getShape = (item: { shape?: ItemShape; name: string }) => {
  return item.shape || (item.name.includes("椅子") || item.name.includes("丸") ? "circle" : "rect");
};

const normalizeItem = (item: LayoutItem): LayoutItem => ({
  ...item,
  shape: getShape(item),
  zIndex: item.zIndex ?? 20,
});

const normalizeTemplate = (template: FurnitureTemplate): FurnitureTemplate => ({
  ...template,
  shape: getShape(template),
});

function Section({ id, title, isOpen, onToggle, children }: SectionProps) {
  return (
    <div style={sectionWrapStyle}>
      <button onClick={() => onToggle(id)} style={sectionHeaderStyle}>
        {isOpen ? "▼" : "▶"} {title}
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
  const snapDistance = 16;

  const [items, setItems] = useState<LayoutItem[]>([]);
  const [templates, setTemplates] = useState<FurnitureTemplate[]>([
    { id: 1, name: "事務机", shape: "rect", widthMm: 1200, heightMm: 700, color: "#bfdbfe" },
    { id: 2, name: "椅子", shape: "circle", widthMm: 500, heightMm: 500, color: "#bbf7d0" },
    { id: 3, name: "長机", shape: "rect", widthMm: 1800, heightMm: 450, color: "#fde68a" },
    { id: 4, name: "会議机", shape: "rect", widthMm: 1800, heightMm: 900, color: "#ddd6fe" },
    { id: 5, name: "棚・ロッカー", shape: "rect", widthMm: 900, heightMm: 450, color: "#e5e7eb" },
    { id: 6, name: "丸テーブル", shape: "circle", widthMm: 800, heightMm: 800, color: "#d6a15d" },
  ]);

  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [newMemoAuthor, setNewMemoAuthor] = useState("");
  const [newMemoText, setNewMemoText] = useState("");
  const [includeMemosInExport, setIncludeMemosInExport] = useState(true);

  const [updatedBy, setUpdatedBy] = useState("");
  const [finalUpdateMemo, setFinalUpdateMemo] = useState("");

  const [openSections, setOpenSections] = useState<Record<LeftSection, boolean>>({
    background: false,
    furniture: true,
    scale: false,
    save: false,
    saved: false,
    display: false,
  });

  const [rightTab, setRightTab] = useState<RightTab>("templates");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

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
  const [saveMessage, setSaveMessage] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(1);
  const [moveAmount, setMoveAmount] = useState(10);

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [wideMode, setWideMode] = useState(false);

  const [mmPerGrid, setMmPerGrid] = useState(1000);
  const [showGuideLine, setShowGuideLine] = useState(true);
  const [guideX, setGuideX] = useState(130);
  const [guideY, setGuideY] = useState(240);
  const [guideLengthPx, setGuideLengthPx] = useState(190);
  const [guideRealMm, setGuideRealMm] = useState(5055);

  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  const mmToPx = (mm: number) => {
    return (mm / mmPerGrid) * gridPx * furnitureScale;
  };

  const takeSnapshot = (): HistorySnapshot => ({
    items,
    templates,
    memos,
    finalUpdateMemo,
    updatedBy,
    selectedId,
    selectedTemplateId,
    mmPerGrid,
    showGrid,
    snapEnabled,
    showGuideLine,
    guideX,
    guideY,
    guideLengthPx,
    guideRealMm,
    backgroundImage,
  });

  const pushHistory = () => {
    const snapshot = takeSnapshot();
    setHistory((current) => [snapshot, ...current].slice(0, 30));
  };

  const restoreSnapshot = (snapshot: HistorySnapshot) => {
    setItems(snapshot.items);
    setTemplates(snapshot.templates);
    setMemos(snapshot.memos);
    setFinalUpdateMemo(snapshot.finalUpdateMemo);
    setUpdatedBy(snapshot.updatedBy);
    setSelectedId(snapshot.selectedId);
    setSelectedTemplateId(snapshot.selectedTemplateId);
    setMmPerGrid(snapshot.mmPerGrid);
    setShowGrid(snapshot.showGrid);
    setSnapEnabled(snapshot.snapEnabled);
    setShowGuideLine(snapshot.showGuideLine);
    setGuideX(snapshot.guideX);
    setGuideY(snapshot.guideY);
    setGuideLengthPx(snapshot.guideLengthPx);
    setGuideRealMm(snapshot.guideRealMm);
    setBackgroundImage(snapshot.backgroundImage);
  };

  const undo = () => {
    if (history.length === 0) return;
    restoreSnapshot(history[0]);
    setHistory((current) => current.slice(1));
    setSaveMessage("1個前に戻しました。");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;

      event.preventDefault();
      undo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history]);

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

  const getCurrentSaveData = (): SaveData => ({
    items,
    templates,
    memos,
    finalUpdateMemo,
    updatedBy,
    selectedId,
    selectedTemplateId,
    mmPerGrid,
    showGrid,
    snapEnabled,
    showGuideLine,
    guideX,
    guideY,
    guideLengthPx,
    guideRealMm,
    backgroundImage,
  });

  const applySaveData = (data: SaveData) => {
    setItems((data.items || []).map(normalizeItem));
    setTemplates((data.templates || []).map(normalizeTemplate));
    setMemos(data.memos || []);
    setFinalUpdateMemo(data.finalUpdateMemo || "");
    setUpdatedBy(data.updatedBy || "");
    setSelectedId(data.selectedId);
    setSelectedTemplateId(data.selectedTemplateId);
    setMmPerGrid(data.mmPerGrid || 1000);
    setShowGrid(data.showGrid ?? true);
    setSnapEnabled(data.snapEnabled ?? true);
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
      setSaveMessage("保存名を入力してください。");
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
    const ok = window.confirm("現在の作業内容を上書きして、この保存データを読み込みますか？");
    if (!ok) return;

    pushHistory();
    applySaveData(layout.data);
    setSaveName(layout.name);
    setSaveMessage(`「${layout.name}」を読み込みました。`);
  };

  const deleteSavedLayout = (id: number) => {
    const ok = window.confirm("この保存データを削除しますか？");
    if (!ok) return;

    saveLayoutsToStorage(savedLayouts.filter((layout) => layout.id !== id));
    setSaveMessage("保存データを削除しました。");
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
    const blob = new Blob([jsonText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const safeFileName = trimmedName.replace(/[\\/:*?"<>|]/g, "_");
    const suffix = includeMemosInExport ? "" : "_コメントなし";
    const link = document.createElement("a");
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

    const ok = window.confirm("現在の作業内容を上書きして、txtファイルを読み込みますか？");
    if (!ok) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result);
        const imported: SavedLayout = JSON.parse(text);

        if (!imported.data || !imported.name) {
          setSaveMessage("読み込めないファイル形式です。");
          return;
        }

        pushHistory();

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
        setSaveMessage("ファイルの読み込みに失敗しました。");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const handleBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      pushHistory();
      setBackgroundImage(String(reader.result));
      setSaveMessage("見取り図画像を読み込みました。");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const addFurnitureFromTemplate = (template: FurnitureTemplate) => {
    pushHistory();

    const shape = template.shape || "rect";
    const newItem: LayoutItem = {
      id: Date.now(),
      type: "furniture",
      shape,
      name: template.name,
      x: 165,
      y: 385,
      widthMm: template.widthMm,
      heightMm: shape === "circle" ? template.widthMm : template.heightMm,
      color: template.color,
      rotation: 0,
      zIndex: Math.max(20, ...items.map((item) => item.zIndex || 20)) + 1,
    };

    setItems([...items, newItem]);
    setSelectedId(newItem.id);
    setSelectedTemplateId(template.id);
    setRightTab("settings");
    setSaveMessage(`${template.name}を追加しました。`);
  };

  const addNewTemplate = () => {
    pushHistory();

    const newTemplate: FurnitureTemplate = {
      id: Date.now(),
      name: "新しい家具",
      shape: "rect",
      widthMm: 1000,
      heightMm: 500,
      color: "#e5e7eb",
    };

    setTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setRightTab("templates");
    setSaveMessage("新しい家具テンプレを作りました。右側で名前や寸法を編集してください。");
  };

  const updateSelectedTemplate = (updates: Partial<FurnitureTemplate>) => {
    if (selectedTemplateId === null) return;

    pushHistory();

    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplateId) return template;

        const next = { ...template, ...updates };
        if (next.shape === "circle") {
          next.heightMm = next.widthMm;
        }
        return next;
      })
    );
  };

  const deleteSelectedTemplate = () => {
    if (selectedTemplateId === null) return;

    const ok = window.confirm("選択中の家具テンプレを削除しますか？");
    if (!ok) return;

    pushHistory();

    const nextTemplates = templates.filter((template) => template.id !== selectedTemplateId);
    setTemplates(nextTemplates);
    setSelectedTemplateId(nextTemplates.length > 0 ? nextTemplates[0].id : null);
    setSaveMessage("家具テンプレを削除しました。");
  };

  const saveSelectedItemAsTemplate = () => {
    if (!selectedItem || selectedItem.type !== "furniture") return;

    pushHistory();

    const shape = selectedItem.shape || "rect";
    const newTemplate: FurnitureTemplate = {
      id: Date.now(),
      name: selectedItem.name,
      shape,
      widthMm: selectedItem.widthMm,
      heightMm: shape === "circle" ? selectedItem.widthMm : selectedItem.heightMm,
      color: selectedItem.color,
    };

    setTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setRightTab("templates");
    setSaveMessage("選択中の家具をテンプレに保存しました。");
  };

  const addLabel = () => {
    pushHistory();

    const newItem: LayoutItem = {
      id: Date.now(),
      type: "label",
      shape: "rect",
      name: "メモ",
      x: 190,
      y: 430,
      widthMm: 1200,
      heightMm: 400,
      color: "#fef08a",
      rotation: 0,
      zIndex: Math.max(20, ...items.map((item) => item.zIndex || 20)) + 1,
    };

    setItems([...items, newItem]);
    setSelectedId(newItem.id);
    setRightTab("settings");
  };

  const updateSelectedItem = (updates: Partial<LayoutItem>, saveHistory = true) => {
    if (selectedId === null) return;

    if (saveHistory) pushHistory();

    setItems((current) =>
      current.map((item) => {
        if (item.id !== selectedId) return item;

        const next = { ...item, ...updates };
        if ((next.shape || "rect") === "circle") {
          next.heightMm = next.widthMm;
        }
        return next;
      })
    );
  };

  const getItemRect = (item: LayoutItem) => {
    return {
      left: item.x,
      top: item.y,
      right: item.x + mmToPx(item.widthMm),
      bottom: item.y + mmToPx(item.heightMm),
      centerX: item.x + mmToPx(item.widthMm) / 2,
      centerY: item.y + mmToPx(item.heightMm) / 2,
      width: mmToPx(item.widthMm),
      height: mmToPx(item.heightMm),
    };
  };

  const getSnappedPosition = (
    movingItem: LayoutItem,
    oldX: number,
    oldY: number,
    nextX: number,
    nextY: number
  ) => {
    if (!snapEnabled) return { x: nextX, y: nextY };

    const width = mmToPx(movingItem.widthMm);
    const height = mmToPx(movingItem.heightMm);

    let snappedX = nextX;
    let snappedY = nextY;

    const oldEdges = {
      left: oldX,
      right: oldX + width,
      centerX: oldX + width / 2,
      top: oldY,
      bottom: oldY + height,
      centerY: oldY + height / 2,
    };

    const nextEdges = {
      left: nextX,
      right: nextX + width,
      centerX: nextX + width / 2,
      top: nextY,
      bottom: nextY + height,
      centerY: nextY + height / 2,
    };

    const gridX = Math.round(nextX / gridPx) * gridPx;
    const gridY = Math.round(nextY / gridPx) * gridPx;

    if (Math.abs(gridX - nextX) <= snapDistance && Math.abs(gridX - nextX) < Math.abs(Math.round(oldX / gridPx) * gridPx - oldX)) {
      snappedX = gridX;
    }

    if (Math.abs(gridY - nextY) <= snapDistance && Math.abs(gridY - nextY) < Math.abs(Math.round(oldY / gridPx) * gridPx - oldY)) {
      snappedY = gridY;
    }

    items.forEach((other) => {
      if (other.id === movingItem.id) return;

      const otherRect = getItemRect(other);

      const xPairs = [
        { oldFrom: oldEdges.left, nextFrom: nextEdges.left, to: otherRect.left, result: otherRect.left },
        { oldFrom: oldEdges.left, nextFrom: nextEdges.left, to: otherRect.right, result: otherRect.right },
        { oldFrom: oldEdges.right, nextFrom: nextEdges.right, to: otherRect.left, result: otherRect.left - width },
        { oldFrom: oldEdges.right, nextFrom: nextEdges.right, to: otherRect.right, result: otherRect.right - width },
        { oldFrom: oldEdges.centerX, nextFrom: nextEdges.centerX, to: otherRect.centerX, result: otherRect.centerX - width / 2 },
      ];

      const yPairs = [
        { oldFrom: oldEdges.top, nextFrom: nextEdges.top, to: otherRect.top, result: otherRect.top },
        { oldFrom: oldEdges.top, nextFrom: nextEdges.top, to: otherRect.bottom, result: otherRect.bottom },
        { oldFrom: oldEdges.bottom, nextFrom: nextEdges.bottom, to: otherRect.top, result: otherRect.top - height },
        { oldFrom: oldEdges.bottom, nextFrom: nextEdges.bottom, to: otherRect.bottom, result: otherRect.bottom - height },
        { oldFrom: oldEdges.centerY, nextFrom: nextEdges.centerY, to: otherRect.centerY, result: otherRect.centerY - height / 2 },
      ];

      xPairs.forEach((pair) => {
        const oldDistance = Math.abs(pair.oldFrom - pair.to);
        const nextDistance = Math.abs(pair.nextFrom - pair.to);
        if (nextDistance <= snapDistance && nextDistance < oldDistance) {
          snappedX = pair.result;
        }
      });

      yPairs.forEach((pair) => {
        const oldDistance = Math.abs(pair.oldFrom - pair.to);
        const nextDistance = Math.abs(pair.nextFrom - pair.to);
        if (nextDistance <= snapDistance && nextDistance < oldDistance) {
          snappedY = pair.result;
        }
      });
    });

    return { x: Math.round(snappedX), y: Math.round(snappedY) };
  };

  const moveSelectedItem = (dx: number, dy: number) => {
    if (!selectedItem) return;

    pushHistory();

    const next = getSnappedPosition(
      selectedItem,
      selectedItem.x,
      selectedItem.y,
      selectedItem.x + dx,
      selectedItem.y + dy
    );

    updateSelectedItem({ x: next.x, y: next.y }, false);
  };

  const rotateSelectedItem = (degrees: number) => {
    if (!selectedItem) return;
    updateSelectedItem({
      rotation: normalizeAngle((selectedItem.rotation || 0) + degrees),
    });
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;

    pushHistory();

    const newItem: LayoutItem = {
      ...selectedItem,
      id: Date.now(),
      x: selectedItem.x + 30,
      y: selectedItem.y + 30,
      name: `${selectedItem.name} コピー`,
      zIndex: Math.max(20, ...items.map((item) => item.zIndex || 20)) + 1,
    };

    setItems([...items, newItem]);
    setSelectedId(newItem.id);
    setSaveMessage("選択中の家具を複製しました。");
  };

  const deleteSelectedItem = () => {
    if (selectedId === null) return;

    const ok = window.confirm("選択中のものを削除しますか？");
    if (!ok) return;

    pushHistory();

    const nextItems = items.filter((item) => item.id !== selectedId);
    setItems(nextItems);
    setSelectedId(nextItems.length > 0 ? nextItems[0].id : null);
    setSaveMessage("選択中のものを削除しました。");
  };

  const bringSelectedForward = () => {
    if (!selectedItem) return;
    updateSelectedItem({
      zIndex: Math.max(20, ...items.map((item) => item.zIndex || 20)) + 1,
    });
  };

  const sendSelectedBackward = () => {
    if (!selectedItem) return;
    updateSelectedItem({
      zIndex: Math.max(1, Math.min(...items.map((item) => item.zIndex || 20)) - 1),
    });
  };

  const snapSelectedToNearest = (direction: "left" | "right" | "top" | "bottom") => {
    if (!selectedItem) return;

    const others = items.filter((item) => item.id !== selectedItem.id);
    if (others.length === 0) {
      setSaveMessage("ぴったり合わせる相手の家具がありません。");
      return;
    }

    const selectedRect = getItemRect(selectedItem);
    let best: { distance: number; x: number; y: number } | null = null;

    others.forEach((other) => {
      const otherRect = getItemRect(other);
      let candidate = { distance: Infinity, x: selectedItem.x, y: selectedItem.y };

      if (direction === "right") {
        candidate = {
          distance: Math.abs(otherRect.right - selectedRect.left),
          x: otherRect.right,
          y: selectedItem.y,
        };
      }

      if (direction === "left") {
        candidate = {
          distance: Math.abs(otherRect.left - selectedRect.right),
          x: otherRect.left - selectedRect.width,
          y: selectedItem.y,
        };
      }

      if (direction === "bottom") {
        candidate = {
          distance: Math.abs(otherRect.bottom - selectedRect.top),
          x: selectedItem.x,
          y: otherRect.bottom,
        };
      }

      if (direction === "top") {
        candidate = {
          distance: Math.abs(otherRect.top - selectedRect.bottom),
          x: selectedItem.x,
          y: otherRect.top - selectedRect.height,
        };
      }

      if (!best || candidate.distance < best.distance) {
        best = candidate;
      }
    });

    if (!best) return;
    updateSelectedItem({ x: Math.round(best.x), y: Math.round(best.y) });
    setSaveMessage("近くの家具にぴったり合わせました。");
  };

  const clearAllItems = () => {
    const ok = window.confirm("配置した家具・ラベルをすべて削除しますか？");
    if (!ok) return;

    pushHistory();

    setItems([]);
    setSelectedId(null);
    setSaveMessage("家具・ラベルをすべて削除しました。");
  };

  const applyEasySizeMatch = () => {
    if (guideLengthPx <= 0 || guideRealMm <= 0) return;

    pushHistory();

    const newMmPerGrid = (guideRealMm / guideLengthPx) * gridPx * furnitureScale;
    setMmPerGrid(Math.round(newMmPerGrid));
    setSaveMessage("サイズ合わせを反映しました。");
  };

  const addMemo = () => {
    const author = newMemoAuthor.trim();
    const text = newMemoText.trim();

    if (!author) {
      setSaveMessage("記入者を入力してください。");
      return;
    }

    if (!text) {
      setSaveMessage("コメントを入力してください。");
      return;
    }

    pushHistory();

    const now = getNowText();

    const memo: MemoItem = {
      id: Date.now(),
      author,
      text,
      createdAt: now,
      updatedAt: now,
    };

    setMemos([memo, ...memos]);
    setNewMemoText("");
    setSaveMessage("コメントを追加しました。");
  };

  const editMemo = (memo: MemoItem) => {
    const nextAuthor = window.prompt("記入者を修正してください。", memo.author);
    if (nextAuthor === null) return;

    const trimmedAuthor = nextAuthor.trim();

    if (!trimmedAuthor) {
      setSaveMessage("記入者は空欄にできません。");
      return;
    }

    const nextText = window.prompt("コメントを修正してください。", memo.text);
    if (nextText === null) return;

    const trimmedText = nextText.trim();

    if (!trimmedText) {
      setSaveMessage("空のコメントにはできません。");
      return;
    }

    pushHistory();

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

    setSaveMessage("コメントを修正しました。");
  };

  const deleteMemo = (id: number) => {
    const ok = window.confirm("このコメントを削除しますか？");
    if (!ok) return;

    pushHistory();

    setMemos(memos.filter((memo) => memo.id !== id));
    setSaveMessage("コメントを削除しました。");
  };

  const printLayout = () => {
    setSaveMessage("印刷画面を開きます。PDF保存時は「背景のグラフィック」にチェックしてください。");

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

  const drawItemText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number
  ) => {
    const fontSize = Math.max(7, Math.min(13, Math.min(width, height) * 0.22));
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxChars = Math.max(1, Math.floor((width - 6) / (fontSize * 0.62)));
    const shown = text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
    ctx.fillText(shown, width / 2, height / 2, Math.max(1, width - 6));
  };

  const exportLayoutImage = async () => {
    const canvasScale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = stageWidth * canvasScale;
    canvas.height = stageHeight * canvasScale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(canvasScale, canvasScale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, stageWidth, stageHeight);

    if (backgroundImage) {
      try {
        const bg = await loadImageForCanvas(backgroundImage);
        ctx.drawImage(bg, 0, 0, stageWidth, stageHeight);
      } catch {
        setSaveMessage("背景画像の書き出しに失敗しました。");
        return;
      }
    }

    if (showGrid) {
      ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
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

    [...items]
      .sort((a, b) => (a.zIndex || 20) - (b.zIndex || 20))
      .forEach((item) => {
        const width = mmToPx(item.widthMm);
        const height = mmToPx(item.heightMm);
        const centerX = item.x + width / 2;
        const centerY = item.y + height / 2;
        const shape = item.shape || "rect";

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);

        ctx.fillStyle = item.color;
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5;

        if (shape === "circle") {
          ctx.beginPath();
          ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          drawRoundedRect(ctx, 0, 0, width, height, item.type === "label" ? 4 : 3);
          ctx.fill();
          ctx.stroke();
        }

        const text = item.type === "label" ? `📍 ${item.name}` : item.name;
        ctx.save();
        ctx.beginPath();
        ctx.rect(2, 2, Math.max(1, width - 4), Math.max(1, height - 4));
        ctx.clip();
        drawItemText(ctx, text, width, height);
        ctx.restore();

        ctx.restore();
      });

    const safeFileName = (saveName.trim() || getTodayName()).replace(/[\\/:*?"<>|]/g, "_");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${safeFileName}.png`;
    link.click();

    setSaveMessage("画像として保存しました。");
  };

  const renderPalette = (currentColor: string, onSelect: (value: string) => void) => (
    <div style={paletteWrapStyle}>
      {COLOR_PALETTE.map((color) => (
        <button
          key={color.value}
          onClick={() => onSelect(color.value)}
          title={color.label}
          style={{
            ...paletteButtonStyle,
            background: color.value,
            border: currentColor === color.value ? "3px solid #0f172a" : "1px solid #cbd5e1",
          }}
        >
          <span style={paletteLabelStyle}>{color.label}</span>
        </button>
      ))}
    </div>
  );

  const numberInput = (
    value: number,
    onCommit: (next: number) => void,
    options?: { min?: number; fallback?: number; placeholder?: string }
  ) => (
    <input
      type="number"
      defaultValue={value}
      placeholder={options?.placeholder}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => {
        const next = readNumberOrFallback(
          event.currentTarget.value,
          options?.fallback ?? value,
          options?.min ?? 1
        );
        event.currentTarget.value = String(next);
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const target = event.currentTarget;
        const next = readNumberOrFallback(target.value, options?.fallback ?? value, options?.min ?? 1);
        target.value = String(next);
        target.blur();
      }}
      style={inputStyle}
    />
  );

  const angleInput = (value: number, onCommit: (next: number) => void) => (
    <input
      type="number"
      defaultValue={value}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => {
        const raw = event.currentTarget.value.trim();
        const next = raw === "" ? value : normalizeAngle(Number(raw));
        event.currentTarget.value = String(next);
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const target = event.currentTarget;
        const raw = target.value.trim();
        const next = raw === "" ? value : normalizeAngle(Number(raw));
        target.value = String(next);
        target.blur();
      }}
      style={inputStyle}
    />
  );

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
        <div className="print-hide" style={topBarStyle}>
          <button
            onClick={undo}
            disabled={history.length === 0}
            style={{
              ...topButtonStyle,
              opacity: history.length === 0 ? 0.45 : 1,
              cursor: history.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            ↩ 1個前に戻る
          </button>

          <button onClick={() => setWideMode(!wideMode)} style={topButtonStyle}>
            {wideMode ? "編集モードに戻る" : "配置モード"}
          </button>

          <label style={topCheckStyle}>
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            グリッド
          </label>

          <label style={topCheckStyle}>
            <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
            カチッと
          </label>

          <button onClick={() => setHelpOpen(true)} style={topButtonStyle}>
            ？使い方
          </button>

          {saveMessage && <div style={topMessageStyle}>{saveMessage}</div>}
        </div>

        <div style={mainAreaStyle}>
          {!wideMode && (
            <div className="print-hide" style={leftPanelStyle}>
              <h2 style={panelTitleStyle}>操作メニュー</h2>

              <Section id="background" title="見取り図画像" isOpen={openSections.background} onToggle={toggleSection}>
                <p style={helpTextStyle}>背景用の見取り図画像を読み込みます。</p>

                <label style={fileButtonStyle}>
                  見取り図画像を選ぶ
                  <input type="file" accept="image/png,image/jpeg" onChange={handleBackgroundUpload} style={{ display: "none" }} />
                </label>

                <div style={fileStatusStyle}>{backgroundImage ? "読み込み済み" : "未選択"}</div>

                {backgroundImage && (
                  <button
                    onClick={() => {
                      pushHistory();
                      setBackgroundImage(null);
                    }}
                    style={plainButtonStyle}
                  >
                    背景を外す
                  </button>
                )}
              </Section>

              <Section id="furniture" title="家具追加" isOpen={openSections.furniture} onToggle={toggleSection}>
                <p style={tinyHelpTextStyle}>ここは家具を置く専用です。編集は右側の「テンプレ管理」で行います。</p>

                {templates.map((template) => {
                  const shape = template.shape || "rect";
                  return (
                    <button
                      key={template.id}
                      onClick={() => addFurnitureFromTemplate(template)}
                      style={{
                        ...addCardStyle,
                        border: selectedTemplateId === template.id ? "2px solid #2563eb" : "1px solid #dbe3ef",
                      }}
                    >
                      <span
                        style={{
                          ...addColorMarkStyle,
                          background: template.color,
                          borderRadius: shape === "circle" ? "999px" : "8px",
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={addCardNameStyle}>＋ {template.name}</span>
                        <span style={addCardSizeStyle}>
                          {shape === "circle"
                            ? `直径${template.widthMm}mm`
                            : `幅${template.widthMm}mm × 奥行${template.heightMm}mm`}
                        </span>
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    addNewTemplate();
                    setRightPanelOpen(true);
                  }}
                  style={blueActionButtonStyle}
                >
                  ＋ 新しい家具を登録
                </button>

                <button onClick={addLabel} style={yellowButtonStyle}>
                  📍 ラベル追加
                </button>
              </Section>

              <Section id="scale" title="サイズ合わせ" isOpen={openSections.scale} onToggle={toggleSection}>
                <label style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <input type="checkbox" checked={showGuideLine} onChange={(e) => setShowGuideLine(e.target.checked)} />
                  赤い線
                </label>

                <label style={smallLabelStyle}>赤い線の実寸（mm）</label>
                {numberInput(guideRealMm, (next) => {
                  pushHistory();
                  setGuideRealMm(next);
                })}

                <button onClick={applyEasySizeMatch} style={blueActionButtonStyle}>
                  サイズを合わせる
                </button>

                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <button
                    onClick={() => {
                      pushHistory();
                      setGuideLengthPx(Math.max(20, guideLengthPx - 10));
                    }}
                    style={smallButtonStyle}
                  >
                    ←短く
                  </button>

                  <button
                    onClick={() => {
                      pushHistory();
                      setGuideLengthPx(guideLengthPx + 10);
                    }}
                    style={smallButtonStyle}
                  >
                    長く→
                  </button>
                </div>

                <div style={moveGridStyle}>
                  <div />
                  <button onClick={() => { pushHistory(); setGuideY(guideY - 10); }} style={moveButtonStyle}>↑</button>
                  <div />
                  <button onClick={() => { pushHistory(); setGuideX(guideX - 10); }} style={moveButtonStyle}>←</button>
                  <button onClick={() => { pushHistory(); setGuideY(guideY + 10); }} style={moveButtonStyle}>↓</button>
                  <button onClick={() => { pushHistory(); setGuideX(guideX + 10); }} style={moveButtonStyle}>→</button>
                </div>
              </Section>

              <Section id="save" title="保存・出力" isOpen={openSections.save} onToggle={toggleSection}>
                <label style={smallLabelStyle}>更新者名</label>
                <input value={updatedBy} onChange={(e) => handleUpdatedByChange(e.target.value)} placeholder="例：名前" style={inputStyle} />
                <div style={tinyHelpTextStyle}>更新者名を入力すると、保存名に自動で反映されます。</div>

                <label style={smallLabelStyle}>保存名</label>
                <input value={saveName} onChange={(e) => setSaveName(e.target.value)} style={inputStyle} />

                <label style={smallLabelStyle}>最終更新メモ</label>
                <textarea
                  value={finalUpdateMemo}
                  onChange={(e) => setFinalUpdateMemo(e.target.value)}
                  placeholder="例：机を2台追加、棚を右側へ移動"
                  style={smallTextareaStyle}
                />

                <button onClick={saveCurrentLayout} style={blueActionButtonStyle}>保存</button>

                <label style={checkboxLineStyle}>
                  <input type="checkbox" checked={includeMemosInExport} onChange={(e) => setIncludeMemosInExport(e.target.checked)} />
                  txt書き出しにコメント・記入者を含める
                </label>

                <button onClick={exportCurrentLayoutToFile} style={plainButtonStyle}>txt書き出し</button>

                <label style={plainButtonStyle}>
                  txt読み込み
                  <input type="file" accept=".txt,.json" onChange={importLayoutFromFile} style={{ display: "none" }} />
                </label>

                <button onClick={printLayout} style={blackButtonStyle}>PDF/印刷</button>
                <button onClick={exportLayoutImage} style={greenButtonStyle}>画像として保存</button>

                <p style={helpTextStyle}>
                  PDF保存時は、印刷画面で「背景のグラフィック」にチェックしてください。
                  うまく出ない場合は画像として保存してからPDF化してください。
                </p>

                {saveMessage && <div style={messageBoxStyle}>{saveMessage}</div>}
              </Section>

              <Section id="saved" title="保存済み" isOpen={openSections.saved} onToggle={toggleSection}>
                {savedLayouts.length === 0 ? (
                  <p style={helpTextStyle}>まだ保存がありません。</p>
                ) : (
                  savedLayouts.map((layout) => (
                    <div key={layout.id} style={savedCardStyle}>
                      <strong style={{ fontSize: "13px" }}>{layout.name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{layout.savedAt}</div>

                      {layout.data?.finalUpdateMemo && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "#475569" }}>
                          {layout.data.finalUpdateMemo}
                        </div>
                      )}

                      <button onClick={() => loadSavedLayout(layout)} style={smallPlainButtonStyle}>読込</button>
                      <button onClick={() => deleteSavedLayout(layout.id)} style={smallDangerButtonStyle}>削除</button>
                    </div>
                  ))
                )}
              </Section>

              <Section id="display" title="表示" isOpen={openSections.display} onToggle={toggleSection}>
                <label style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  グリッド
                </label>

                <label style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
                  カチッと揃える
                </label>

                <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>1マス = {mmPerGrid}mm</div>

                <button onClick={clearAllItems} style={dangerOutlineButtonStyle}>家具・ラベルを全削除</button>
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
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "fill",
                    pointerEvents: "none",
                    userSelect: "none",
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
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 2,
                    backgroundSize: `${gridPx}px ${gridPx}px`,
                    backgroundImage:
                      "linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",
                  }}
                />
              )}

              {showGuideLine && (
                <div
                  className="print-hide"
                  style={{
                    position: "absolute",
                    left: guideX,
                    top: guideY,
                    width: guideLengthPx,
                    height: "4px",
                    background: "#dc2626",
                    zIndex: 3000,
                    boxShadow: "0 0 0 2px rgba(220,38,38,0.25)",
                  }}
                >
                  <div style={guideEndLeftStyle} />
                  <div style={guideEndRightStyle} />
                  <div style={guideLabelStyle}>サイズ合わせ線</div>
                </div>
              )}

              {[...items]
                .sort((a, b) => (a.zIndex || 20) - (b.zIndex || 20))
                .map((item) => {
                  const isSelected = item.id === selectedId;
                  const shape = item.shape || "rect";
                  const isLabel = item.type === "label";
                  const displayWidth = mmToPx(item.widthMm);
                  const displayHeight = mmToPx(item.heightMm);

                  const autoFontSize = Math.max(7, Math.min(13, Math.min(displayWidth, displayHeight) * 0.24));
                  const text = isLabel ? `📍 ${item.name}` : item.name;
                  const isTiny = displayWidth < 34 || displayHeight < 20;

                  return (
                    <div
                      key={item.id}
                      className={`layout-item ${isSelected ? "selected-layout-item" : ""}`}
                      onClick={() => setSelectedId(item.id)}
                      title={item.name}
                      style={{
                        position: "absolute",
                        left: item.x,
                        top: item.y,
                        width: displayWidth,
                        height: displayHeight,
                        background: item.color,
                        borderRadius: shape === "circle" ? "999px" : isLabel ? "4px" : "3px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        border: isSelected ? "3px solid #2563eb" : "1px solid #475569",
                        cursor: "pointer",
                        userSelect: "none",
                        boxShadow: isSelected
                          ? "0 0 0 4px rgba(37, 99, 235, 0.18)"
                          : "0 1px 3px rgba(15,23,42,0.18)",
                        transform: `rotate(${item.rotation || 0}deg)`,
                        transformOrigin: "center center",
                        fontSize: autoFontSize,
                        color: "#0f172a",
                        zIndex: item.zIndex || 20,
                        textAlign: "center",
                        overflow: "hidden",
                        padding: "2px",
                        boxSizing: "border-box",
                        lineHeight: 1.05,
                      }}
                    >
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-all",
                          maxWidth: "100%",
                        }}
                      >
                        {isTiny ? item.name.slice(0, 1) : text}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {!wideMode && (
            <>
              {!rightPanelOpen ? (
                <button className="print-hide" onClick={() => setRightPanelOpen(true)} style={rightOpenButtonStyle}>
                  ◀ 設定
                </button>
              ) : (
                <div className="print-hide" style={rightPanelStyle}>
                  <div style={rightTitleRowStyle}>
                    <h2 style={panelTitleStyle}>設定</h2>
                    <button onClick={() => setRightPanelOpen(false)} style={collapseButtonStyle}>たたむ</button>
                  </div>

                  <div style={tabRowStyle}>
                    <button onClick={() => setRightTab("templates")} style={rightTab === "templates" ? activeTabButtonStyle : tabButtonStyle}>
                      テンプレ管理
                    </button>
                    <button onClick={() => setRightTab("settings")} style={rightTab === "settings" ? activeTabButtonStyle : tabButtonStyle}>
                      家具設定
                    </button>
                    <button onClick={() => setRightTab("comments")} style={rightTab === "comments" ? activeTabButtonStyle : tabButtonStyle}>
                      コメント
                    </button>
                  </div>

                  {rightTab === "templates" && (
                    <div style={panelBoxStyle}>
                      <strong>🧩 テンプレ管理</strong>
                      <p style={tinyHelpTextStyle}>
                        ここで「家具追加」に出る家具を編集します。左側は追加専用です。
                      </p>

                      <label style={smallLabelStyle}>編集する家具</label>
                      <select
                        value={selectedTemplateId ?? ""}
                        onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                        style={inputStyle}
                      >
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>

                      <button onClick={addNewTemplate} style={blueActionButtonStyle}>＋ 新しい家具を登録</button>

                      {!selectedTemplate ? (
                        <p style={helpTextStyle}>テンプレがありません。新しい家具を登録してください。</p>
                      ) : (
                        <>
                          <label style={smallLabelStyle}>家具名</label>
                          <input
                            value={selectedTemplate.name}
                            onChange={(e) => updateSelectedTemplate({ name: e.target.value })}
                            style={inputStyle}
                          />

                          <label style={smallLabelStyle}>形</label>
                          <div style={segmentedRowStyle}>
                            <button
                              onClick={() => updateSelectedTemplate({ shape: "rect" })}
                              style={(selectedTemplate.shape || "rect") === "rect" ? activeSegmentButtonStyle : segmentButtonStyle}
                            >
                              四角
                            </button>
                            <button
                              onClick={() =>
                                updateSelectedTemplate({
                                  shape: "circle",
                                  heightMm: selectedTemplate.widthMm,
                                })
                              }
                              style={selectedTemplate.shape === "circle" ? activeSegmentButtonStyle : segmentButtonStyle}
                            >
                              丸
                            </button>
                          </div>

                          {(selectedTemplate.shape || "rect") === "circle" ? (
                            <>
                              <label style={smallLabelStyle}>直径（mm）</label>
                              {numberInput(selectedTemplate.widthMm, (next) =>
                                updateSelectedTemplate({ widthMm: next, heightMm: next })
                              )}
                            </>
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <div style={{ flex: 1 }}>
                                <label style={smallLabelStyle}>横幅（mm）</label>
                                {numberInput(selectedTemplate.widthMm, (next) => updateSelectedTemplate({ widthMm: next }))}
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={smallLabelStyle}>奥行（mm）</label>
                                {numberInput(selectedTemplate.heightMm, (next) => updateSelectedTemplate({ heightMm: next }))}
                              </div>
                            </div>
                          )}

                          <label style={smallLabelStyle}>色</label>
                          {renderPalette(selectedTemplate.color, (value) => updateSelectedTemplate({ color: value }))}

                          <button onClick={() => addFurnitureFromTemplate(selectedTemplate)} style={blueActionButtonStyle}>
                            この家具を図面に追加
                          </button>

                          <button onClick={deleteSelectedTemplate} style={dangerOutlineButtonStyle}>
                            この家具テンプレを削除
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {rightTab === "settings" && (
                    <div style={panelBoxStyle}>
                      <strong>選択中の家具</strong>

                      {!selectedItem ? (
                        <p style={helpTextStyle}>家具またはラベルを選択してください。</p>
                      ) : (
                        <>
                          <label style={smallLabelStyle}>{selectedItem.type === "label" ? "ラベル名" : "家具名"}</label>
                          <input
                            value={selectedItem.name}
                            onChange={(e) => updateSelectedItem({ name: e.target.value })}
                            style={inputStyle}
                          />

                          {selectedItem.type === "furniture" && (
                            <>
                              <label style={smallLabelStyle}>形</label>
                              <div style={segmentedRowStyle}>
                                <button
                                  onClick={() => updateSelectedItem({ shape: "rect" })}
                                  style={(selectedItem.shape || "rect") === "rect" ? activeSegmentButtonStyle : segmentButtonStyle}
                                >
                                  四角
                                </button>
                                <button
                                  onClick={() => updateSelectedItem({ shape: "circle", heightMm: selectedItem.widthMm })}
                                  style={selectedItem.shape === "circle" ? activeSegmentButtonStyle : segmentButtonStyle}
                                >
                                  丸
                                </button>
                              </div>
                            </>
                          )}

                          {(selectedItem.shape || "rect") === "circle" ? (
                            <>
                              <label style={smallLabelStyle}>直径（mm）</label>
                              {numberInput(selectedItem.widthMm, (next) => updateSelectedItem({ widthMm: next, heightMm: next }))}
                            </>
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <div style={{ flex: 1 }}>
                                <label style={smallLabelStyle}>横幅（mm）</label>
                                {numberInput(selectedItem.widthMm, (next) => updateSelectedItem({ widthMm: next }))}
                              </div>

                              <div style={{ flex: 1 }}>
                                <label style={smallLabelStyle}>奥行（mm）</label>
                                {numberInput(selectedItem.heightMm, (next) => updateSelectedItem({ heightMm: next }))}
                              </div>
                            </div>
                          )}

                          {selectedItem.type === "furniture" && (
                            <button onClick={saveSelectedItemAsTemplate} style={blueActionButtonStyle}>
                              テンプレに保存
                            </button>
                          )}

                          <div style={infoBoxStyle}>
                            表示：横 約{Math.round(mmToPx(selectedItem.widthMm))}px /
                            縦 約{Math.round(mmToPx(selectedItem.heightMm))}px
                          </div>

                          <label style={smallLabelStyle}>位置</label>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {numberInput(selectedItem.x, (next) => updateSelectedItem({ x: next }), { min: -9999, placeholder: "X" })}
                            {numberInput(selectedItem.y, (next) => updateSelectedItem({ y: next }), { min: -9999, placeholder: "Y" })}
                          </div>

                          <label style={smallLabelStyle}>移動幅（px）</label>
                          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                            {[5, 10, 50].map((amount) => (
                              <button
                                key={amount}
                                onClick={() => setMoveAmount(amount)}
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  borderRadius: "7px",
                                  border: moveAmount === amount ? "3px solid #2563eb" : "1px solid #cbd5e1",
                                  background: moveAmount === amount ? "#dbeafe" : "white",
                                  cursor: "pointer",
                                }}
                              >
                                {amount}
                              </button>
                            ))}
                          </div>

                          <div style={moveGridStyle}>
                            <div />
                            <button onClick={() => moveSelectedItem(0, -moveAmount)} style={moveButtonStyle}>↑</button>
                            <div />
                            <button onClick={() => moveSelectedItem(-moveAmount, 0)} style={moveButtonStyle}>←</button>
                            <button onClick={() => moveSelectedItem(0, moveAmount)} style={moveButtonStyle}>↓</button>
                            <button onClick={() => moveSelectedItem(moveAmount, 0)} style={moveButtonStyle}>→</button>
                          </div>

                          <label style={smallLabelStyle}>ぴったり配置</label>
                          <div style={snapButtonGridStyle}>
                            <button onClick={() => snapSelectedToNearest("left")} style={smallButtonStyle}>左に</button>
                            <button onClick={() => snapSelectedToNearest("right")} style={smallButtonStyle}>右に</button>
                            <button onClick={() => snapSelectedToNearest("top")} style={smallButtonStyle}>上に</button>
                            <button onClick={() => snapSelectedToNearest("bottom")} style={smallButtonStyle}>下に</button>
                          </div>
                          <div style={tinyHelpTextStyle}>
                            横並びなどでズレる時は、このボタンで近くの家具にぴったり合わせます。
                          </div>

                          <label style={smallLabelStyle}>角度（度）</label>
                          {angleInput(selectedItem.rotation || 0, (next) => updateSelectedItem({ rotation: next }))}
                          <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                            {[0, 45, 90, 180, 270].map((angle) => (
                              <button key={angle} onClick={() => updateSelectedItem({ rotation: angle })} style={smallButtonStyle}>
                                {angle}°
                              </button>
                            ))}
                          </div>

                          <label style={smallLabelStyle}>色</label>
                          {renderPalette(selectedItem.color, (value) => updateSelectedItem({ color: value }))}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <button onClick={duplicateSelectedItem} style={copyButtonStyle}>複製</button>
                            <button onClick={bringSelectedForward} style={copyButtonStyle}>前面へ</button>
                          </div>
                          <button onClick={sendSelectedBackward} style={copyButtonStyle}>背面へ</button>
                          <button onClick={deleteSelectedItem} style={deleteButtonStyle}>この家具を削除</button>
                        </>
                      )}
                    </div>
                  )}

                  {rightTab === "comments" && (
                    <div style={panelBoxStyle}>
                      <strong>コメント・メモ</strong>

                      <label style={smallLabelStyle}>記入者</label>
                      <input value={newMemoAuthor} onChange={(e) => setNewMemoAuthor(e.target.value)} placeholder="例：名前" style={inputStyle} />

                      <label style={smallLabelStyle}>コメント</label>
                      <textarea
                        value={newMemoText}
                        onChange={(e) => setNewMemoText(e.target.value)}
                        placeholder="例：机の間隔をもう少し広げる"
                        style={memoTextareaStyle}
                      />

                      <button onClick={addMemo} style={blueActionButtonStyle}>コメント追加</button>

                      {memos.length === 0 ? (
                        <p style={helpTextStyle}>まだコメントはありません。</p>
                      ) : (
                        memos.map((memo) => (
                          <div key={memo.id} style={memoCardStyle}>
                            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>{memo.author}</div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.5 }}>{memo.text}</div>
                            <div style={{ marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                              作成：{memo.createdAt}
                              <br />
                              更新：{memo.updatedAt}
                            </div>
                            <button onClick={() => editMemo(memo)} style={smallPlainButtonStyle}>修正</button>
                            <button onClick={() => deleteMemo(memo.id)} style={smallDangerButtonStyle}>削除</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {helpOpen && (
          <div className="print-hide" style={modalOverlayStyle} onClick={() => setHelpOpen(false)}>
            <div style={helpModalStyle} onClick={(event) => event.stopPropagation()}>
              <div style={helpTitleRowStyle}>
                <h2 style={{ margin: 0, fontSize: "18px" }}>使い方</h2>
                <button onClick={() => setHelpOpen(false)} style={collapseButtonStyle}>閉じる</button>
              </div>

              <ol style={guideListStyle}>
                <li>左の「家具追加」から家具を押すと、図面に追加できます。</li>
                <li>家具テンプレの名前・寸法・色を変える時は、右側の「テンプレ管理」を使います。</li>
                <li>寸法は mm 入力です。丸い家具は「直径（mm）」で入力します。</li>
                <li>配置した家具を選ぶと、右側の「家具設定」で位置・角度・色などを変更できます。</li>
                <li>「カチッと」をONにすると、矢印移動時に近くの家具やグリッドへ軽く揃います。</li>
                <li>うまく揃わない時は「ぴったり配置」ボタンを使ってください。</li>
                <li>間違えたら「↩ 1個前に戻る」または Ctrl+Z / Command+Z で戻せます。</li>
                <li>作業後は「txt書き出し」で最新版データを共有してください。</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const appStyle: CSSProperties = {
  height: "100vh",
  fontFamily:
    '"Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, system-ui, sans-serif',
  background: "#eef2f7",
  color: "#0f172a",
  display: "flex",
  flexDirection: "column",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "44px",
  padding: "6px 8px",
  background: "#ffffff",
  borderBottom: "1px solid #dbe3ef",
  flexShrink: 0,
  boxSizing: "border-box",
};

const topButtonStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const topCheckStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "12px",
  color: "#334155",
  whiteSpace: "nowrap",
};

const topMessageStyle: CSSProperties = {
  marginLeft: "auto",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  maxWidth: "360px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mainAreaStyle: CSSProperties = {
  display: "flex",
  minHeight: 0,
  flex: 1,
};

const leftPanelStyle: CSSProperties = {
  width: "245px",
  background: "#ffffff",
  padding: "10px",
  borderRight: "1px solid #dbe3ef",
  overflow: "auto",
  flexShrink: 0,
};

const rightPanelStyle: CSSProperties = {
  width: "275px",
  background: "#ffffff",
  padding: "10px",
  borderLeft: "1px solid #dbe3ef",
  overflow: "auto",
  flexShrink: 0,
};

const rightOpenButtonStyle: CSSProperties = {
  alignSelf: "flex-start",
  margin: "8px",
  padding: "10px 12px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "12px",
  height: "40px",
};

const centerWrapperStyle: CSSProperties = {
  flex: 1,
  padding: "8px",
  overflow: "auto",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "flex-start",
};

const stageStyle: CSSProperties = {
  width: 1100,
  height: 778,
  background: "#ffffff",
  borderRadius: "6px",
  position: "relative",
  border: "2px solid #cbd5e1",
  overflow: "hidden",
  flex: "0 0 auto",
};

const panelTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "8px",
  fontSize: "17px",
  color: "#0f172a",
};

const rightTitleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "8px",
};

const collapseButtonStyle: CSSProperties = {
  padding: "5px 8px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "11px",
};

const sectionWrapStyle: CSSProperties = {
  marginTop: "8px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  overflow: "hidden",
};

const sectionHeaderStyle: CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  border: "none",
  background: "#f8fafc",
  color: "#0f172a",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "bold",
};

const sectionBodyStyle: CSSProperties = {
  padding: "0 10px 10px",
  fontSize: "13px",
  lineHeight: 1.5,
};

const addCardStyle: CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "8px",
  borderRadius: "10px",
  background: "#ffffff",
  cursor: "pointer",
  boxSizing: "border-box",
  display: "flex",
  gap: "8px",
  alignItems: "center",
  textAlign: "left",
};

const addColorMarkStyle: CSSProperties = {
  width: "34px",
  height: "34px",
  border: "1px solid #94a3b8",
  flexShrink: 0,
};

const addCardNameStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: "bold",
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const addCardSizeStyle: CSSProperties = {
  display: "block",
  fontSize: "11px",
  color: "#64748b",
  marginTop: "2px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: "6px",
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  fontSize: "13px",
  background: "#ffffff",
};

const memoTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "76px",
  marginTop: "6px",
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  fontSize: "13px",
  background: "#ffffff",
  resize: "vertical",
  lineHeight: 1.5,
};

const smallTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "62px",
  marginTop: "6px",
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  fontSize: "13px",
  background: "#ffffff",
  resize: "vertical",
  lineHeight: 1.5,
};

const checkboxLineStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "flex-start",
  marginTop: "8px",
  fontSize: "12px",
  color: "#334155",
  lineHeight: 1.4,
};

const panelBoxStyle: CSSProperties = {
  marginTop: "10px",
  padding: "10px",
  borderRadius: "10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: "13px",
  lineHeight: 1.5,
};

const helpTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.5,
};

const tinyHelpTextStyle: CSSProperties = {
  fontSize: "11px",
  color: "#64748b",
  lineHeight: 1.4,
  marginTop: "2px",
};

const smallLabelStyle: CSSProperties = {
  display: "block",
  marginTop: "8px",
  fontSize: "12px",
  color: "#334155",
};

const messageBoxStyle: CSSProperties = {
  marginTop: "8px",
  padding: "8px",
  borderRadius: "7px",
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  fontSize: "12px",
  color: "#334155",
};

const savedCardStyle: CSSProperties = {
  marginTop: "8px",
  padding: "8px",
  border: "1px solid #dbe3ef",
  borderRadius: "8px",
  background: "#ffffff",
};

const memoCardStyle: CSSProperties = {
  marginTop: "10px",
  padding: "9px",
  border: "1px solid #dbe3ef",
  borderRadius: "8px",
  background: "#ffffff",
};

const infoBoxStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: "8px",
  padding: "8px",
  borderRadius: "7px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
  color: "#475569",
  lineHeight: 1.5,
};

const moveGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "6px",
  marginTop: "8px",
};

const snapButtonGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px",
  marginTop: "8px",
};

const blueActionButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "9px",
  borderRadius: "7px",
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
};

const greenButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "9px",
  borderRadius: "7px",
  border: "none",
  background: "#059669",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
};

const blackButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "9px",
  borderRadius: "7px",
  border: "none",
  background: "#0f172a",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
};

const yellowButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "10px",
  padding: "10px",
  borderRadius: "7px",
  border: "none",
  background: "#d97706",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
};

const moveButtonStyle: CSSProperties = {
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
};

const smallButtonStyle: CSSProperties = {
  flex: 1,
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "12px",
};

const plainButtonStyle: CSSProperties = {
  display: "block",
  textAlign: "center",
  width: "100%",
  marginTop: "8px",
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  boxSizing: "border-box",
  fontSize: "13px",
};

const fileButtonStyle: CSSProperties = {
  display: "block",
  textAlign: "center",
  width: "100%",
  marginTop: "8px",
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  boxSizing: "border-box",
  fontSize: "13px",
  fontWeight: "bold",
};

const fileStatusStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "12px",
  color: "#64748b",
  textAlign: "center",
};

const dangerOutlineButtonStyle: CSSProperties = {
  display: "block",
  textAlign: "center",
  width: "100%",
  marginTop: "8px",
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #fca5a5",
  background: "#fff1f2",
  color: "#be123c",
  cursor: "pointer",
  boxSizing: "border-box",
  fontSize: "13px",
};

const smallPlainButtonStyle: CSSProperties = {
  marginTop: "6px",
  marginRight: "6px",
  padding: "6px 8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "11px",
};

const smallDangerButtonStyle: CSSProperties = {
  marginTop: "6px",
  padding: "6px 8px",
  borderRadius: "7px",
  border: "1px solid #fca5a5",
  background: "#fff1f2",
  color: "#be123c",
  cursor: "pointer",
  fontSize: "11px",
};

const copyButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "10px",
  padding: "9px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "13px",
};

const deleteButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "10px",
  borderRadius: "7px",
  border: "none",
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
};

const emptyStageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  fontSize: "20px",
  textAlign: "center",
  lineHeight: 1.8,
};

const tabRowStyle: CSSProperties = {
  display: "flex",
  gap: "6px",
  marginBottom: "10px",
};

const tabButtonStyle: CSSProperties = {
  flex: 1,
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "12px",
};

const activeTabButtonStyle: CSSProperties = {
  flex: 1,
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #2563eb",
  background: "#dbeafe",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold",
};

const segmentedRowStyle: CSSProperties = {
  display: "flex",
  gap: "6px",
  marginTop: "6px",
};

const segmentButtonStyle: CSSProperties = {
  flex: 1,
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "12px",
};

const activeSegmentButtonStyle: CSSProperties = {
  flex: 1,
  padding: "8px",
  borderRadius: "7px",
  border: "1px solid #2563eb",
  background: "#dbeafe",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold",
};

const paletteWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "6px",
  marginTop: "8px",
  padding: "8px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const paletteButtonStyle: CSSProperties = {
  height: "30px",
  borderRadius: "8px",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
};

const paletteLabelStyle: CSSProperties = {
  position: "absolute",
  left: 2,
  right: 2,
  bottom: 1,
  fontSize: "9px",
  color: "#0f172a",
  textShadow: "0 1px 2px rgba(255,255,255,0.95)",
  fontWeight: "bold",
};

const guideEndLeftStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: "-9px",
  width: "4px",
  height: "22px",
  background: "#dc2626",
};

const guideEndRightStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  top: "-9px",
  width: "4px",
  height: "22px",
  background: "#dc2626",
};

const guideLabelStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "-28px",
  transform: "translateX(-50%)",
  background: "#ffffff",
  color: "#dc2626",
  border: "1px solid #dc2626",
  borderRadius: "7px",
  padding: "3px 8px",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.35)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const helpModalStyle: CSSProperties = {
  width: "min(560px, 92vw)",
  maxHeight: "82vh",
  overflow: "auto",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "18px",
  boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
};

const helpTitleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const guideListStyle: CSSProperties = {
  margin: "14px 0 0 20px",
  padding: 0,
  fontSize: "14px",
  color: "#334155",
  lineHeight: 1.8,
};
