"use client";

import { useEditor, EditorContent, Extension, Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
// Removed BubbleMenu import as it is no longer used for docked toolbar
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
// Link and Underline are now included in StarterKit v3
import { useState, useEffect, useId, useRef, useMemo } from "react";
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
  Image as ImageIcon,
  ChevronDown,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SmilePlus,
  HelpCircle,
  Baseline,
  Highlighter
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { Label } from "./label";
import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";
import { getWorkspaceAssets, uploadAsset } from "@/lib/actions/assets";
import type { Asset } from "@/db/schema";
import {
  Upload,
  Search,
  Loader2,
  X,
  Plus,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { MoveDiagonal2 } from "lucide-react";

const ResizableImageComponent = ({ node, updateAttributes, selected, editor }: any) => {
  const [resizing, setResizing] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(editor.isFocused);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const onFocus = () => setIsEditorFocused(true);
    const onBlur = () => setIsEditorFocused(false);

    editor.on('focus', onFocus);
    editor.on('blur', onBlur);

    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizing(true);
    
    const startX = e.pageX;
    const startWidth = imgRef.current?.width || 0;
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.pageX;
      const diffX = currentX - startX;
      const newWidth = Math.max(50, startWidth + diffX);
      updateAttributes({ width: newWidth });
    };
    
    const onPointerUp = () => {
      setResizing(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
    
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  return (
    <NodeViewWrapper
      className={cn(
        "relative leading-none group/img-wrapper max-w-full my-2",
        node.attrs.textAlign === 'center' && "mx-auto flex justify-center",
        node.attrs.textAlign === 'right' && "ml-auto flex justify-end",
        node.attrs.textAlign === 'left' && "mr-auto flex justify-start",
        "w-fit"
      )}
      style={{ textAlign: node.attrs.textAlign }}
      data-drag-handle
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        width={node.attrs.width}
        height={node.attrs.height}
        draggable={false}
        className={cn(
          "rounded-lg transition-all",
          (selected && isEditorFocused) ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-1 hover:ring-primary/50 hover:ring-offset-1 hover:ring-offset-background"
        )}
      />
      {selected && isEditorFocused && (
        <div
          onPointerDown={onPointerDown}
          className="absolute bottom-1 right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 border-2 border-background touch-none"
          title="Resize image"
        >
          <MoveDiagonal2 className="w-3.5 h-3.5" />
        </div>
      )}
      {resizing && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-bl-lg font-bold z-20 shadow-sm pointer-events-none border-l border-b border-background/20">
          {Math.round(node.attrs.width || 0)}px
        </div>
      )}
    </NodeViewWrapper>
  );
};

const ResizableIconComponent = ({ node, updateAttributes, selected, editor }: any) => {
  const [resizing, setResizing] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(editor.isFocused);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFocus = () => setIsEditorFocused(true);
    const onBlur = () => setIsEditorFocused(false);

    editor.on('focus', onFocus);
    editor.on('blur', onBlur);

    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizing(true);
    
    const startX = e.pageX;
    const startSize = node.attrs.size || 24;
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.pageX;
      const diffX = currentX - startX;
      const newSize = Math.max(12, Math.min(200, startSize + diffX));
      updateAttributes({ size: newSize });
    };
    
    const onPointerUp = () => {
      setResizing(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
    
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  let IconComponent = (LucideIcons as any)[node.attrs.name] || LucideIcons.HelpCircle;
  if (typeof IconComponent !== 'function' && typeof IconComponent !== 'object') {
    IconComponent = LucideIcons.HelpCircle;
  }

  return (
    <NodeViewWrapper
      className={cn(
        "relative leading-none group/icon-wrapper align-middle my-1 mx-0.5 w-fit",
        node.attrs.textAlign === 'center' && "mx-auto flex justify-center",
        node.attrs.textAlign === 'right' && "ml-auto flex justify-end",
        (node.attrs.textAlign === 'left' || !node.attrs.textAlign) && "inline-flex justify-start"
      )}
      data-drag-handle
    >
      <div
        ref={containerRef}
        className={cn(
          "rounded-md transition-all flex items-center justify-center p-0.5",
          (selected && isEditorFocused) ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "hover:ring-1 hover:ring-primary/30 hover:ring-offset-1 hover:ring-offset-background"
        )}
        style={{ width: node.attrs.size, height: node.attrs.size }}
      >
        <IconComponent size={node.attrs.size} color="currentColor" />
      </div>
      {selected && isEditorFocused && (
        <div
          onPointerDown={onPointerDown}
          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 border border-background touch-none"
          title="Resize icon"
        >
          <MoveDiagonal2 className="w-2.5 h-2.5" />
        </div>
      )}
      {resizing && (
        <div className="absolute top-0 right-0 translate-x-full bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded-r-md font-bold z-20 shadow-sm pointer-events-none border border-background/20">
          {Math.round(node.attrs.size || 0)}px
        </div>
      )}
    </NodeViewWrapper>
  );
};

const ResizableIcon = Node.create({
  name: 'resizableIcon',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      name: {
        default: 'HelpCircle',
      },
      size: {
        default: 24,
      },
      textAlign: {
        default: 'left',
        parseHTML: element => element.style.textAlign || 'left',
        renderHTML: attributes => ({
          style: `text-align: ${attributes.textAlign}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-lucide-icon]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-lucide-icon': '', ...HTMLAttributes }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableIconComponent);
  },

  addCommands() {
    return {
      setIcon: (options: { name: string, size?: number }) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    } as any;
  },
});

const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attributes => ({
          width: attributes.width,
        }),
        parseHTML: element => element.getAttribute('width'),
      },
      height: {
        default: null,
        renderHTML: attributes => ({
          height: attributes.height,
        }),
        parseHTML: element => element.getAttribute('height'),
      },
      textAlign: {
        default: 'left',
        renderHTML: attributes => ({
          style: `text-align: ${attributes.textAlign}`,
        }),
        parseHTML: element => element.style.textAlign || 'left',
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

// Custom Font Size Extension
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace("pt", ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}pt`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
          ({ chain }: { chain: any }) => {
            return chain().setMark("textStyle", { fontSize }).run();
          },
      unsetFontSize:
        () =>
          ({ chain }: { chain: any }) => {
            return chain()
              .setMark("textStyle", { fontSize: null })
              .removeEmptyTextStyle()
              .run();
          },
    } as any;
  },
});

// Custom Color Extension
const Color = Extension.create({
  name: "color",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => element.style.color,
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }
              return {
                style: `color: ${attributes.color}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setColor:
        (color: string) =>
          ({ chain }: { chain: any }) => {
            return chain().setMark("textStyle", { color }).run();
          },
      unsetColor:
        () =>
          ({ chain }: { chain: any }) => {
            return chain()
              .setMark("textStyle", { color: null })
              .removeEmptyTextStyle()
              .run();
          },
    } as any;
  },
});

// Custom Highlight Extension
const Highlight = Extension.create({
  name: "highlight",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setHighlight:
        (color: string) =>
          ({ chain }: { chain: any }) => {
            return chain().setMark("textStyle", { backgroundColor: color }).run();
          },
      unsetHighlight:
        () =>
          ({ chain }: { chain: any }) => {
            return chain()
              .setMark("textStyle", { backgroundColor: null })
              .removeEmptyTextStyle()
              .run();
          },
    } as any;
  },
});

const FONT_SIZES = [
  { label: "8pt", value: "8" },
  { label: "10pt", value: "10" },
  { label: "12pt", value: "12" },
  { label: "14pt", value: "14" },
  { label: "16pt", value: "16" },
  { label: "18pt", value: "18" },
  { label: "24pt", value: "24" },
  { label: "32pt", value: "32" },
];

const COLORS = [
  { name: "Default", value: "" },
  { name: "White", value: "#ffffff" },
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

const HIGHLIGHT_COLORS = [
  { name: "Default", value: "" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Red", value: "#fecaca" },
  { name: "Orange", value: "#fed7aa" },
];

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
  allowImages?: boolean;
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
  allowImages = true,
}: RichTextProps) {
  const uploadInputId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Link state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [hasLinkInRange, setHasLinkInRange] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  // Image management state
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const filteredIcons = useMemo(() => {
    return Object.keys(LucideIcons).filter(name => {
      const item = (LucideIcons as any)[name];
      return (
        /^[A-Z]/.test(name) &&
        name !== 'LucideIcon' &&
        (typeof item === 'function' || (item && typeof item === 'object' && (item.$$typeof || item.render))) &&
        name.toLowerCase().includes(iconSearch.toLowerCase())
      );
    }).slice(0, 102);
  }, [iconSearch]);


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
      ResizableImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full rounded-lg",
        },
      }),
      ResizableIcon,
      TextStyle,
      FontSize,
      Color,
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph", "image", "resizableIcon"],
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
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      setIsFocused(true);
      onFocus?.();
    },
    onBlur: () => {
      // Small timeout to allow clicking inside popover without immediately blurring
      blurTimeoutRef.current = setTimeout(() => {
        if (!document.activeElement?.closest('[data-slot="popover-content"]')) {
          setIsFocused(false);
        }
      }, 150);
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

  const fetchAssets = async () => {
    if (!workspaceId) return;
    setAssetsLoading(true);
    try {
      const result = await getWorkspaceAssets(workspaceId, { type: "image" });
      if (result.success && result.data) {
        setAssets(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleImagePopoverOpen = (open: boolean) => {
    if (open) {
      fetchAssets();
      setImageSearch("");
      setExternalUrl("");
    }
    setImagePopoverOpen(open);
  };

  const handleFileUpload = async (file: File) => {
    if (!workspaceId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadAsset(workspaceId, formData);
      if (result.success && result.data) {
        editor?.chain().focus().setImage({ src: result.data.url }).run();
        setImagePopoverOpen(false);
        toast.success("Image uploaded and inserted");
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (err) {
      toast.error("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleExternalUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (externalUrl) {
      editor?.chain().focus().setImage({ src: externalUrl }).run();
      setImagePopoverOpen(false);
      setExternalUrl("");
    }
  };

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(imageSearch.toLowerCase())
  );

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      if (!editor.isFocused) {
        queueMicrotask(() => {
          editor.commands.setContent(value || "", { emitUpdate: false });
        });
      }
    }
  }, [value, editor]);

  const currentFontSize = editor?.getAttributes("textStyle").fontSize;
  const currentColor = editor?.getAttributes("textStyle").color;
  const currentHighlight = editor?.getAttributes("textStyle").backgroundColor;

  if (!editor) return null;

  return (
    <div
      className={cn(
        "relative flex flex-col-reverse lg:flex-col w-full rounded-lg border border-input transition-all ring-offset-background bg-card",
        isFocused && "ring-2 ring-ring/50 border-ring",
        className
      )}
    >
      <AnimatePresence>
        {editor && (isFocused || linkPopoverOpen || imagePopoverOpen) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-muted/40 border-t lg:border-t-0 lg:border-b border-border p-1 rounded-b-lg lg:rounded-b-none lg:rounded-t-lg"
          >
            <div className="flex flex-wrap items-center gap-0.5">
              {/* Font Size Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 flex items-center gap-1.5",
                      currentFontSize && "text-primary bg-primary/10"
                    )}
                    title="Font Size"
                  >
                    <span className="text-xs font-bold w-4">Aa</span>
                    <span className="text-[10px] font-medium min-w-[24px]">
                      {currentFontSize ? `${currentFontSize}pt` : "12pt"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-1 w-32 max-h-[300px] overflow-y-auto overscroll-contain"
                  align="start"
                  avoidCollisions
                  collisionPadding={10}
                  sticky="always"
                  onWheelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    {FONT_SIZES.map((size) => (
                      <Button
                        key={size.value}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "justify-start font-normal h-8 px-2",
                          currentFontSize === size.value && "bg-primary/10 text-primary"
                        )}
                        onClick={() => {
                          if (currentFontSize === size.value) {
                            (editor?.chain().focus() as any).unsetFontSize().run();
                          } else {
                            (editor?.chain().focus() as any).setFontSize(size.value).run();
                          }
                        }}
                      >
                        <span style={{ fontSize: `${size.value}pt` }} className="truncate">
                          {size.label}
                        </span>
                        {currentFontSize === size.value && (
                          <Check className="ml-auto h-3 w-3" />
                        )}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="h-6" />

              {/* Color Picker Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 flex items-center gap-1.5",
                      currentColor && "text-primary bg-primary/10"
                    )}
                    title="Text Color"
                  >
                    <div className="relative">
                      <Baseline className="h-4 w-4" />
                      <div
                        className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: currentColor || 'currentColor' }}
                      />
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-3 w-48 max-h-[300px] overflow-y-auto overscroll-contain"
                  align="start"
                  avoidCollisions
                  collisionPadding={10}
                  sticky="always"
                  onWheelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Text Color
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLORS.map((color) => (
                        <button
                          key={color.name}
                          className={cn(
                            "w-6 h-6 rounded-md border border-border flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                            currentColor === color.value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                          style={{
                            backgroundColor: color.value || 'transparent',
                            backgroundImage: !color.value ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                            backgroundSize: '4px 4px',
                            backgroundPosition: '0 0, 2px 2px'
                          }}
                          onClick={() => {
                            if (!color.value) {
                              (editor?.chain().focus() as any).unsetColor().run();
                            } else {
                              (editor?.chain().focus() as any).setColor(color.value).run();
                            }
                          }}
                          title={color.name}
                        >
                          {currentColor === color.value && (
                            <Check className={cn(
                              "h-3 w-3",
                              (color.name === 'White' || color.name === 'Yellow' || !color.value) ? "text-black" : "text-white"
                            )} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Highlight Picker Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 flex items-center gap-1.5",
                      currentHighlight && "text-primary bg-primary/10"
                    )}
                    title="Highlight Color"
                  >
                    <div className="relative">
                      <Highlighter className="h-4 w-4" />
                      <div
                        className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: currentHighlight || 'transparent', border: !currentHighlight ? '1px solid currentColor' : 'none' }}
                      />
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-3 w-48 max-h-[300px] overflow-y-auto overscroll-contain"
                  align="start"
                  avoidCollisions
                  collisionPadding={10}
                  sticky="always"
                  onWheelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Highlight Color
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {HIGHLIGHT_COLORS.map((color) => (
                        <button
                          key={color.name}
                          className={cn(
                            "w-full aspect-square rounded-md border border-border flex items-center justify-center transition-all hover:scale-105 active:scale-95",
                            currentHighlight === color.value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                          style={{
                            backgroundColor: color.value || 'transparent',
                            backgroundImage: !color.value ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                            backgroundSize: '4px 4px',
                            backgroundPosition: '0 0, 2px 2px'
                          }}
                          onClick={() => {
                            if (!color.value) {
                              (editor?.chain().focus() as any).unsetHighlight().run();
                            } else {
                              (editor?.chain().focus() as any).setHighlight(color.value).run();
                            }
                          }}
                          title={color.name}
                        >
                          {currentHighlight === color.value && (
                            <Check className="h-3 w-3 text-black" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="h-6" />
              <ToolbarButton
                active={editor.isActive({ textAlign: "left" })}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                icon={<AlignLeft className="h-4 w-4" />}
                title="Align Left"
              />
              <ToolbarButton
                active={editor.isActive({ textAlign: "center" })}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                icon={<AlignCenter className="h-4 w-4" />}
                title="Align Center"
              />
              <ToolbarButton
                active={editor.isActive({ textAlign: "right" })}
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                icon={<AlignRight className="h-4 w-4" />}
                title="Align Right"
              />
              <ToolbarButton
                active={editor.isActive({ textAlign: "justify" })}
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                icon={<AlignJustify className="h-4 w-4" />}
                title="Justify"
              />
              <Separator orientation="vertical" className="h-6" />

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
              <Separator orientation="vertical" className="h-6" />


              {multiline && (
                <>
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
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}
              <Popover open={linkPopoverOpen} onOpenChange={handleLinkPopoverOpen}>
                <PopoverTrigger asChild>
                  <ToolbarButton
                    active={editor.isActive("link")}
                    icon={<LinkIcon className="h-4 w-4" />}
                    onClick={() => { }} // Handled by PopoverTrigger
                  />
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-4"
                  align="start"
                  side="top"
                  avoidCollisions
                  collisionPadding={10}
                  sticky="always"
                  data-slot="popover-content"
                >
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
              <Separator orientation="vertical" className="h-6" />
              {workspaceId && allowImages && (
                <>
                  <Popover open={imagePopoverOpen} onOpenChange={handleImagePopoverOpen}>
                    <PopoverTrigger asChild>
                      <ToolbarButton
                        active={imagePopoverOpen}
                        icon={<ImageIcon className="h-4 w-4" />}
                        onClick={() => { }}
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      className={cn(
                        "w-80 p-0 overflow-hidden",
                        "data-[side=bottom]:mt-[min(0px,calc(var(--radix-popover-content-available-height)-380px))]",
                        "data-[side=top]:mb-[min(0px,calc(var(--radix-popover-content-available-height)-380px))]"
                      )}
                      align="start"
                      side="bottom"
                      sideOffset={8}
                      avoidCollisions
                      collisionPadding={10}
                      sticky="always"
                      data-slot="popover-content"
                    >
                      <div className="flex flex-col h-[380px] max-h-[85vh] overflow-y-auto">
                        {/* Upload Section */}
                        <div className="p-3 border-b bg-muted/30 shrink-0">
                          <div
                            className={cn(
                              "relative border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
                              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
                              uploading && "opacity-50 pointer-events-none"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                            onClick={() => document.getElementById(uploadInputId)?.click()}
                          >
                            <input
                              id={uploadInputId}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                              }}
                            />
                            {uploading ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-xs font-medium">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-5 w-5 text-muted-foreground" />
                                <div className="text-center">
                                  <p className="text-xs font-semibold">Click or drag image</p>
                                  <p className="text-[10px] text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* URL Section */}
                        <div className="p-3 border-b">
                          <form onSubmit={handleExternalUrlSubmit} className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Insert image URL..."
                                value={externalUrl}
                                onChange={(e) => setExternalUrl(e.target.value)}
                                className="pl-8 h-8 text-xs"
                              />
                            </div>
                            <Button type="submit" size="sm" className="h-8 px-3" disabled={!externalUrl}>
                              Insert
                            </Button>
                          </form>
                        </div>

                        {/* Asset Browser */}
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="px-3 py-2 border-b flex items-center gap-2">
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <Input
                              placeholder="Search library..."
                              value={imageSearch}
                              onChange={(e) => setImageSearch(e.target.value)}
                              className="h-7 text-xs border-none shadow-none focus-visible:ring-0 p-0"
                            />
                          </div>
                          <div 
                            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                            onWheelCapture={(e) => e.stopPropagation()}
                            onTouchMoveCapture={(e) => e.stopPropagation()}
                          >
                            <div className="p-2">
                              {assetsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                                </div>
                              ) : filteredAssets.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-10" />
                                  <p className="text-[10px]">No images found</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2">
                                  {filteredAssets.map((asset) => (
                                    <button
                                      key={asset.id}
                                      onClick={() => {
                                        editor.chain().focus().setImage({ src: asset.url }).run();
                                        setImagePopoverOpen(false);
                                      }}
                                      className="group relative aspect-square rounded-md overflow-hidden bg-muted border border-border hover:border-primary transition-all"
                                    >
                                      <img
                                        src={asset.url}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Plus className="h-4 w-4 text-white" />
                                      </div>
                                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-100 group-hover:opacity-0 transition-opacity">
                                        <p className="text-[9px] text-white truncate font-medium">{asset.name}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                    <PopoverTrigger asChild>
                      <ToolbarButton
                        active={iconPopoverOpen}
                        icon={<SmilePlus className="h-4 w-4" />}
                        onClick={() => { }}
                        title="Insert icon"
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      className={cn(
                        "w-80 p-0 overflow-hidden",
                        "data-[side=bottom]:mt-[min(0px,calc(var(--radix-popover-content-available-height)-350px))]",
                        "data-[side=top]:mb-[min(0px,calc(var(--radix-popover-content-available-height)-350px))]"
                      )}
                      align="start"
                      side="bottom"
                      sideOffset={8}
                      avoidCollisions
                      collisionPadding={10}
                      sticky="always"
                      data-slot="popover-content"
                    >
                      <div className="flex flex-col h-[350px] max-h-[85vh]">
                        <div className="p-3 border-b bg-muted/30 shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search icons..."
                              className="pl-9 h-9"
                              value={iconSearch}
                              onChange={(e) => setIconSearch(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div 
                          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                          onWheelCapture={(e) => e.stopPropagation()}
                          onTouchMoveCapture={(e) => e.stopPropagation()}
                        >
                          <div className="p-3 grid grid-cols-6 gap-2">
                            {filteredIcons.map((name) => {
                              const Icon = (LucideIcons as any)[name];
                              if (!Icon) return null;
                              return (
                                <Button
                                  key={name}
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 p-0"
                                  onClick={() => {
                                    (editor?.chain().focus() as any).setIcon({ name }).run();
                                    setIconPopoverOpen(false);
                                    setIconSearch("");
                                  }}
                                  title={name}
                                >
                                  <Icon className="h-5 w-5" />
                                </Button>
                              );
                            })}
                            {filteredIcons.length === 0 && (
                              <div className="col-span-6 py-10 text-center text-sm text-muted-foreground">
                                No icons found
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-2 border-t bg-muted/20 text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium shrink-0">
                          Search for 1000+ more icons
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Separator orientation="vertical" className="h-6" />
                </>
              )}
              <ToolbarButton
                active={false}
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                icon={<Eraser className="h-4 w-4" />}
                title="Clear Formatting"
              />
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
        <style dangerouslySetInnerHTML={{
          __html: `
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
            max-width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 0.375rem;
          }
        `}} />
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            multiline && "preserve-spaces"
          )}
        />
      </div>

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
