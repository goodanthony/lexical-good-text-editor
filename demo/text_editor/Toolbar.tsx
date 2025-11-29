import React, { useEffect, useState, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode } from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";

// -----------------------------------------------------------------------------
// 1. INLINE ICONS (Zero Dependencies)
// Using SVGs with "currentColor" allows them to change color via CSS (active states)
// -----------------------------------------------------------------------------
const Icons = {
  Undo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
  ),
  Redo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7" /></svg>
  ),
  Bold: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
  ),
  Italic: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
  ),
  Underline: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
  ),
  AlignLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
  ),
  AlignCenter: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" /></svg>
  ),
  AlignRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>
  ),
  Justify: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
  ),
  Link: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
  ),
};

interface ToolbarProps {
  mode: "visual" | "html";
  onToggleMode: (editor: any, newMode: "visual" | "html") => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ mode, onToggleMode }) => {
  const [editor] = useLexicalComposerContext();

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));

    const anchorNode = selection.anchor.getNode();
    if ($isRootNode(anchorNode)) return;

    const element = anchorNode.getTopLevelElementOrThrow();
    const type = element.getType();

    if (type === "heading") {
      // @ts-ignore
      setBlockType(element.getTag());
    } else if (type === "list") {
      // @ts-ignore
      setBlockType(element.getListType());
    } else {
      setBlockType("paragraph");
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => updateToolbar());
    });
  }, [editor, updateToolbar]);

  const toggleMode = () => {
    const newMode = mode === "visual" ? "html" : "visual";
    onToggleMode(editor, newMode);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  };

  return (
    <div className="toolbar">
      {/* History */}
      <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">
        <Icons.Undo />
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">
        <Icons.Redo />
      </button>

      <span className="toolbar-separator" />

      {/* Formatting */}
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        className={isBold ? "active" : ""}
        title="Bold"
      >
        <Icons.Bold />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        className={isItalic ? "active" : ""}
        title="Italic"
      >
        <Icons.Italic />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        className={isUnderline ? "active" : ""}
        title="Underline"
      >
        <Icons.Underline />
      </button>

      <span className="toolbar-separator" />

      {/* Alignment */}
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")} title="Align Left">
        <Icons.AlignLeft />
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")} title="Align Center">
        <Icons.AlignCenter />
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")} title="Align Right">
        <Icons.AlignRight />
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")} title="Justify">
        <Icons.Justify />
      </button>

      <span className="toolbar-separator" />

      {/* Blocks */}
      <select
        value={blockType}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "paragraph") editor.update(() => $setBlocksType($getSelection(), $createParagraphNode));
          else if (val === "h1") editor.update(() => $setBlocksType($getSelection(), () => $createHeadingNode("h1")));
          else if (val === "h2") editor.update(() => $setBlocksType($getSelection(), () => $createHeadingNode("h2")));
          else if (val === "bullet") editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          else if (val === "number") editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }}
      >
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="bullet">Bullet List</option>
        <option value="number">Numbered List</option>
      </select>

      <span className="toolbar-separator" />

      <button type="button" onClick={insertLink} title="Link">
        <Icons.Link />
      </button>

      <span className="toolbar-separator" />

      {/* Mode Switcher */}
      <button type="button" onClick={toggleMode} style={{ width: 'auto', paddingLeft: 8, paddingRight: 8, fontSize: '12px', fontWeight: 600 }}>
        {mode === "visual" ? "HTML" : "VISUAL"}
      </button>
    </div>
  );
};

export default Toolbar;
