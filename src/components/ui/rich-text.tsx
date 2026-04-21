"use client";

import { useEditor, EditorContent } from "@tiptap/react";
// Removed BubbleMenu import as it is no longer used for docked toolbar
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
// Link and Underline are now included in StarterKit v3
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Link2Off,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { Label } from "./label";
import { AssetPicker } from "../assets/asset-picker";

interface RichTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  workspaceId?: string;
  minHeight?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  multiline?: boolean;
}

export function RichText({ 
  value, 
  onChange, 
  placeholder = "Type something...", 
  className,
  workspaceId,
  minHeight = "min-h-[40px]",
  onFocus,
  onBlur,
  multiline = true,
}: RichTextProps) {
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Link state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [hasLinkInRange, setHasLinkInRange] = useState(false);


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: multiline ? {} : false,
        orderedList: multiline ? {} : false,
        codeBlock: multiline ? {} : false,
        blockquote: multiline ? {} : false,
        heading: multiline ? {} : false,
        horizontalRule: multiline ? {} : false,
        // Link and Underline are included in StarterKit v3, configure them here
        underline: {},
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-4 cursor-pointer",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "before:content-[attr(data-placeholder)] before:text-muted-foreground/50 before:float-left before:pointer-events-none before:h-0",
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-2",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (editor.isEmpty) {
        onChange("");
      } else {
        onChange(html);
      }
    },
    onFocus: () => {
      setIsFocused(true);
      onFocus?.();
    },
    onBlur: () => {
      // Small timeout to allow clicking inside popower without immediately blurring
      setTimeout(() => {
        if (!document.activeElement?.closest('[data-slot="popover-content"]')) {
          setIsFocused(false);
        }
      }, 100);
      onBlur?.();
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (!multiline && event.key === "Enter") {
          return true; // Stop Enter from creating new lines
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  const handleLinkSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      if (editor.isActive("link")) {
        // Just update the URL of the existing link mark
        editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      } else {
        // Insert new link
        editor.chain().focus()
          .insertContent({
            type: "text",
            text: linkText || linkUrl,
            marks: [{ type: "link", attrs: { href: linkUrl } }]
          })
          .run();
      }
    }
    setLinkPopoverOpen(false);
  };

  const handleLinkPopoverOpen = (open: boolean) => {
    if (open && editor) {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      const isExactlyLink = editor.isActive("link");
      
      // Check if ANY part of the selection contains a link
      const anyLinkInRange = editor.state.doc.rangeHasMark(from, to, editor.schema.marks.link);
      setHasLinkInRange(anyLinkInRange);
      
      if (anyLinkInRange || isExactlyLink) {
        setLinkUrl(editor.getAttributes("link").href || "");
      } else {
        setLinkUrl("");
      }
      setLinkText(selectedText);
    }
    setLinkPopoverOpen(open);
  };

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      if (!editor.isFocused) {
        editor.commands.setContent(value || "", { emitUpdate: false });
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div 
      className={cn(
        "relative flex flex-col w-full rounded-lg border border-input transition-all ring-offset-background bg-card",
        isFocused && "ring-2 ring-ring/50 border-ring",
        className
      )}
    >
      <AnimatePresence>
        {editor && isFocused && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-muted/40 border-b border-border p-1 rounded-t-lg"
          >
            <div className="flex items-center gap-0.5">
              <ToolbarButton
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
                icon={<Bold className="h-4 w-4" />}
              />
              <ToolbarButton
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                icon={<Italic className="h-4 w-4" />}
              />
              <ToolbarButton
                active={editor.isActive("underline")}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                icon={<UnderlineIcon className="h-4 w-4" />}
              />
              {multiline && (
                <>
                  <div className="w-px h-4 bg-border mx-1" />
                  <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    icon={<List className="h-4 w-4" />}
                  />
                  <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    icon={<ListOrdered className="h-4 w-4" />}
                  />
                </>
              )}
              <div className="w-px h-4 bg-border mx-1" />
              <Popover open={linkPopoverOpen} onOpenChange={handleLinkPopoverOpen}>
                <PopoverTrigger asChild>
                  <ToolbarButton
                    active={editor.isActive("link")}
                    icon={<LinkIcon className="h-4 w-4" />}
                    onClick={() => {}} // Handled by PopoverTrigger
                  />
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start" side="top">
                  <form onSubmit={handleLinkSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        placeholder="https://example.com"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link-text">Text to display</Label>
                      <Input
                        id="link-text"
                        placeholder="Link text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        disabled={hasLinkInRange}
                      />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      {hasLinkInRange ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            editor.chain().focus().extendMarkRange("link").unsetLink().run();
                            setLinkPopoverOpen(false);
                          }}
                        >
                          <Link2Off className="h-4 w-4 mr-2" />
                          Unlink
                        </Button>
                      ) : (
                        <div />
                      )}
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setLinkPopoverOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          size="sm"
                          onMouseDown={(e) => e.preventDefault()}
                          disabled={hasLinkInRange && !editor.isActive("link")}
                        >
                          {editor.isActive("link") ? "Update" : "Insert"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </PopoverContent>
              </Popover>
              {workspaceId && multiline && (
                <ToolbarButton
                  onClick={() => setAssetPickerOpen(true)}
                  icon={<ImageIcon className="h-4 w-4" />}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={cn(
          "w-full px-3 py-2 cursor-text transition-all",
          minHeight,
          !multiline && "prose-p:m-0"
        )}
        onClick={() => editor.chain().focus().run()}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror:focus {
            outline: none;
          }
          .ProseMirror blockquote {
            padding-left: 1rem;
            border-left: 2px solid #e9ecef;
          }
          .ProseMirror ul {
            list-style-type: disc;
            padding-left: 1.2rem;
          }
          .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 1.2rem;
          }
          .ProseMirror img {
            display: block;
            margin: 0.5rem 0;
          }
        `}} />
        <EditorContent 
          editor={editor} 
          className="prose prose-sm dark:prose-invert max-w-none" 
        />
      </div>

      {workspaceId && (
        <AssetPicker
          open={assetPickerOpen}
          onOpenChange={setAssetPickerOpen}
          workspaceId={workspaceId}
          onSelect={(url) => {
            editor.chain().focus().setImage({ src: url }).run();
          }}
        />
      )}
    </div>
  );
}

function ToolbarButton({ 
  active, 
  onClick, 
  icon,
  ...props
}: { 
  active?: boolean; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  icon: React.ReactNode; 
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors outline-none",
        active && "bg-accent text-accent-foreground"
      )}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      {...props}
      onClick={(e) => {
        onClick?.(e);
      }}
    >
      {icon}
    </Button>
  );
}
