import React, { useCallback, useEffect, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from "@lexical/html";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { $getRoot } from "lexical";

import Toolbar from "./Toolbar";
import "./styles.css";

interface GoodTextEditorProps {
  onChange?: (html: string) => void;
  initialHtml?: string;
}

// --- CLEANUP UTILITY ---
const cleanLexicalOutput = (html: string) => {
  if (!html) return "";

  return html
    // 1. Remove ONLY the white-space: pre-wrap style, but keep other styles (like text-align)
    // This Regex looks for style="..." and removes 'white-space: pre-wrap;' from inside it
    .replace(/(style="[^"]*)white-space:\s*pre-wrap;?\s*([^"]*")/g, '$1$2')

    // 2. If the style attribute ends up empty (style=""), remove the attribute entirely
    .replace(/ style=""/g, "")

    // 3. Remove the specific span wrapper if it has no other styles left
    .replace(/<span>(.*?)<\/span>/g, "$1")

    // 4. Standard cleanups
    .replace(/&nbsp;/g, " ")
    .replace(/<p><br><\/p>/g, "");
};

// --- PLUGIN: LOADS DATA WHEN IT ARRIVES ---
const LoadInitialHtmlPlugin = ({ html }: { html: string }) => {
  const [editor] = useLexicalComposerContext();
  const isLoadedRef = useRef(false);

  useEffect(() => {
    // If html exists and haven't loaded it yet...
    if (html && !isLoadedRef.current) {
      editor.update(() => {
        // 1. Parse the HTML string into a DOM
        const parser = new DOMParser();
        // Clean it first so it looks nice
        const cleanHtml = cleanLexicalOutput(html);
        const dom = parser.parseFromString(cleanHtml, "text/html");

        // 2. Convert DOM to Lexical Nodes
        const nodes = $generateNodesFromDOM(editor, dom);

        // 3. Clear editor and Insert nodes
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
      });

      // Mark as loaded so we don't overwrite user typing later
      isLoadedRef.current = true;
    }
  }, [html, editor]);

  return null;
};

const GoodTextEditor: React.FC<GoodTextEditorProps> = ({ onChange, initialHtml }) => {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlContent, setHtmlContent] = useState<string>(initialHtml || "");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync internal state if initialHtml updates (e.g. from API)
  useEffect(() => {
    if (initialHtml) {
      setHtmlContent(initialHtml);
    }
  }, [initialHtml]);

  const editorConfig = {
    namespace: "ProductionEditor",
    theme: {
      list: {
        ul: "editor-list-ul",
        ol: "editor-list-ol",
        listitem: "editor-list-item",
      },
      link: "editor-link",
    },
    onError(error: Error) {
      console.error(error);
    },
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
  };

  const handleChange = useCallback(
    (editorState: any, editor: any) => {
      editorState.read(() => {
        const rawHtml = $generateHtmlFromNodes(editor, null);
        const cleanHtml = cleanLexicalOutput(rawHtml);

        setHtmlContent(cleanHtml);
        if (onChange) onChange(cleanHtml);
      });
    },
    [onChange],
  );

  const switchToHtmlMode = useCallback((editor: any) => {
    const html = editor.getEditorState().read(() => {
      const raw = $generateHtmlFromNodes(editor, null);
      return cleanLexicalOutput(raw);
    });
    setHtmlContent(html);
    setMode("html");
    requestAnimationFrame(() => {
      if (textAreaRef.current) textAreaRef.current.focus();
    });
  }, []);

  const switchToVisualMode = useCallback(
    (editor: any) => {
      try {
        editor.update(() => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlContent, "text/html");
          const nodes = $generateNodesFromDOM(editor, dom);
          const root = $getRoot();
          root.clear();
          root.append(...nodes);
        });
      } catch (e) {
        console.error("Error parsing HTML into editor:", e);
      }
      setMode("visual");
    },
    [htmlContent],
  );

  return (
    <div className="text-editor-container">
      <LexicalComposer initialConfig={editorConfig}>
        {/* THIS PLUGIN HANDLES THE LATE DATA LOADING */}
        <LoadInitialHtmlPlugin html={initialHtml || ""} />

        <Toolbar
          mode={mode}
          onToggleMode={(editor, newMode) => {
            if (newMode === "html") {
              switchToHtmlMode(editor);
            } else {
              switchToVisualMode(editor);
            }
          }}
        />

        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                style={{ display: mode === "visual" ? "block" : "none" }}
              />
            }
            placeholder={
              <div className="editor-placeholder">Start typing...</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <OnChangePlugin onChange={handleChange} />

          {mode === "html" && (
            <textarea
              ref={textAreaRef}
              className="editor-html-view"
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                if (onChange) onChange(e.target.value);
              }}
            />
          )}
        </div>
      </LexicalComposer>
    </div>
  );
};

export default GoodTextEditor;